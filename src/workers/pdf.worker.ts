/// <reference lib="webworker" />
import { generateActivityPDF } from '../pdf/pdfGenerator';

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  if (type === 'GENERATE_PDF') {
    try {
      const { state, options } = payload;
      const pdfBlob = await generateActivityPDF(state, options);
      self.postMessage({ id, status: 'success', result: pdfBlob });
    } catch (err) {
      self.postMessage({ id, status: 'error', error: err instanceof Error ? err.message : 'Unknown PDF error' });
    }
  } else {
    self.postMessage({ id, status: 'error', error: `Unknown worker message type: ${type}` });
  }
};
