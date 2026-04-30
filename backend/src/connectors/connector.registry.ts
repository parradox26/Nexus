import { BaseConnector } from './base.connector'
import { GoogleConnector } from './google.connector'
import { FacebookConnector } from './facebook.connector'
import { ConnectorSource } from '../schema'

const registry = new Map<ConnectorSource, BaseConnector>()
registry.set('google', new GoogleConnector())
registry.set('facebook', new FacebookConnector())

export function getConnector(source: ConnectorSource): BaseConnector {
  const connector = registry.get(source)
  if (!connector) throw new Error(`Unknown connector source: ${source}`)
  return connector
}

export function getAllConnectors(): BaseConnector[] {
  return Array.from(registry.values())
}

export function isValidSource(source: string): source is ConnectorSource {
  return registry.has(source as ConnectorSource)
}
