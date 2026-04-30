import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', err)
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ success: false, error: message })
}
