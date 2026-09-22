import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error caught in handler]:', err);

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum file size allowed is 25MB.' });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  // Custom user-facing message or general 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred. Please try again later.';

  res.status(statusCode).json({
    error: message,
  });
}
