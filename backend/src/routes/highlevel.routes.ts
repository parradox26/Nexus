import { Router, Request, Response } from 'express'
import { HighLevelClient } from '../highlevel/highlevel.client'

const router = Router()
const OAUTH_MESSAGE_TYPE = 'nexus:oauth'

function strParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
}

function wantsJson(req: Request): boolean {
  return req.query['format'] === 'json'
}

function popupPayloadHtml(payload: {
  type: string
  source: string
  success: boolean
  locationId?: string
  error?: string
}): string {
  const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c')
  const statusText = payload.success
    ? 'Connected successfully. You can close this window.'
    : 'Authentication failed. You can close this window.'
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
      const isPopup = !!(window.opener && !window.opener.closed);

      if (!isPopup) {
        // Marketplace installation flow — full-page redirect, no opener
        setTimeout(function () {
          if (payload.success && payload.locationId) {
            window.location.href = '/?locationId=' + encodeURIComponent(payload.locationId);
          } else {
            window.location.href = '/';
          }
        }, payload.success ? 800 : 1500);
        return;
      }

      // Manual connect popup flow — postMessage then close
      try { window.opener.postMessage(payload, '*'); } catch (_err) {}
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(payload, '*');
        }
      } catch (_err) {}
      try { localStorage.setItem('nexus:oauth_result', payloadString); } catch (_err) {}

      function attemptClose() { try { window.close(); } catch (_err) {} }
      setTimeout(attemptClose, payload.success ? 150 : 1200);
      setTimeout(attemptClose, payload.success ? 700 : 1900);
    })();
  </script>
</body>
</html>`
}

function respondOAuth(
  req: Request,
  res: Response,
  payload: { type: string; source: string; success: boolean; locationId?: string; error?: string },
  statusCode: number
): void {
  if (wantsJson(req)) {
    if (payload.success) {
      res.status(statusCode).json({
        success: true,
        data: { source: payload.source, connected: true, locationId: payload.locationId },
      })
      return
    }
    res.status(statusCode).json({ success: false, error: payload.error ?? 'Authentication failed' })
    return
  }
  res.status(statusCode).type('html').send(popupPayloadHtml(payload))
}

router.post('/connect', (_req: Request, res: Response): void => {
  try {
    const authUrl = HighLevelClient.getAuthUrl()
    res.json({ success: true, data: { authUrl } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate OAuth URL',
    })
  }
})

router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const error = req.query['error']
  const code = req.query['code']

  if (typeof error === 'string' && error) {
    respondOAuth(
      req,
      res,
      { type: OAUTH_MESSAGE_TYPE, source: 'highlevel', success: false, error },
      400
    )
    return
  }

  if (typeof code !== 'string' || !code) {
    respondOAuth(
      req,
      res,
      { type: OAUTH_MESSAGE_TYPE, source: 'highlevel', success: false, error: 'Missing OAuth code' },
      400
    )
    return
  }

  try {
    const { locationId } = await HighLevelClient.exchangeCode(code)
    respondOAuth(
      req,
      res,
      { type: OAUTH_MESSAGE_TYPE, source: 'highlevel', success: true, locationId },
      200
    )
  } catch (err) {
    respondOAuth(
      req,
      res,
      {
        type: OAUTH_MESSAGE_TYPE,
        source: 'highlevel',
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed',
      },
      500
    )
  }
})

router.get('/locations', async (_req: Request, res: Response): Promise<void> => {
  try {
    const locations = await HighLevelClient.listConnectedLocations()
    res.json({
      success: true,
      data: {
        connected: locations.length > 0,
        locations,
      },
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch HighLevel locations',
    })
  }
})

router.delete('/locations/:locationId', async (req: Request, res: Response): Promise<void> => {
  const locationId = strParam(req.params['locationId'])
  if (!locationId) {
    res.status(400).json({ success: false, error: 'locationId is required' })
    return
  }

  try {
    await HighLevelClient.disconnectLocation(locationId)
    res.json({ success: true, data: { disconnected: true, locationId } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to disconnect HighLevel location',
    })
  }
})

export { router as highlevelRouter }
