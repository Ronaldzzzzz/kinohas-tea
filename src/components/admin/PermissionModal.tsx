import { useState } from 'react'
import { updateAdminPermissions } from '../../lib/firestore'
import type { AdminRecord } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'
import Toast from '../Toast'
import type { StaffPermissions, TabKey } from '../../types'
import { DEFAULT_STAFF_PERMISSIONS } from '../../types'

const TAB_LABELS: Record<TabKey, string> = {
  menu:      '菜品管理',
  inventory: '食材庫存',
  orders:    '點餐管理',
  messages:  '留言管理',
  notice:    '文字設定',
}

const TAB_KEYS: TabKey[] = ['menu', 'inventory', 'orders', 'messages', 'notice']

interface Props {
  admin: AdminRecord
  onClose: () => void
  onSaved: () => void
}

export default function PermissionModal({ admin, onClose, onSaved }: Props) {
  const [perms, setPerms] = useState<StaffPermissions>(
    admin.role === 'staff' ? (admin.permissions ?? DEFAULT_STAFF_PERMISSIONS) : DEFAULT_STAFF_PERMISSIONS
  )
  const [saving, setSaving] = useState(false)
  const { toast, showToast } = useToast()

  function setWrite(tab: TabKey, value: boolean) {
    setPerms(prev => ({
      ...prev,
      [tab]: { write: value, delete: value ? prev[tab].delete : false },
    }))
  }

  function setDelete(tab: TabKey, value: boolean) {
    setPerms(prev => ({
      ...prev,
      [tab]: { write: value ? true : prev[tab].write, delete: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateAdminPermissions(admin.id, perms)
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      showToast('儲存失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1e1a10] border border-[#6a5030] rounded-lg p-5 w-full max-w-sm flex flex-col gap-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-[#c9a55a] font-serif tracking-wide text-base">權限設定</h3>
          <p className="text-[#9a8a70] text-xs mt-0.5">{admin.label}</p>
        </div>

        {admin.role === 'owner' ? (
          <p className="text-[#d4c090] text-sm py-4 text-center border border-[#4a3820] rounded">
            管理員帳號，擁有全部權限
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="grid grid-cols-3 gap-2 pb-2 border-b border-[#4a3820] mb-1">
              <span className="text-[#6a5030] text-xs">功能</span>
              <span className="text-[#6a5030] text-xs text-center">新增/修改</span>
              <span className="text-[#6a5030] text-xs text-center">刪除</span>
            </div>
            {TAB_KEYS.map(tab => (
              <div key={tab} className="grid grid-cols-3 gap-2 items-center py-2 border-b border-[#2a2015]">
                <span className="text-[#d4c090] text-sm">{TAB_LABELS[tab]}</span>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={perms[tab].write}
                    onChange={e => setWrite(tab, e.target.checked)}
                    className="accent-[#c9a55a] w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={perms[tab].delete}
                    onChange={e => setDelete(tab, e.target.checked)}
                    className="accent-[#c9a55a] w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="text-sm text-[#9a8a70] hover:text-[#d4c090] px-4 py-1.5 transition-colors"
          >
            取消
          </button>
          {admin.role !== 'owner' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm bg-[#c9a55a] text-[#1a1510] font-semibold px-5 py-1.5 rounded hover:bg-[#d4af7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '儲存中…' : '儲存'}
            </button>
          )}
        </div>
        <Toast toast={toast} />
      </div>
    </div>
  )
}
