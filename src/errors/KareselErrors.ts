/**
 * Base custom error class for the KARESEL application.
 * All user-facing errors should inherit from this.
 */
export class KareselError extends Error {
  public isUserFriendly: boolean;
  
  constructor(message: string, isUserFriendly = true) {
    super(message);
    this.name = this.constructor.name;
    this.isUserFriendly = isUserFriendly;
  }
}

/**
 * Thrown when file uploads are invalid (size, type, corrupt data).
 */
export class FileValidationError extends KareselError {
  constructor(message: string = 'Lütfen geçerli ve desteklenen bir görsel dosyası seçin.') {
    super(message);
  }
}

/**
 * Thrown when the image fails to be processed into pixels.
 */
export class ImageProcessingError extends KareselError {
  constructor(message: string = 'Görsel işlenirken bir hata oluştu. Lütfen başka bir görsel deneyin.') {
    super(message);
  }
}

/**
 * Thrown when the Web Worker crashes or fails to respond.
 */
export class WorkerCrashError extends KareselError {
  constructor(message: string = 'Tarayıcınızın belleği yetersiz kalmış olabilir. Lütfen sayfayı yenileyin veya zorluğu düşürün.') {
    super(message);
  }
}

/**
 * Thrown when jsPDF fails to generate a PDF document.
 */
export class PDFGenerationError extends KareselError {
  constructor(message: string = 'PDF oluşturulurken bellekte bir sorun oluştu. Lütfen sayfayı yenileyip tekrar deneyin.') {
    super(message);
  }
}
