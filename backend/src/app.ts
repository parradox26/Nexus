import 'dotenv/config'
import express from 'express'
import path from 'path'
import { connectorsRouter } from './routes/connectors.routes'
import { contactsRouter } from './routes/contacts.routes'
import { leadsRouter } from './routes/leads.routes'
import { syncRouter } from './routes/sync.routes'
import { authRouter } from './routes/auth.routes'
import { errorMiddleware } from './middleware/error.middleware'
import { getAllConnectors } from './connectors'
import { logger } from './utils/logger'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS for HighLevel Custom JS embedding
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-internal-key')
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use('/api/connectors', connectorsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/sync', syncRouter)
app.use('/api', authRouter)

app.get('/api/health', (_req, res) => {
  const connectors = getAllConnectors().map((c) => ({
    source: c.source,
    name: c.name,
    connected: c.isConnected,
  }))
  res.json({ success: true, data: { status: 'ok', timestamp: new Date(), connectors } })
})

app.use(errorMiddleware)

// Serve built frontend — only active when dist/ exists (production/Railway)
const frontendDist = path.join(__dirname, '../../frontend/dist')
app.use(express.static(frontendDist))
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'))
})

const PORT = parseInt(process.env.PORT ?? '3000', 10)
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`)
})

export default app
