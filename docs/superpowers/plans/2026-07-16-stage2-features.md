# Stage 2 功能新增 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 惡搞彈窗(進版+可拖動)、後台彈窗管理與 WebP 圖片壓縮上傳、留言遮蔽(黑條+店家註解)。

**Architecture:** 沿用既有結構 — Firestore collection 新增 `popups`,`messages`/replies 加 `masked`/`maskNote` 欄位;後台新增 PopupManager 分頁(掛入 AdminPage tab + TabKey 權限);前台 `PopupLayer` 掛 App 層(admin 路由除外);壓縮為獨立 util。規則檔同步更新並部署。

**Tech Stack:** React 19 + TypeScript、Tailwind CSS 4、Firebase(Firestore/Storage)、Vitest + Testing Library(jsdom)。

## Global Constraints

- 品牌名稱「木葉茗茶坊 Kinoha's Tea」;配色一律用 `var(--color-*)` CSS 變數,禁止硬編 hex(spec: Stage1 已全面 token 化)。
- 進版彈窗每次進站都彈,僅右上角 X 可關;`/admin` 路由不出現任何彈窗(spec: 前台彈窗行為)。
- floating 視窗手機(<640px)同時最多 2 個(spec)。
- 圖片壓縮: WebP、長邊 ≤1200px、品質 0.8 起 >200KB 逐階降至下限 0.5(spec)。
- 遮蔽為純前端呈現,原文保留於文件(使用者已接受此限制)。
- 每個 Task 完成後 `npm run build` 須通過;有測試的 Task 測試須通過(`npm run test`)。
- 規則變更後需 `npm run deploy:rules` 發佈(firebase 已登入)。
- 工作目錄: `/Users/ronald/syncthing/ff14_RP_website/kinohas-tea`。

---

### Task 1: 型別、Firestore API、安全規則

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/auth.ts:27`(ALL_TAB_KEYS)
- Modify: `src/components/admin/PermissionModal.tsx:9-17`(TAB_LABELS/TAB_KEYS)
- Modify: `src/lib/firestore.ts`(新增 popups CRUD 與遮蔽函式)
- Modify: `firestore.rules`
- Modify: `storage.rules`

**Interfaces:**
- Consumes: 既有 `db`(`src/lib/firebase.ts`)、既有 firestore.ts 的 CRUD 模式
- Produces(後續任務依賴,簽名如下):
  - `interface Popup { id: string; type: 'entry' | 'floating'; imageUrl?: string; text?: string; linkUrl?: string; enabled: boolean; order: number; createdAt: Timestamp }`
  - `TabKey` 增加 `'popups'`;`DEFAULT_STAFF_PERMISSIONS.popups = { write: false, delete: false }`
  - `Message`/`Reply` 增加 `masked?: boolean; maskNote?: string`
  - firestore.ts: `getPopups(): Promise<Popup[]>`、`getEnabledPopups(): Promise<Popup[]>`、`addPopup(data: Omit<Popup,'id'|'createdAt'>): Promise<string>`、`updatePopup(id: string, data: Partial<Omit<Popup,'id'>>): Promise<void>`、`deletePopup(id: string): Promise<void>`、`setMessageMask(messageId: string, masked: boolean, maskNote?: string): Promise<void>`、`setReplyMask(messageId: string, replyId: string, masked: boolean, maskNote?: string): Promise<void>`

- [ ] **Step 1: `src/types/index.ts` 修改**

`TabKey` 行改為:
```ts
export type TabKey = 'menu' | 'inventory' | 'orders' | 'messages' | 'notice' | 'popups'
```

`DEFAULT_STAFF_PERMISSIONS` 加一行:
```ts
  popups:    { write: false, delete: false },
```

`Reply` 與 `Message` 介面各加兩個欄位(放在既有欄位之後):
```ts
  masked?: boolean
  maskNote?: string
