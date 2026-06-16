import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { FileService } from '../services/FileService';
import { config } from '../config';
import { getContentDisposition } from '../utils/fileUtils';
import { logError } from '../utils/logger';
import { execFile } from 'child_process';

const router = Router();
const fileService = new FileService();

const tempStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  },
});

const upload = multer({
  storage: tempStorage,
  limits: { fileSize: config.upload.maxSize },
});

router.post('/upload/:entityType/:entityId/:fieldName', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  let tempPath: string | null = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    tempPath = req.file.path;
    const result = await fileService.upload(
      tempPath, req.file.originalname, req.file.mimetype, req.file.size,
      req.params.entityType, req.params.entityId, req.params.fieldName, req.user!.id,
    );
    tempPath = null;
    res.status(201).json(result);
  } catch (e: any) {
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch { }
    }
    logError('File upload error', {
      source: 'fileRoutes.upload',
      metadata: { entityType: req.params.entityType, entityId: req.params.entityId, fieldName: req.params.fieldName, error: e.message },
    });
    res.status(e.statusCode || 500).json({ error: e.message || 'Upload failed' });
  }
});

router.get('/download/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Fallback: if ID is a procurement request ID, look up by entityId
    let effectiveId = req.params.id;
    const { prisma } = require('../db');
    const fileByEntity = await prisma.file.findFirst({ where: { entityType: 'procurement', entityId: req.params.id } });
    if (fileByEntity) {
      effectiveId = fileByEntity.id;
    }

    const rangeHeader = req.headers.range;
    let start: number | undefined;
    let end: number | undefined;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : undefined;
    }

    let stream: fs.ReadStream;
    let fileSize: number;

    if (start !== undefined) {
      const meta = await fileService.getMeta(effectiveId, req.user!.id, req.user!.roleName);
      fileSize = meta.sizeBytes;
      if (isNaN(start)) return res.status(400).json({ error: 'Invalid range' });
      if (start >= fileSize) return res.status(416).json({ error: 'Range not satisfiable' });
      const finalEnd = end !== undefined ? end : fileSize - 1;
      stream = fileService.getStorage().createReadStream(meta.storageName, start, finalEnd);
      res.status(206);
      res.setHeader('Content-Range', 'bytes ' + start + '-' + finalEnd + '/' + fileSize);
      res.setHeader('Content-Length', finalEnd - start + 1);
    } else {
      const result = await fileService.download(effectiveId, req.user!.id, req.user!.roleName);
      stream = result.stream;
      fileSize = result.fileSize;
      res.setHeader('Content-Type', result.record.mimeType);
      res.setHeader('Content-Disposition', getContentDisposition(result.record.mimeType, result.record.originalName));
      res.setHeader('Content-Length', fileSize);
    }

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    let aborted = false;
    req.on('close', () => { aborted = true; stream.destroy(); });

    stream.on('error', (err: Error) => {
      if (aborted) return;
      logError('Stream error during download', { source: 'fileRoutes.download', metadata: { recordId: req.params.id, error: err.message } });
      if (!res.headersSent) res.status(500).json({ error: 'Stream error during download' });
    });

    const timeoutId = setTimeout(() => {
      if (!aborted) { stream.destroy(); if (!res.headersSent) res.status(504).json({ error: 'Download timeout' }); }
    }, 30000);

    stream.on('end', () => clearTimeout(timeoutId));
    stream.pipe(res);
  } catch (e: any) {
    logError('File download error', { source: 'fileRoutes.download', metadata: { recordId: req.params.id, error: e.message } });
    if (!res.headersSent) res.status(e.statusCode || 500).json({ error: e.message || 'Download failed' });
  }
});

