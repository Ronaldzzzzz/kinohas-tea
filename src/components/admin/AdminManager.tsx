// src/components/admin/AdminManager.tsx
import { useEffect, useState } from 'react'
import { getAdmins, addAdmin, deleteAdmin } from '../../lib/firestore'
import type { AdminRecord } from '../../lib/firestore'
import { hashPassword } from '../../lib/auth'
import { useToast } from '../../hooks/useToast'
import Toast from '../Toast'
import PermissionModal from './PermissionModal'

export default function AdminManager() {
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState<AdminRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newRole, setNewRole] = useState<'owner' | 'staff'>('staff')
  const [saving, setSaving] = useState(false)
  const { toast, showToast } = useToast()

  async function load() {
    setLoading(true)
    const data = await getAdmins()
    setAdmins(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || !newLabel) return
    setSaving(true)
    try {
      const hash = await hashPassword(newPassword)
      await addAdmin(hash, newRole, newLabel)
      setNewPassword('')
      setNewLabel('')
      setNewRole('staff')
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAdmin(hash: string) {
    if (admins.length <= 1) {
      showToast('至少必須保留一個管理員帳號！', 'error')
      return
    }
    if (!confirm('確定要刪除此管理員帳號？刪除後對應的密碼將失效。')) return
    await deleteAdmin(hash)
    await load()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 新增帳號表單 */}
      <form onSubmit={handleAddAdmin} className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">＋ 新增管理員</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="設定登入密碼 *"
            required
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)]"
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="管理員標籤 (例如：主廚/外場) *"
            required
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)]"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
            <input
              type="radio"
              checked={newRole === 'staff'}
              onChange={() => setNewRole('staff')}
              className="accent-[var(--color-gold-primary)]"
            />
            Staff (一般權限)
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
            <input
              type="radio"
              checked={newRole === 'owner'}
              onChange={() => setNewRole('owner')}
              className="accent-[var(--color-gold-primary)]"
            />
            Owner (最高權限)
          </label>
          <button
            type="submit"
            disabled={saving || !newPassword || !newLabel}
            className="ml-auto bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] text-xs font-semibold px-5 py-1.5 rounded hover:bg-[var(--color-gold-light)] disabled:opacity-50 transition-colors"
          >
            {saving ? '儲存中…' : '新增'}
          </button>
        </div>
      </form>

      {/* 帳號列表 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded overflow-hidden">
        <table className="w-full text-left text-sm text-[var(--color-text-primary)]">
          <thead className="bg-[var(--color-bg-primary)] text-[var(--color-gold-primary)] text-xs uppercase tracking-wider border-b border-[var(--color-border-primary)]">
            <tr>
              <th className="px-4 py-2">標籤</th>
              <th className="px-4 py-2">權限等級</th>
              <th className="px-4 py-2">密碼雜湊 (SHA-256)</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-primary)]">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-muted)]">載入中…</td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-muted)]">尚無帳號資料</td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr
                  key={admin.id}
                  onClick={() => setSelectedAdmin(admin)}
                  className="hover:bg-[var(--color-bg-card-hover)] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">{admin.label}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      admin.role === 'owner' ? 'bg-[var(--color-gold-primary)]/20 text-[var(--color-gold-primary)]' : 'bg-[var(--color-border-gold)]/20 text-[var(--color-text-muted)]'
                    }`}>
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[var(--color-text-muted)] truncate max-w-[150px]" title={admin.id}>
                    {admin.id}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAdmin(admin.id) }}
                      className="text-xs text-[#6a3030] hover:text-[#ef9a9a] transition-colors"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {selectedAdmin && (
        <PermissionModal
          admin={selectedAdmin}
          onClose={() => setSelectedAdmin(null)}
          onSaved={load}
        />
      )}
      <Toast toast={toast} />
    </div>
  )
}