```

檔案末尾新增:
```ts
// 彈窗(進版廣告 / 可拖動視窗)
export interface Popup {
  id: string
  type: 'entry' | 'floating'
  imageUrl?: string
  text?: string
  linkUrl?: string
  enabled: boolean
  order: number
  createdAt: Timestamp
}
```

- [ ] **Step 2: `src/lib/auth.ts` ALL_TAB_KEYS 加 'popups'**

```ts
const ALL_TAB_KEYS: TabKey[] = ['menu', 'inventory', 'orders', 'messages', 'notice', 'popups']
```

- [ ] **Step 3: `PermissionModal.tsx` 標籤與鍵值**

`TAB_LABELS` 加 `popups: '彈窗管理',`;`TAB_KEYS` 改為:
```ts
const TAB_KEYS: TabKey[] = ['menu', 'inventory', 'orders', 'messages', 'notice', 'popups']
```

- [ ] **Step 4: `src/lib/firestore.ts` 新增函式**

import 區確認含 `Popup` 型別。檔案末尾新增:
```ts
// ─── Popups ─────────────────────────────────────────

export async function getPopups(): Promise<Popup[]> {
  const snap = await getDocs(query(collection(db, 'popups'), orderBy('order')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Popup))
}

export async function getEnabledPopups(): Promise<Popup[]> {
  const all = await getPopups()
  return all.filter(p => p.enabled)
}

export async function addPopup(data: Omit<Popup, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'popups'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function updatePopup(id: string, data: Partial<Omit<Popup, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'popups', id), data)
}

export async function deletePopup(id: string): Promise<void> {
  await deleteDoc(doc(db, 'popups', id))
}

// ─── 留言遮蔽 ─────────────────────────────────────────

export async function setMessageMask(messageId: string, masked: boolean, maskNote?: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), { masked, maskNote: maskNote ?? '' })
}

export async function setReplyMask(messageId: string, replyId: string, masked: boolean, maskNote?: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId, 'replies', replyId), { masked, maskNote: maskNote ?? '' })
}
```
(import 已有 `getDocs/query/collection/orderBy/addDoc/serverTimestamp/updateDoc/doc/deleteDoc` — 若缺,補進既有 import。)

注意: `getMessages()` 讀取時用 spread(`...d.data()`),`masked`/`maskNote` 自動帶出,不需改;若該檔以顯式欄位組裝 Message/Reply,需補上這兩個欄位。

- [ ] **Step 5: `firestore.rules` 修改**

`messages` 的 update 規則改為(允許任何人改 likes/dislikes;登入者可改遮蔽欄位):
```
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['likes', 'dislikes'])
                    || (request.auth != null
                        && request.resource.data.diff(resource.data).affectedKeys()
                           .hasOnly(['masked', 'maskNote']));
```

`replies` 區塊加:
```
        allow update: if request.auth != null
                      && request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['masked', 'maskNote']);
