import { useState, useEffect, useRef } from 'react'
import { onAuthChange, getAdminSession, signOutAdmin } from '../lib/auth'
import { getGlobalSettings, subscribeAdminAccount } from '../lib/firestore'
import { canWrite, canDelete } from '../lib/permissions'
import type { AdminSession } from '../types'
import PasswordGate from '../components/admin/PasswordGate'
import MenuManager from '../components/admin/MenuManager'
import InventoryManager from '../components/admin/InventoryManager'
import MessageManager from '../components/admin/MessageManager'
import AdminManager from '../components/admin/AdminManager'
import NoticeManager from '../components/admin/NoticeManager'
import OrderManager from '../components/admin/OrderManager'
import GlobalSettingsManager from '../components/admin/GlobalSettingsManager'

type AdminTab = 'menu' | 'inventory' | 'messages' | 'admins' | 'notice' | 'orders' | 'settings'

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(getAdminSession)
  const [tab, setTab] = useState<AdminTab>('menu')
  const [realModeEnabled, setRealModeEnabled] = useState(false)
  const [logoutReason, setLogoutReason] = useState<string | null>(null)
  const hasLoaded = useRef(false)

  useEffect(() => {
    getGlobalSettings().then(s => setRealModeEnabled(s.realModeEnabled ?? false)).catch(() => {})
  }, [])

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      if (!user) setSession(null)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!session) return
    hasLoaded.current = false
    const unsub = subscribeAdminAccount(session.hash, () => {
      if (!hasLoaded.current) {
        hasLoaded.current = true
        return
      }
      signOutAdmin().then(() => {
        setLogoutReason('帳號權限已變更，請重新登入')
        setSession(null)
      })
    })
    return unsub
  }, [session?.hash])

  if (!session) {
    return (
      <div>
        {logoutReason && (
          <div className="mb-4 px-4 py-2 rounded bg-[#3a1e1e] border border-[#6a3030] text-[#ef9a9a] text-sm text-center">
            {logoutReason}
          </div>
        )}
        <PasswordGate onSuccess={(s) => { setLogoutReason(null); setSession(s) }} />
      </div>
    )
  }

  const tabs: { key: AdminTab; label: string; ownerOnly?: boolean }[] = [
    { key: 'menu', label: '菜單管理' },
    { key: 'inventory', label: '食材庫存' },
    { key: 'orders', label: '點餐管理' },
    { key: 'messages', label: '留言管理' },
    { key: 'notice', label: '文字設定' },
    { key: 'settings', label: '系統設定', ownerOnly: true },
    { key: 'admins', label: '帳號管理', ownerOnly: true },
  ]

  const visibleTabs = tabs.filter(t => {
    if (t.ownerOnly) return session.role === 'owner'
    const permTab = t.key as 'menu' | 'inventory' | 'orders' | 'messages' | 'notice'
    return canWrite(session, permTab)
  })

  return (
    <div className="admin-content">
      {/* 後台頂部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-[var(--color-gold-primary)] tracking-widest">⚙ 後台管理</h2>
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-text-muted)] text-xs capitalize">{session.role}: {session.label}</span>
          <button
            onClick={() => signOutAdmin().then(() => setSession(null))}
            className="text-xs text-[#6a3030] hover:text-[#ef9a9a] transition-colors"
          >
            登出
          </button>
        </div>
      </div>

      {/* 分頁頁籤 */}
      <div className="flex gap-1 mb-6">
        {visibleTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${
              tab === key
                ? 'bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] font-semibold shadow-[var(--shadow-glow-warm)]'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'menu' && (
        <MenuManager
          canWrite={canWrite(session, 'menu')}
          canDelete={canDelete(session, 'menu')}
        />
      )}
      {tab === 'inventory' && (
        <InventoryManager
          canWrite={canWrite(session, 'inventory')}
          canDelete={canDelete(session, 'inventory')}
        />
      )}
      {tab === 'orders' && (
        <OrderManager
          session={session}
          realModeEnabled={realModeEnabled}
          canWrite={canWrite(session, 'orders')}
          canDelete={canDelete(session, 'orders')}
        />
      )}
      {tab === 'messages' && (
        <MessageManager canDelete={canDelete(session, 'messages')} />
      )}
      {tab === 'notice' && (
        <NoticeManager canWrite={canWrite(session, 'notice')} />
      )}
      {tab === 'settings' && session.role === 'owner' && <GlobalSettingsManager />}
      {tab === 'admins' && session.role === 'owner' && <AdminManager />}
    </div>
  )
}
