import { ReadStream } from 'fs';

export interface PreviewRenderResult {
  stream: ReadStream;
  mimeType: string;
  sizeBytes: number;
  headers: Record<string, string>;
}

export interface IFilePreviewRenderer {
  canRender(mimeType: string): boolean;
  render(storageName: string, mimeType: string): Promise<PreviewRenderResult>;
  getCSPHeaders(): Record<string, string>;
  isSafeForPreview(mimeType: string): boolean;
}