```

檔尾 `settings` 區塊後新增:
```
    // 彈窗：公開可讀，需登入才能寫入
    match /popups/{popupId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
```

- [ ] **Step 6: `storage.rules` 加彈窗圖片路徑**

`promotional-photos` 區塊後新增:
```
    // 彈窗圖片：登入可上傳，公開可讀
    match /popup-images/{filename} {
      allow read: if true;
      allow write: if request.auth != null;
    }
```

- [ ] **Step 7: build 驗證**

```bash
npm run build
```
Expected: 成功。(`StaffPermissions` 是 `Record<TabKey, …>`,若有遺漏 popups 項,tsc 會在 DEFAULT_STAFF_PERMISSIONS 報錯 — 這正是驗證點。)

- [ ] **Step 8: 部署規則**

```bash
npm run deploy:rules
```
Expected: `✔ Deploy complete!`

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/lib/auth.ts src/lib/firestore.ts src/components/admin/PermissionModal.tsx firestore.rules storage.rules
git commit -m "feat: add popups collection, mask fields, and rules for stage 2"
```

---

### Task 2: 圖片壓縮 util(TDD)

**Files:**
- Create: `src/utils/imageCompress.ts`
- Create: `src/utils/imageCompress.test.ts`
- Create: `src/test/setup.ts`(vite.config.ts 已引用但檔案不存在,vitest 跑測試時會炸,先補)

**Interfaces:**
- Consumes: 無
- Produces: `compressImage(file: File, opts?: { maxDimension?: number; targetBytes?: number }): Promise<Blob>`(輸出 WebP);`nextQuality(quality: number): number | null`(品質階梯,exported 供測試)

- [ ] **Step 1: 建立 `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 2: 寫失敗測試 `src/utils/imageCompress.test.ts`**

canvas 在 jsdom 無實作,測試聚焦純邏輯 `nextQuality`:
```ts
import { describe, it, expect } from 'vitest'
import { nextQuality } from './imageCompress'

describe('nextQuality 品質階梯', () => {
  it('從 0.8 逐階遞減 0.1', () => {
    expect(nextQuality(0.8)).toBeCloseTo(0.7)
    expect(nextQuality(0.7)).toBeCloseTo(0.6)
    expect(nextQuality(0.6)).toBeCloseTo(0.5)
  })
  it('低於下限 0.5 回傳 null(停止再壓)', () => {
    expect(nextQuality(0.5)).toBeNull()
    expect(nextQuality(0.45)).toBeNull()
  })
})
```

- [ ] **Step 3: 跑測試確認失敗**

```bash
npm run test
```
Expected: FAIL(imageCompress.ts 不存在)。

- [ ] **Step 4: 實作 `src/utils/imageCompress.ts`**

```ts
const QUALITY_START = 0.8
const QUALITY_FLOOR = 0.5
const QUALITY_STEP = 0.1

/** 品質階梯：回傳下一階品質，低於下限回傳 null */
export function nextQuality(quality: number): number | null {
  const next = Math.round((quality - QUALITY_STEP) * 100) / 100
  return next >= QUALITY_FLOOR ? next : null
}

/**
 * 前端圖片壓縮：等比縮至長邊 maxDimension、轉 WebP，
 * 超過 targetBytes 逐階降品質(至 0.5 為止)。
 */
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; targetBytes?: number } = {},
): Promise<Blob> {
  const { maxDimension = 1200, targetBytes = 200 * 1024 } = opts

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立 canvas context')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality: number | null = QUALITY_START
  let blob = await toWebP(canvas, quality)
  while (blob.size > targetBytes && (quality = nextQuality(quality)) !== null) {
    blob = await toWebP(canvas, quality)
  }
  return blob
}

function toWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('toBlob 失敗'))),
      'image/webp',
      quality,
    )
  })
}
```

- [ ] **Step 5: 跑測試確認通過**

```bash
npm run test
```
Expected: PASS(2 tests)。

- [ ] **Step 6: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 7: Commit**

```bash
git add src/utils/imageCompress.ts src/utils/imageCompress.test.ts src/test/setup.ts
git commit -m "feat: add WebP image compression util with quality ladder"
```

---

### Task 3: 後台彈窗管理分頁

**Files:**
- Create: `src/components/admin/PopupManager.tsx`
- Modify: `src/pages/AdminPage.tsx`

**Interfaces:**
- Consumes: Task 1 的 `Popup` 型別與 `getPopups/addPopup/updatePopup/deletePopup`;Task 2 的 `compressImage`;既有 storage 上傳模式(參照 `PhotoManager.tsx:40-42`: `ref(storage, path)` + `uploadBytes` + `getDownloadURL`)
- Produces: `PopupManager({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean })` default export

- [ ] **Step 1: 建立 `src/components/admin/PopupManager.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { getPopups, addPopup, updatePopup, deletePopup } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'
import type { Popup } from '../../types'

interface Props {
  canWrite: boolean
  canDelete: boolean
}

const TYPE_LABELS: Record<Popup['type'], string> = {
  entry: '進版彈窗',
  floating: '拖動視窗',
}

