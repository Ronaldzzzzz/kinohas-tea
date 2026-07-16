import type { AdminSession, TabKey } from '../types'

export function canWrite(session: AdminSession, tab: TabKey): boolean {
  if (session.role === 'owner') return true
  return session.permissions[tab]?.write ?? false
}

export function canDelete(session: AdminSession, tab: TabKey): boolean {
  if (session.role === 'owner') return true
  return session.permissions[tab]?.delete ?? false
}
