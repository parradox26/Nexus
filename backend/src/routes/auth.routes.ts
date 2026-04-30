import { Router, Request, Response } from 'express'
import { getConnector, isValidSource } from '../connectors'

const router = Router()
const OAUTH_MESSAGE_TYPE = 'nexus:oauth'

function strParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
}

function wantsJson(req: Request): boolean {
  return req.query['format'] === 'json'
}

function popupPayloadHtml(payload: { type: string; source: string; success: boolean; error?: string }): string {
  const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c')
  const statusText = payload.success ? 'Connected successfully. You can close this window.' : 'Authentication failed. You can close this window.'
  const tone = payload.success ? '#3B6D11' : '#A32D2D'
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nexus OAuth</title>
  <style>
    body { font-family: Inter, -apple-system, Segoe UI, sans-serif; background: #F5F4FF; color: #1A1A2E; margin: 0; display: grid; place-items: center; min-height: 100vh; }
    .card { background: #fff; border: 0.5px solid #E0DEF7; border-radius: 12px; padding: 20px; max-width: 360px; text-align: center; }
    .msg { margin: 0; font-size: 14px; font-weight: 500; color: ${tone}; }
    .sub { margin: 8px 0 0; font-size: 12px; color: #6F7190; }
  </style>
</head>
<body>
  <div class="card">
    <p class="msg">${statusText}</p>
    <p class="sub">This window will close automatically.</p>
  </div>
  <script>
    (function () {
      const payload = ${safePayload};
      const payloadString = JSON.stringify(payload);
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, '*');
        }
      } catch (_err) {}
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(payload, '*');
        }
      } catch (_err) {}
      try {
        localStorage.setItem('nexus:oauth_result', payloadString);
      } catch (_err) {}

      function attemptClose() {
        try { window.close(); } catch (_err) {}
        if (!window.closed) {
          try { window.open('', '_self'); } catch (_err) {}
          try { window.close(); } catch (_err) {}
        }
      }

      setTimeout(attemptClose, payload.success ? 150 : 1200);
      setTimeout(attemptClose, payload.success ? 700 : 1900);
    })();
  </script>
</body>
</html>`
}

function respondOAuth(req: Request, res: Response, payload: { type: string; source: string; success: boolean; error?: string }, statusCode: number): void {
  if (wantsJson(req)) {
    if (payload.success) {
      res.status(statusCode).json({ success: true, data: { source: payload.source, connected: true } })
      return
    }
    res.status(statusCode).json({ success: false, error: payload.error ?? 'Authentication failed' })
    return
  }
  res.status(statusCode).type('html').send(popupPayloadHtml(payload))
}

router.get('/connectors/:source/callback', async (req: Request, res: Response): Promise<void> => {
  const source = strParam(req.params['source'])
  const code = req.query['code']

  if (!isValidSource(source)) {
    respondOAuth(req, res, { type: OAUTH_MESSAGE_TYPE, source, success: false, error: `Unknown connector: ${source}` }, 400)
    return
  }

  if (typeof code !== 'string' || !code) {
    respondOAuth(req, res, { type: OAUTH_MESSAGE_TYPE, source, success: false, error: 'Missing OAuth code' }, 400)
    return
  }

  try {
    const connector = getConnector(source)
    await connector.authenticate(code)
    respondOAuth(req, res, { type: OAUTH_MESSAGE_TYPE, source, success: true }, 200)
  } catch (err) {
    respondOAuth(
      req,
      res,
      {
        type: OAUTH_MESSAGE_TYPE,
        source,
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed',
      },
      500
    )
  }
})

export { router as authRouter }