export default function PopupManager({ canWrite, canDelete }: Props) {
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 新增表單狀態
  const [type, setType] = useState<Popup['type']>('entry')
  const [text, setText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function load() {
    try {
      setPopups(await getPopups())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!file && !text.trim()) {
      setError('至少需要圖片或文字內容')
      return
    }
    setSaving(true)
    setError('')
    try {
      let imageUrl: string | undefined
      if (file) {
        const blob = await compressImage(file)
        const storageRef = ref(storage, `popup-images/${Date.now()}.webp`)
        await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
        imageUrl = await getDownloadURL(storageRef)
      }
      await addPopup({
        type,
        ...(imageUrl ? { imageUrl } : {}),
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(linkUrl.trim() ? { linkUrl: linkUrl.trim() } : {}),
        enabled: true,
        order: popups.length,
      })
      setText(''); setLinkUrl(''); setFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(p: Popup) {
    await updatePopup(p.id, { enabled: !p.enabled })
    await load()
  }

  async function handleDelete(id: string) {
    await deletePopup(id)
    await load()
  }

  if (loading) return <p className="text-[var(--color-text-muted)] text-sm">載入中…</p>

  return (
    <div className="flex flex-col gap-6">
      {canWrite && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-4 flex flex-col gap-3">
          <h3 className="font-serif text-[var(--color-gold-primary)]">新增彈窗</h3>
          <div className="flex gap-3 flex-wrap items-center">
            <select value={type} onChange={e => setType(e.target.value as Popup['type'])}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
              <option value="entry">進版彈窗</option>
              <option value="floating">拖動視窗</option>
            </select>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-[var(--color-text-muted)]" />
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="文字內容(拖動視窗用；選填)"
            rows={2}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]" />
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="點擊連結(選填)"
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]" />
          <button onClick={handleAdd} disabled={saving}
            className="self-start bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] text-sm font-semibold px-6 py-1.5 rounded hover:bg-[var(--color-gold-light)] disabled:opacity-50 transition-colors">
            {saving ? '上傳中…' : '新增'}
          </button>
          {error && <p className="text-[var(--color-danger-text)] text-sm">{error}</p>}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {popups.length === 0 && <p className="text-[var(--color-text-muted)] text-sm">尚無彈窗</p>}
        {popups.map(p => (
          <li key={p.id} className="flex items-center gap-4 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-3">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]">{TYPE_LABELS[p.type]}</span>
              {p.text && <p className="text-sm text-[var(--color-text-primary)] truncate mt-1">{p.text}</p>}
              {p.linkUrl && <p className="text-xs text-[var(--color-text-muted)] truncate">{p.linkUrl}</p>}
            </div>
            {canWrite && (
              <button onClick={() => handleToggle(p)}
                className={`text-sm px-3 py-1 rounded-md font-medium transition-colors ${p.enabled ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]' : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]'}`}>
                {p.enabled ? '啟用中' : '已停用'}
              </button>
            )}
            {canDelete && (
              <button onClick={() => handleDelete(p.id)}
                className="text-xs text-[var(--color-danger-border)] hover:text-[var(--color-danger-text)] p-1">✕</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: `AdminPage.tsx` 掛分頁**

- import 區加 `import PopupManager from '../components/admin/PopupManager'`
- `type AdminTab` union 加 `| 'popups'`
- `tabs` 陣列 `notice` 之後插入 `{ key: 'popups', label: '彈窗管理' },`
- `visibleTabs` 的 filter 內 `permTab` 型別斷言處,把 `'popups'` 加進 union(或改為 `t.key as TabKey`)
- 渲染區加:
```tsx
      {tab === 'popups' && (
        <PopupManager
          canWrite={canWrite(session, 'popups')}
          canDelete={canDelete(session, 'popups')}
        />
      )}
```

注意: 既有登入 session 存於 sessionStorage,沒有 popups 權限鍵 → `canWrite` 回 false,分頁自動隱藏;owner 重新登入即取得(OWNER_PERMISSIONS 由 ALL_TAB_KEYS 生成)。此行為可接受,不需遷移。

- [ ] **Step 3: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/PopupManager.tsx src/pages/AdminPage.tsx
git commit -m "feat: add popup manager admin tab with compressed image upload"
```

---

### Task 4: 前台 PopupLayer(進版彈窗+可拖動視窗)

**Files:**
- Create: `src/components/popups/EntryPopup.tsx`
- Create: `src/components/popups/FloatingWindow.tsx`
- Create: `src/components/popups/PopupLayer.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1 的 `getEnabledPopups`、`Popup`
- Produces: `PopupLayer()` default export(自行抓資料,無 props)

- [ ] **Step 1: `src/components/popups/EntryPopup.tsx`**

```tsx
import type { Popup } from '../../types'

interface Props {
  popup: Popup
  onClose: () => void
}

/** Shopee 式進版彈窗：遮罩不可點關，僅右上角小 X 可關 */
export default function EntryPopup({ popup, onClose }: Props) {
  const inner = (
    <>
      {popup.imageUrl && (
        <img src={popup.imageUrl} alt="活動彈窗" className="max-w-[85vw] max-h-[70vh] sm:max-w-md rounded shadow-2xl" draggable={false} />
      )}
      {popup.text && (
        <p className="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] text-sm p-4 rounded max-w-[85vw] sm:max-w-md text-center">{popup.text}</p>
      )}
    </>
  )
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60">
      <div className="relative animate-bounce-in">
        <button
          onClick={onClose}
          aria-label="關閉彈窗"
          className="absolute -top-2 -right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] text-xs shadow hover:text-[var(--color-text-primary)]"
        >
          ✕
        </button>
        {popup.linkUrl ? (
          <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer">{inner}</a>
        ) : inner}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `src/components/popups/FloatingWindow.tsx`**

```tsx
import { useRef, useState } from 'react'
import type { Popup } from '../../types'

interface Props {
  popup: Popup
  initial: { x: number; y: number }
  zIndex: number
  onFocus: () => void
  onClose: () => void
}

/** zutomayo 式可拖動視窗：標題列拖曳(pointer events)，點擊置頂 */
export default function FloatingWindow({ popup, initial, zIndex, onFocus, onClose }: Props) {
  const [pos, setPos] = useState(initial)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    onFocus()
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.current.dx)),
      y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - drag.current.dy)),
    })
  }
  function onPointerUp() { drag.current = null }

  return (
    <div
      style={{ left: pos.x, top: pos.y, zIndex }}
      className="fixed w-56 sm:w-64 rounded shadow-2xl overflow-hidden border border-[var(--color-border-gold)] bg-[var(--color-bg-card)]"
      onPointerDown={onFocus}
    >
      {/* 標題列 */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-between px-2 py-1 bg-[var(--color-deep-green)] text-[var(--color-on-deep)] cursor-move touch-none select-none"
      >
        <span className="text-xs tracking-wider">📢 木葉茗茶坊</span>
        <button onClick={onClose} aria-label="關閉視窗" className="text-xs px-1 hover:opacity-70">✕</button>
      </div>
      {popup.imageUrl && <img src={popup.imageUrl} alt="" className="w-full" draggable={false} />}
      {popup.text && <p className="p-3 text-xs text-[var(--color-text-primary)] leading-relaxed">{popup.text}</p>}
    </div>
  )
}
```

- [ ] **Step 3: `src/components/popups/PopupLayer.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getEnabledPopups } from '../../lib/firestore'
import type { Popup } from '../../types'
import EntryPopup from './EntryPopup'
import FloatingWindow from './FloatingWindow'

/** 隨機位置：避開畫面中央(30%-70%)區域，不擋 Hero 主文案 */
function randomPos(): { x: number; y: number } {
  const w = window.innerWidth
  const h = window.innerHeight
  const x = Math.random() < 0.5 ? Math.random() * w * 0.25 : w * 0.65 + Math.random() * w * 0.2
  const y = h * 0.1 + Math.random() * h * 0.7
  return { x: Math.max(8, x), y: Math.max(8, y) }
}

export default function PopupLayer() {
  const { pathname } = useLocation()
  const [popups, setPopups] = useState<Popup[]>([])
  const [entryOpen, setEntryOpen] = useState(true)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [zOrder, setZOrder] = useState<string[]>([])

  useEffect(() => {
    getEnabledPopups().then(setPopups).catch(() => {})
  }, [])

  const entry = useMemo(() => {
    const candidates = popups.filter(p => p.type === 'entry')
    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }, [popups])

  const floats = useMemo(() => {
    const all = popups.filter(p => p.type === 'floating')
    const limit = window.innerWidth < 640 ? 2 : all.length
    return all.slice(0, limit).map(p => ({ popup: p, initial: randomPos() }))
  }, [popups])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      {entry && entryOpen && <EntryPopup popup={entry} onClose={() => setEntryOpen(false)} />}
      {floats.filter(f => !closed.has(f.popup.id)).map(f => (
        <FloatingWindow
          key={f.popup.id}
          popup={f.popup}
          initial={f.initial}
          zIndex={50 + zOrder.indexOf(f.popup.id) + 1}
          onFocus={() => setZOrder(o => [...o.filter(id => id !== f.popup.id), f.popup.id])}
          onClose={() => setClosed(s => new Set(s).add(f.popup.id))}
        />
      ))}
    </>
  )
}
```

- [ ] **Step 4: `App.tsx` 掛 PopupLayer**

import 加 `import PopupLayer from './components/popups/PopupLayer'`,`<Footer />` 之後、wrapper `</div>` 之前加 `<PopupLayer />`(PopupLayer 內部已依 pathname 排除 admin)。

- [ ] **Step 5: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 6: Commit**

```bash
git add src/components/popups src/App.tsx
git commit -m "feat: add entry popup and draggable floating windows"
```

---

### Task 5: 留言遮蔽 — 前台呈現(TDD)

**Files:**
- Create: `src/components/guestbook/MaskedContent.tsx`
- Create: `src/components/guestbook/MaskedContent.test.tsx`
- Modify: `src/components/guestbook/MessageCard.tsx`
- Modify: `src/components/guestbook/ReplyList.tsx`

**Interfaces:**
- Consumes: Task 1 的 `Message.masked/maskNote`、`Reply.masked/maskNote`
- Produces: `MaskedContent({ content, maskNote }: { content: string; maskNote?: string })` default export — 黑條化內文+標籤+店家註

- [ ] **Step 1: 寫失敗測試 `src/components/guestbook/MaskedContent.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MaskedContent from './MaskedContent'

