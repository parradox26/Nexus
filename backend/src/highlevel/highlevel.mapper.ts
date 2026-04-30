import { UnifiedContact } from '../schema'
import { HLContact } from './highlevel.client'

export function toHLBody(contact: UnifiedContact): Record<string, unknown> {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    tags: contact.tags,
    source: contact.source,
    customField: {
      connector_source_id: contact.sourceId,
      connector_source: contact.source,
    },
  }
}

export function fromHLContact(raw: HLContact): Partial<UnifiedContact> {
  return {
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    phone: raw.phone,
    tags: raw.tags,
  }
}
