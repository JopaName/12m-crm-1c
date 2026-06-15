export interface ValidationResult {
  valid: boolean;
  mimeType: string;
  error?: string;
  statusCode?: number;
}

export interface IFileValidator {
  validateExtension(fileName: string): ValidationResult;
  validateMagicBytes(filePath: string, declaredMime: string): ValidationResult;
  validateSize(fileSize: number): ValidationResult;
  validateQuota(entityType: string, entityId: string): Promise<ValidationResult>;
  validateChain(filePath: string, fileName: string, declaredMime: string, fileSize: number, entityType: string, entityId: string): Promise<ValidationResult>;
  isUnsafePreview(mimeType: string): boolean;
}