describe('MaskedContent', () => {
  it('顯示遮蔽標籤且原文以黑條呈現', () => {
    render(<MaskedContent content="祕密內容" />)
    expect(screen.getByText(/此留言已被店家遮蔽/)).toBeInTheDocument()
    const masked = screen.getByText('祕密內容')
    expect(masked).toHaveClass('select-none')
  })
  it('有店家註時顯示註解', () => {
    render(<MaskedContent content="x" maskNote="含劇透" />)
    expect(screen.getByText(/店家註[:：]\s*含劇透/)).toBeInTheDocument()
  })
  it('無店家註時不顯示註解列', () => {
    render(<MaskedContent content="x" />)
    expect(screen.queryByText(/店家註/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
npm run test
```
Expected: FAIL(MaskedContent 不存在)。

- [ ] **Step 3: 實作 `src/components/guestbook/MaskedContent.tsx`**

```tsx
interface Props {
  content: string
  maskNote?: string
}

/** 遮蔽呈現：黑條化原文(保留長度)+標籤+店家註解 */
export default function MaskedContent({ content, maskNote }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--color-text-muted)] tracking-wider">▓ 此留言已被店家遮蔽</span>
      <p aria-hidden="true" className="text-sm sm:text-base leading-relaxed bg-black text-black select-none rounded-sm w-fit max-w-full break-all">
        {content}
      </p>
      {maskNote && (
        <span className="text-xs text-[var(--color-gold-primary)]">店家註: {maskNote}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
npm run test
```
Expected: PASS(MaskedContent 3 tests + Task 2 的 2 tests)。

- [ ] **Step 5: `MessageCard.tsx` 接上**

內容段(`{/* 內容 */}` 的 `<p …>{message.content}</p>`)改為:
```tsx
      {message.masked ? (
        <MaskedContent content={message.content} maskNote={message.maskNote} />
      ) : (
        <p className="text-[var(--color-text-primary)] text-sm sm:text-base leading-relaxed content-text">{message.content}</p>
      )}
```
並 import `MaskedContent`。

- [ ] **Step 6: `ReplyList.tsx` 接上**

找到回覆內文渲染處(顯示 `reply.content` 的元素),同樣模式改為 masked 判斷 + `MaskedContent`(import 同上)。

- [ ] **Step 7: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 8: Commit**

```bash
git add src/components/guestbook
git commit -m "feat: render masked messages with black bars and shop notes"
```

---

### Task 6: 留言遮蔽 — 後台操作

**Files:**
- Modify: `src/components/admin/MessageManager.tsx`

**Interfaces:**
- Consumes: Task 1 的 `setMessageMask`/`setReplyMask`;既有 MessageManager 的留言列表結構(先讀整個檔案再改)
- Produces: 無新 export

- [ ] **Step 1: 讀 `src/components/admin/MessageManager.tsx` 全文,理解列表渲染與刪除按鈕位置**

- [ ] **Step 2: 每則留言加「遮蔽/解除」控制**

在既有刪除按鈕旁加(樣式對齊現有按鈕;`msg` 為該則 Message 變數名,依實際命名調整):
```tsx
<button
  onClick={async () => {
    if (msg.masked) {
      await setMessageMask(msg.id, false)
    } else {
      const note = window.prompt('店家註解(選填,直接確定可留空):') ?? ''
      await setMessageMask(msg.id, true, note.trim())
    }
    await reload()  // 依檔內既有的重新載入函式名稱調整
  }}
  className="text-xs px-2 py-0.5 rounded border border-[var(--color-border-gold)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
>
  {msg.masked ? '解除遮蔽' : '遮蔽'}
</button>
```
已遮蔽的留言在後台列表顯示 `▓ 已遮蔽` 標記與現有 maskNote(小字)。回覆若在此檔渲染,同樣加遮蔽鈕(用 `setReplyMask`);若回覆不在後台列表中呈現,略過回覆後台控制並在報告註明。

import 加 `setMessageMask`(與用到的 `setReplyMask`)。

**注意**: `window.prompt` 是本任務允許的簡易輸入方式(惡搞網站基調,先求功能;Stage 3 優化再改 modal)。

- [ ] **Step 3: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/MessageManager.tsx
git commit -m "feat: add mask/unmask controls with notes to message manager"
```

---

### Task 7: 走查驗收與上線

**Files:**
- Modify: `docs/superpowers/specs/2026-07-16-stage2-features-design.md`(驗收註記)

**Interfaces:**
- Consumes: Task 1-6 全部產出
- Produces: 驗收紀錄與上線(push 觸發 GitHub Actions)

- [ ] **Step 1: 啟動開發環境**

```bash
npm run dev
```
(模擬器+Vite 一鍵;管理員密碼 admin123。)

- [ ] **Step 2: 後台走查**

`http://localhost:5173/#/admin`(port 被占時看終端輸出) 登入:
- 彈窗管理分頁可見(owner);建立 entry 彈窗(上傳一張 >500KB 的圖),確認上傳後 Storage 內為 .webp 且 <200KB(模擬器 UI http://localhost:4000 查看)
- 建立 floating 彈窗(圖+文字);開關、刪除正常
- 留言管理: 對一則留言遮蔽+填註解,列表顯示已遮蔽;解除正常

- [ ] **Step 3: 前台走查**

- 進站必彈 entry 彈窗;點遮罩不關、Esc 不關、僅 X 可關
- floating 視窗隨機位置出現,可拖曳、點擊置頂、可關閉;重整重新出現
- 瀏覽器縮到 <640px 寬重整: floating 最多 2 個
- `/#/admin` 無任何彈窗
- 留言板: 被遮蔽留言顯示黑條+「▓ 此留言已被店家遮蔽」+店家註;按讚照常

- [ ] **Step 4: 全測試+build**

```bash
npm run test && npm run build
```
Expected: 全 PASS + build 成功。

- [ ] **Step 5: 發現問題則修復後回到 Step 1;全過後在 spec 驗收章節末補一行**

```markdown

Stage 2 走查於 2026-07-16 完成,三項功能(彈窗/壓縮上傳/留言遮蔽)驗收通過。
```

- [ ] **Step 6: Commit + push 上線**

```bash
git add docs/superpowers/specs/2026-07-16-stage2-features-design.md
git commit -m "docs: mark stage 2 acceptance complete"
git push origin main
```
push 後 GitHub Actions 自動部署;完成後於正式站抽查 entry 彈窗與留言遮蔽。