router.get('/preview/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fileService.preview(req.params.id, req.user!.id, req.user!.roleName);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', result.disposition + '; filename=preview');
    res.setHeader('Content-Length', result.sizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; frame-ancestors 'none'; sandbox");
    res.setHeader('X-Frame-Options', 'DENY');

    let aborted = false;
    req.on('close', () => { aborted = true; result.stream.destroy(); });

    result.stream.on('error', (err: Error) => {
      if (aborted) return;
      logError('Stream error during preview', { source: 'fileRoutes.preview', metadata: { recordId: req.params.id, error: err.message } });
      if (!res.headersSent) res.status(500).json({ error: 'Preview failed' });
    });

    const timeoutId = setTimeout(() => {
      if (!aborted) { result.stream.destroy(); if (!res.headersSent) res.status(504).json({ error: 'Preview timeout' }); }
    }, 30000);

    result.stream.on('end', () => clearTimeout(timeoutId));
    result.stream.pipe(res);
  } catch (e: any) {
    logError('File preview error', { source: 'fileRoutes.preview', metadata: { recordId: req.params.id, error: e.message } });
    if (!res.headersSent) res.status(e.statusCode || 500).json({ error: e.message || 'Preview failed' });
  }
});

router.put('/:id', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  let tempPath: string | null = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    tempPath = req.file.path;
    const result = await fileService.replace(req.params.id, tempPath, req.file.originalname, req.file.mimetype, req.file.size, req.user!.id, req.user!.roleName);
    tempPath = null;
    res.json(result);
  } catch (e: any) {
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch { }
    }
    logError('File replace error', { source: 'fileRoutes.replace', metadata: { recordId: req.params.id, error: e.message } });
    res.status(e.statusCode || 500).json({ error: e.message || 'Replace failed' });
  }
});

router.get('/:id/meta', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const meta = await fileService.getMeta(req.params.id, req.user!.id, req.user!.roleName);
    res.json(meta);
  } catch (e: any) {
    logError('File meta error', { source: 'fileRoutes.meta', metadata: { recordId: req.params.id, error: e.message } });
    res.status(e.statusCode || 500).json({ error: e.message || 'Failed to get file metadata' });
  }
});

router.get('/:entityType/:entityId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const fieldName = req.query.field as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || undefined;
    const includeDeleted = req.query.includeDeleted === 'true';
    const result = await fileService.list(req.params.entityType, req.params.entityId, fieldName, { page, pageSize, includeDeleted });
    res.json(result);
  } catch (e: any) {
    logError('File list error', { source: 'fileRoutes.list', metadata: { entityType: req.params.entityType, entityId: req.params.entityId, error: e.message } });
    res.status(500).json({ error: e.message || 'Failed to list files' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await fileService.softDelete(req.params.id, req.user!.id, req.user!.roleName);
    res.json({ success: true });
  } catch (e: any) {
    logError('File delete error', { source: 'fileRoutes.delete', metadata: { recordId: req.params.id, error: e.message } });
    res.status(e.statusCode || 500).json({ error: e.message || 'Delete failed' });
  }
});

router.post('/execute', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, stdin } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code field is required' });
    }
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const child = execFile(pythonCmd, ['-c', code], {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    let stdout = '';
    let stderr = '';
    if (stdin) {
      child.stdin?.write(stdin);
      child.stdin?.end();
    }
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });
    child.on('close', (exitCode) => {
      res.json({ exitCode, stdout, stderr });
    });
    child.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (e: any) {
    logError('Python execute error', { source: 'fileRoutes.execute', metadata: { error: e.message } });
    res.status(500).json({ error: e.message || 'Execution failed' });
  }
});

router.post('/cleanup/expired', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== 'Director') return res.status(403).json({ error: 'Only Director can run cleanup' });
    const count = await fileService.cleanupExpiredDeletedFiles();
    res.json({ deletedCount: count });
  } catch (e: any) {
    logError('File cleanup expired error', { source: 'fileRoutes.cleanupExpired', metadata: { error: e.message } });
    res.status(500).json({ error: e.message || 'Cleanup failed' });
  }
});

router.post('/cleanup/orphaned', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== 'Director') return res.status(403).json({ error: 'Only Director can run cleanup' });
    const result = await fileService.cleanupOrphanedFiles();
    res.json(result);
  } catch (e: any) {
    logError('File cleanup error', { source: 'fileRoutes.cleanup', metadata: { error: e.message } });
    res.status(500).json({ error: e.message || 'Cleanup failed' });
  }
});

export default router;
