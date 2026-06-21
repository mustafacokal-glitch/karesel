import PipelineWorker from './pipeline.worker?worker';
import PdfWorker from './pdf.worker?worker';
import { WorkerCrashError } from '../errors/KareselErrors';

export type WorkerPriority = 'HIGH' | 'NORMAL' | 'LOW';
export type TaskType = 'RUN_AI_PIPELINE' | 'RUN_CLASSIC_PIPELINE' | 'GENERATE_PDF';

export interface PoolTask {
  id: number;
  type: TaskType;
  priority: WorkerPriority;
  payload: any;
  transferables?: Transferable[];
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutMs: number;
  addedAt: number;
}

interface WorkerWrapper {
  id: string;
  instance: Worker;
  type: 'PIPELINE' | 'PDF';
  isBusy: boolean;
  currentTaskId: number | null;
  timeoutHandle: number | NodeJS.Timeout | null;
  idleTimerHandle: number | NodeJS.Timeout | null;
}

export class WorkerPool {
  private pipelineWorkers: WorkerWrapper[] = [];
  private pdfWorker: WorkerWrapper | null = null;
  private queue: PoolTask[] = [];
  private maxPipelineWorkers: number;
  private messageIdCounter = 0;
  private IDLE_TERMINATE_MS = 30000; // Auto-terminate after 30s of idle

  constructor() {
    // Leave 1 core for the main thread, max 4 pipeline workers to prevent OS starvation
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    this.maxPipelineWorkers = Math.min(Math.max(2, cores - 1), 4);
  }

  private getPriorityWeight(p: WorkerPriority): number {
    if (p === 'HIGH') return 3;
    if (p === 'NORMAL') return 2;
    return 1;
  }

  public enqueue(type: TaskType, priority: WorkerPriority, payload: any, transferables: Transferable[] = [], timeoutMs = 45000): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: PoolTask = {
        id: ++this.messageIdCounter,
        type,
        priority,
        payload,
        transferables,
        resolve,
        reject,
        timeoutMs,
        addedAt: Date.now()
      };
      
      this.queue.push(task);
      this.queue.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
      
      this.processQueue();
    });
  }

  private createWorker(type: 'PIPELINE' | 'PDF'): WorkerWrapper {
    const instance = type === 'PIPELINE' ? new PipelineWorker() : new PdfWorker();
    const wrapper: WorkerWrapper = {
      id: `${type}_${Math.random().toString(36).substring(2, 9)}`,
      instance,
      type,
      isBusy: false,
      currentTaskId: null,
      timeoutHandle: null,
      idleTimerHandle: null
    };

    instance.onmessage = (e) => this.handleMessage(wrapper, e);
    instance.onerror = (err) => this.handleError(wrapper, err);
    instance.onmessageerror = (err) => this.handleError(wrapper, err);

    return wrapper;
  }

  private resetIdleTimer(worker: WorkerWrapper) {
    if (worker.idleTimerHandle) clearTimeout(worker.idleTimerHandle as any);
    worker.idleTimerHandle = setTimeout(() => {
      if (!worker.isBusy) {
        worker.instance.terminate();
        if (worker.type === 'PIPELINE') {
          this.pipelineWorkers = this.pipelineWorkers.filter(w => w.id !== worker.id);
        } else {
          this.pdfWorker = null;
        }
      }
    }, this.IDLE_TERMINATE_MS);
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    // Find PDF tasks if any, and process them if PDF worker is free
    const pdfTaskIndex = this.queue.findIndex(t => t.type === 'GENERATE_PDF');
    if (pdfTaskIndex !== -1) {
      if (!this.pdfWorker) {
        this.pdfWorker = this.createWorker('PDF');
      }
      if (!this.pdfWorker.isBusy) {
        const task = this.queue.splice(pdfTaskIndex, 1)[0];
        this.assignTask(this.pdfWorker, task);
      }
    }

    // Process Pipeline tasks
    const pipelineTaskIndex = this.queue.findIndex(t => t.type === 'RUN_AI_PIPELINE' || t.type === 'RUN_CLASSIC_PIPELINE');
    if (pipelineTaskIndex !== -1) {
      // Find idle pipeline worker
      let worker = this.pipelineWorkers.find(w => !w.isBusy);
      
      // If no idle worker, spawn new one if under limit
      if (!worker && this.pipelineWorkers.length < this.maxPipelineWorkers) {
        worker = this.createWorker('PIPELINE');
        this.pipelineWorkers.push(worker);
      }

      if (worker) {
        const task = this.queue.splice(pipelineTaskIndex, 1)[0];
        this.assignTask(worker, task);
      }
    }
  }

  private assignTask(worker: WorkerWrapper, task: PoolTask) {
    worker.isBusy = true;
    worker.currentTaskId = task.id;
    if (worker.idleTimerHandle) {
      clearTimeout(worker.idleTimerHandle as any);
      worker.idleTimerHandle = null;
    }

    // Assign execution timeout to catch frozen workers
    worker.timeoutHandle = setTimeout(() => {
      console.warn(`[WorkerPool] Task ${task.id} timed out. Terminating worker ${worker.id}.`);
      task.reject(new Error('Task timed out'));
      this.recreateWorker(worker);
    }, task.timeoutMs);

    // Track active task inside the wrapper to resolve it later
    (worker as any)._activeTask = task;

    worker.instance.postMessage({
      id: task.id,
      type: task.type,
      payload: task.payload
    }, task.transferables || []);
  }

  private handleMessage(worker: WorkerWrapper, e: MessageEvent) {
    const { id, status, result, error } = e.data;
    const task = (worker as any)._activeTask as PoolTask | undefined;

    if (task && task.id === id) {
      if (worker.timeoutHandle) clearTimeout(worker.timeoutHandle as any);
      worker.isBusy = false;
      worker.currentTaskId = null;
      (worker as any)._activeTask = undefined;

      if (status === 'success') {
        task.resolve(result);
      } else {
        task.reject(new Error(error || 'Worker execution failed'));
      }

      this.resetIdleTimer(worker);
      this.processQueue(); // Process next in queue
    }
  }

  private handleError(worker: WorkerWrapper, _err: Event | string) {
    console.error(`[WorkerPool] Worker ${worker.id} crashed.`);
    const task = (worker as any)._activeTask as PoolTask | undefined;
    if (task) {
      task.reject(new WorkerCrashError());
    }
    this.recreateWorker(worker);
  }

  private recreateWorker(worker: WorkerWrapper) {
    worker.instance.terminate();
    if (worker.type === 'PIPELINE') {
      this.pipelineWorkers = this.pipelineWorkers.filter(w => w.id !== worker.id);
    } else {
      this.pdfWorker = null;
    }
    this.processQueue();
  }

  public getMetrics() {
    return {
      activePipelineWorkers: this.pipelineWorkers.length,
      busyPipelineWorkers: this.pipelineWorkers.filter(w => w.isBusy).length,
      isPdfWorkerActive: !!this.pdfWorker,
      isPdfWorkerBusy: this.pdfWorker?.isBusy || false,
      queueLength: this.queue.length
    };
  }
}

// Singleton export
export const workerPool = new WorkerPool();
