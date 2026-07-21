import { useState, useEffect, useRef } from 'react'
import { onAuthChange, getAdminSession, signOutAdmin } from '../lib/auth'
import { getGlobalSettings, subscribeMenuItems, subscribeAdminAccount } from '../lib/firestore'
import { canWrite, canDelete } from '../lib/permissions'
import type { AdminSession, MenuItem } from '../types'
import PasswordGate from '../components/admin/PasswordGate'
import MenuManager from '../components/admin/MenuManager'
import InventoryManager from '../components/admin/InventoryManager'
import MessageManager from '../components/admin/MessageManager'
import AdminManager from '../components/admin/AdminManager'
import NoticeManager from '../components/admin/NoticeManager'
import OrderManager from '../components/admin/OrderManager'
import GlobalSettingsManager from '../components/admin/GlobalSettingsManager'
import PopupManager from '../components/admin/PopupManager'
import PageContentManager from '../components/admin/PageContentManager'

type AdminTab = 'menu' | 'inventory' | 'messages' | 'admins' | 'notice' | 'orders' | 'settings' | 'popups' | 'pages'

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(getAdminSession)
  const [tab, setTab] = useState<AdminTab>('menu')
  const [realModeEnabled, setRealModeEnabled] = useState(false)
  const [logoutReason, setLogoutReason] = useState<string | null>(null)
  const [stockPreview, setStockPreview] = useState<MenuItem[]>([])
  const hasLoaded = useRef(false)

  useEffect(() => {
    getGlobalSettings().then(s => setRealModeEnabled(s.realModeEnabled ?? false)).catch(() => {})
  }, [])

  // 菜品庫存快速預覽：即時訂閱，任何人改動庫存都會立刻反映在此
  useEffect(() => {
    if (!session) return
    return subscribeMenuItems(items => setStockPreview(items.filter(i => !i.unlimited)))
  }, [session])

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
          <div className="mb-4 px-4 py-2 rounded bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] text-sm text-center">
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
    { key: 'popups', label: '彈窗管理' },
    { key: 'settings', label: '系統設定', ownerOnly: true },
    { key: 'admins', label: '帳號管理', ownerOnly: true },
    { key: 'pages', label: '頁面內容' },
  ]

  const visibleTabs = tabs.filter(t => {
    if (t.ownerOnly) return session.role === 'owner'
    const permTab = t.key as 'menu' | 'inventory' | 'orders' | 'messages' | 'notice' | 'popups' | 'pages'
    return canWrite(session, permTab)
  })

  return (
    <div className="admin-content">
      {/* 後台頂部 */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="font-serif text-[var(--color-gold-primary)] tracking-widest whitespace-nowrap">⚙ 後台管理</h2>
        {/* 菜品庫存快速預覽 */}
        {stockPreview.length > 0 && (
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1">
            {stockPreview.map(item => {
              const stock = item.stock ?? 0
              return (
                <span
                  key={item.id}
                  title={`${item.name} 庫存 ${stock}`}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-full pl-2 pr-1 py-0.5"
                >
                  <span className="text-[var(--color-text-muted)] max-w-24 truncate">{item.alias || item.name}</span>
                  <span className={`font-semibold px-1.5 rounded-full ${
                    stock > 0
                      ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
                      : 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
                  }`}>
                    {stock}
                  </span>
                </span>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[var(--color-text-muted)] text-xs capitalize">{session.role}: {session.label}</span>
          <button
            onClick={() => signOutAdmin().then(() => setSession(null))}
            className="text-xs text-[var(--color-danger-border)] hover:text-[var(--color-danger-text)] transition-colors"
          >
            登出
          </button>
        </div>
      </div>

      {/* 分頁頁籤 */}
      <div className="flex flex-wrap gap-1 mb-6">
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
      {tab === 'popups' && (
        <PopupManager
          canWrite={canWrite(session, 'popups')}
          canDelete={canDelete(session, 'popups')}
        />
      )}
      {tab === 'pages' && (
        <PageContentManager canWrite={canWrite(session, 'pages')} />
      )}
      {tab === 'settings' && session.role === 'owner' && <GlobalSettingsManager />}
      {tab === 'admins' && session.role === 'owner' && <AdminManager />}
    </div>
  )
}
