import { Request, Response, NextFunction } from 'express'

// Simple API key guard for internal routes.
// Replace with JWT validation when user auth is added.
export function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-key']
  const expected = process.env.INTERNAL_API_KEY

  if (!expected) {
    // No key configured — allow in development only
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ success: false, error: 'INTERNAL_API_KEY not configured' })
      return
    }
    next()
    return
  }

  if (key !== expected) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  next()
}
