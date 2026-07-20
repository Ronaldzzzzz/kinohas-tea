# 本店歷史 + 交通指引頁面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增兩個前台頁面「本店歷史」「交通指引」，內容(照片/文字/地圖)後台可編輯、版面固定，並在導覽列 首頁↔留言板 之間加入連結。

**Architecture:** 資料存在既有 `settings` collection 的兩份新文件(`settings/story`、`settings/directions`)，沿用 `getGlobalSettings`/`updateGlobalSettings` 的一次性讀取 + mapping-with-defaults 模式。後台新增一個「頁面內容」tab，內含兩個獨立表單元件。前台新增兩個純展示頁面，路由 `/story`、`/directions`。

**Tech Stack:** React + TypeScript + Vite + Firebase(Firestore/Storage) + Tailwind + Vitest

## Global Constraints

- 資料存 `settings/story`、`settings/directions`，不新增 collection、不改 `firestore.rules`
- 版面格式寫死在程式碼：本店歷史固定 3 個 section(標題+文字+選填圖，僅 section 1 圖片必填)；交通指引固定 標題+地圖圖片(選填)+文字+唯讀顯示現有地址
- 兩頁前台皆一次性讀取，不用 `onSnapshot`
- 圖片上傳沿用 `compressImage` + Firebase Storage + PopupManager 的「換圖成功才刪舊檔」模式
- Firestore instance 已設定 `ignoreUndefinedProperties: true`(`src/lib/firebase.ts`)，`setDoc` 時物件裡的 `undefined` 欄位會被自動忽略，不用手動 `deleteField()` 或條件式展開
- 後台「頁面內容」tab 只需要 `canWrite`，不需要 `canDelete`(比照 `NoticeManager`)
- Navbar 連結順序：首頁 → 本店歷史 → 交通指引 → 留言板
- 遵循現有元件的 Tailwind class 慣例與繁中註解風格，不引入新的 UI 套件

---

### Task 1: 資料層 — types + firestore.ts + mapping 函式測試

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/firestore.ts`
- Test: `src/lib/pageContent.test.ts`

**Interfaces:**
- Produces:
  - `StorySection { title: string; text: string; imageUrl?: string }`
  - `StoryContent { sections: [StorySection, StorySection, StorySection] }`
  - `DirectionsContent { title: string; text: string; mapImageUrl?: string }`
  - `TabKey` 新增 `'pages'`
  - `mapStoryData(data: Record<string, unknown> | undefined): StoryContent`
  - `mapDirectionsData(data: Record<string, unknown> | undefined): DirectionsContent`
  - `getStoryContent(): Promise<StoryContent>`
  - `updateStoryContent(data: StoryContent): Promise<void>`
  - `getDirectionsContent(): Promise<DirectionsContent>`
  - `updateDirectionsContent(data: DirectionsContent): Promise<void>`

- [ ] **Step 1: 修改 `src/types/index.ts` — 新增 TabKey 值與權限預設值**

找到現有這段(約第 78-96 行)：

```ts
export type TabKey = 'menu' | 'inventory' | 'orders' | 'messages' | 'notice' | 'popups'

export interface TabPermission {
  write: boolean
  delete: boolean
}

export type StaffPermissions = Record<TabKey, TabPermission>

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  menu:      { write: true,  delete: true  },
  inventory: { write: true,  delete: true  },
  orders:    { write: true,  delete: true  },
  messages:  { write: true,  delete: true  },
  notice:    { write: false, delete: false },
  popups:    { write: false, delete: false },
}
```

改成：

```ts
export type TabKey = 'menu' | 'inventory' | 'orders' | 'messages' | 'notice' | 'popups' | 'pages'

export interface TabPermission {
  write: boolean
  delete: boolean
}

export type StaffPermissions = Record<TabKey, TabPermission>

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  menu:      { write: true,  delete: true  },
  inventory: { write: true,  delete: true  },
  orders:    { write: true,  delete: true  },
  messages:  { write: true,  delete: true  },
  notice:    { write: false, delete: false },
  popups:    { write: false, delete: false },
  pages:     { write: false, delete: false },
}
```

- [ ] **Step 2: 在 `src/types/index.ts` 檔案末尾新增內容型別**

在檔案最後(`Popup` interface 結尾之後)加上：

```ts

// 頁面內容：本店歷史
export interface StorySection {
  title: string
  text: string
  imageUrl?: string   // section[0] 由後台表單強制必填，型別上仍設 optional
}

export interface StoryContent {
  sections: [StorySection, StorySection, StorySection]
}

// 頁面內容：交通指引
export interface DirectionsContent {
  title: string
  text: string
  mapImageUrl?: string   // 遊戲內地圖截圖
}
```

- [ ] **Step 3: 寫失敗測試 `src/lib/pageContent.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mapStoryData, mapDirectionsData } from './firestore'

describe('mapStoryData', () => {
  it('無資料時回傳 3 個空白 section', () => {
    const result = mapStoryData(undefined)
    expect(result.sections).toHaveLength(3)
    result.sections.forEach(s => {
      expect(s.title).toBe('')
      expect(s.text).toBe('')
      expect(s.imageUrl).toBeUndefined()
    })
  })

  it('補齊不足 3 筆的 sections', () => {
    const result = mapStoryData({ sections: [{ title: 'A', text: 'a', imageUrl: 'url-a' }] })
    expect(result.sections).toHaveLength(3)
    expect(result.sections[0]).toEqual({ title: 'A', text: 'a', imageUrl: 'url-a' })
    expect(result.sections[1]).toEqual({ title: '', text: '', imageUrl: undefined })
  })

  it('保留完整 3 筆資料', () => {
    const raw = {
      sections: [
        { title: '創業', text: '一段故事', imageUrl: 'url-1' },
        { title: '轉型', text: '第二段', imageUrl: 'url-2' },
        { title: '現在', text: '第三段' },
      ],
    }
    const result = mapStoryData(raw)
    expect(result.sections[2]).toEqual({ title: '現在', text: '第三段', imageUrl: undefined })
  })
})

describe('mapDirectionsData', () => {
  it('無資料時回傳空白預設值', () => {
    expect(mapDirectionsData(undefined)).toEqual({ title: '', text: '', mapImageUrl: undefined })
  })

  it('保留既有資料', () => {
    const result = mapDirectionsData({ title: '怎麼來', text: '搭傳送', mapImageUrl: 'map-url' })
    expect(result).toEqual({ title: '怎麼來', text: '搭傳送', mapImageUrl: 'map-url' })
  })
})
```

- [ ] **Step 4: 執行測試確認失敗**

Run: `npx vitest run src/lib/pageContent.test.ts`
Expected: FAIL — `mapStoryData`/`mapDirectionsData` 尚未從 `./firestore` export

- [ ] **Step 5: 在 `src/lib/firestore.ts` 加入資料層函式**

在檔案匯入區塊，確認 `GlobalSettings` 那行已經 import `StoryContent`、`DirectionsContent`、`StorySection`(找到現有這行並修改)：

```ts
import type { MenuItem, InventoryItem, Message, Reply, NoticeConfig, Order, GlobalSettings, PhotoUrl, StaffPermissions, Popup, StoryContent, StorySection, DirectionsContent } from '../types'
```

在檔案末尾(`setReplyMask` 函式之後)新增：

```ts

// ─── 頁面內容：本店歷史 / 交通指引 ─────────────────────────────

const EMPTY_STORY_SECTION: StorySection = { title: '', text: '', imageUrl: undefined }

export function mapStoryData(data: Record<string, unknown> | undefined): StoryContent {
  const rawSections = (data?.sections ?? []) as Partial<StorySection>[]
  const sections = [0, 1, 2].map(i => ({
    title: rawSections[i]?.title ?? EMPTY_STORY_SECTION.title,
    text: rawSections[i]?.text ?? EMPTY_STORY_SECTION.text,
    imageUrl: rawSections[i]?.imageUrl,
  })) as [StorySection, StorySection, StorySection]
  return { sections }
}

export async function getStoryContent(): Promise<StoryContent> {
  const docSnap = await getDoc(doc(db, 'settings', 'story'))
  return mapStoryData(docSnap.exists() ? docSnap.data() : undefined)
}

export async function updateStoryContent(data: StoryContent): Promise<void> {
  await setDoc(doc(db, 'settings', 'story'), data)
}

export function mapDirectionsData(data: Record<string, unknown> | undefined): DirectionsContent {
  return {
    title: (data?.title as string) ?? '',
    text: (data?.text as string) ?? '',
    mapImageUrl: data?.mapImageUrl as string | undefined,
  }
}

export async function getDirectionsContent(): Promise<DirectionsContent> {
  const docSnap = await getDoc(doc(db, 'settings', 'directions'))
  return mapDirectionsData(docSnap.exists() ? docSnap.data() : undefined)
}

export async function updateDirectionsContent(data: DirectionsContent): Promise<void> {
  await setDoc(doc(db, 'settings', 'directions'), data)
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `npx vitest run src/lib/pageContent.test.ts`
Expected: PASS，5 個測試全過

- [ ] **Step 7: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤輸出

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/firestore.ts src/lib/pageContent.test.ts
git commit -m "$(cat <<'EOF'
新增本店歷史/交通指引的資料層(types + firestore 讀寫 + mapping 測試)

為兩個新前台頁面準備 settings/story、settings/directions 文件的讀寫函式，
沿用 getGlobalSettings 的 mapping-with-defaults 模式，先補齊資料層與測試。
EOF
)"
```

---

### Task 2: 後台表單 — 本店歷史 (`StoryContentForm.tsx`)

**Files:**
- Create: `src/components/admin/StoryContentForm.tsx`

**Interfaces:**
- Consumes: `getStoryContent`, `updateStoryContent`（Task 1）、`compressImage(file: File): Promise<Blob>`（`src/utils/imageCompress.ts`）、`storage`（`src/lib/firebase.ts`）、`StoryContent`/`StorySection`（`src/types`）
- Produces: `export default function StoryContentForm({ canWrite }: { canWrite: boolean })` — 給 Task 3 的 `PageContentManager` 使用

- [ ] **Step 1: 建立 `src/components/admin/StoryContentForm.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { getStoryContent, updateStoryContent } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'
import type { StorySection } from '../../types'

interface Props {
  canWrite: boolean
}

interface SectionForm {
  title: string
  text: string
  file: File | null
  imageUrl?: string
}

const SECTION_LABELS = ['段落 1（照片必填）', '段落 2（照片選填）', '段落 3（照片選填）']

function toSectionForm(s: StorySection): SectionForm {
  return { title: s.title, text: s.text, file: null, imageUrl: s.imageUrl }
}

export default function StoryContentForm({ canWrite }: Props) {
  const [sections, setSections] = useState<SectionForm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getStoryContent()
      .then(content => setSections(content.sections.map(toSectionForm)))
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  function updateSection(idx: number, patch: Partial<SectionForm>) {
    setSections(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  async function handleSave() {
    if (!sections[0]?.file && !sections[0]?.imageUrl) {
      setError('段落 1 的照片為必填')
      return
    }
    setSaving(true)
    setError('')
    try {
      const uploaded = await Promise.all(
        sections.map(async (s, i) => {
          let imageUrl = s.imageUrl
          if (s.file) {
            const blob = await compressImage(s.file)
            const storageRef = ref(storage, `story-images/${Date.now()}-${i}.webp`)
            await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
            const newUrl = await getDownloadURL(storageRef)
            // 換圖成功後才清舊檔，避免上傳失敗時舊圖也被清掉
            if (s.imageUrl) {
              try {
                await deleteObject(ref(storage, s.imageUrl))
              } catch {
                /* 檔案可能已不存在，忽略 */
              }
            }
            imageUrl = newUrl
          }
          return { title: s.title.trim(), text: s.text.trim(), imageUrl }
        })
      )
      await updateStoryContent({ sections: uploaded as [StorySection, StorySection, StorySection] })
      setSections(uploaded.map(s => ({ ...s, file: null })))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-[var(--color-text-muted)] text-sm py-4">載入中…</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, idx) => (
        <div key={idx} className="border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3">
          <h4 className="text-[var(--color-gold-primary)] text-xs font-semibold tracking-wide">{SECTION_LABELS[idx]}</h4>

          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--color-text-muted)] text-xs">標題</label>
            <input
              type="text"
              value={section.title}
              onChange={e => updateSection(idx, { title: e.target.value })}
              readOnly={!canWrite}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--color-text-muted)] text-xs">文字內容</label>
            <textarea
              value={section.text}
              onChange={e => updateSection(idx, { text: e.target.value })}
              readOnly={!canWrite}
              rows={4}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            {section.imageUrl && !section.file && (
              <img src={section.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />
            )}
            {canWrite && (
              <label className="cursor-pointer bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] text-sm px-4 py-1.5 rounded hover:border-[var(--color-gold-primary)] transition-colors max-w-52 truncate inline-block">
                {section.file ? `已選擇: ${section.file.name}` : section.imageUrl ? '更換照片' : '上傳照片'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => updateSection(idx, { file: e.target.files?.[0] ?? null })}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      ))}

      {canWrite && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-1.5 text-sm rounded border transition-colors
                       border-[var(--color-gold-primary)] text-[var(--color-gold-primary)]
                       hover:bg-[var(--color-gold-primary)] hover:text-[var(--color-bg-primary)]
                       disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {saving ? '儲存中…' : '儲存本店歷史'}
          </button>
          {saved && <span className="text-green-400 text-xs">✓ 已儲存</span>}
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤輸出

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/StoryContentForm.tsx
git commit -m "$(cat <<'EOF'
新增後台「本店歷史」編輯表單

三段落各自標題/文字/照片，段落1照片為必填，其餘選填；圖片上傳沿用
PopupManager 的壓縮+換圖成功才刪舊檔模式。
EOF
)"
```

---

### Task 3: 後台表單 — 交通指引 (`DirectionsContentForm.tsx`) + 容器 (`PageContentManager.tsx`)

**Files:**
- Create: `src/components/admin/DirectionsContentForm.tsx`
- Create: `src/components/admin/PageContentManager.tsx`

**Interfaces:**
- Consumes: `getDirectionsContent`, `updateDirectionsContent`, `getGlobalSettings`（Task 1 / 既有）、`compressImage`、`storage`、`DirectionsContent`（`src/types`）、`StoryContentForm`（Task 2）
- Produces: `export default function DirectionsContentForm({ canWrite }: { canWrite: boolean })`；`export default function PageContentManager({ canWrite }: { canWrite: boolean })` — 給 Task 4 的 `AdminPage` 使用

- [ ] **Step 1: 建立 `src/components/admin/DirectionsContentForm.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { getDirectionsContent, updateDirectionsContent, getGlobalSettings } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'

interface Props {
  canWrite: boolean
}

interface DirectionsForm {
  title: string
  text: string
  file: File | null
  mapImageUrl?: string
}

export default function DirectionsContentForm({ canWrite }: Props) {
  const [form, setForm] = useState<DirectionsForm>({ title: '', text: '', file: null, mapImageUrl: undefined })
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getDirectionsContent(), getGlobalSettings()])
      .then(([content, settings]) => {
        setForm({ title: content.title, text: content.text, file: null, mapImageUrl: content.mapImageUrl })
        setAddress(settings.address ?? '')
      })
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      let mapImageUrl = form.mapImageUrl
      if (form.file) {
        const blob = await compressImage(form.file)
        const storageRef = ref(storage, `directions-images/${Date.now()}.webp`)
        await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
        const newUrl = await getDownloadURL(storageRef)
        // 換圖成功後才清舊檔，避免上傳失敗時舊圖也被清掉
        if (form.mapImageUrl) {
          try {
            await deleteObject(ref(storage, form.mapImageUrl))
          } catch {
            /* 檔案可能已不存在，忽略 */
          }
        }
        mapImageUrl = newUrl
      }
      await updateDirectionsContent({ title: form.title.trim(), text: form.text.trim(), mapImageUrl })
      setForm(f => ({ ...f, file: null, mapImageUrl }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-[var(--color-text-muted)] text-sm py-4">載入中…</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs">標題</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            readOnly={!canWrite}
            placeholder="例：怎麼找到我們"
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                       placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs">說明文字</label>
          <textarea
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            readOnly={!canWrite}
            rows={5}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                       focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          {form.mapImageUrl && !form.file && (
            <img src={form.mapImageUrl} alt="" className="w-16 h-16 object-cover rounded" />
          )}
          {canWrite && (
            <label className="cursor-pointer bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] text-sm px-4 py-1.5 rounded hover:border-[var(--color-gold-primary)] transition-colors max-w-52 truncate inline-block">
              {form.file ? `已選擇: ${form.file.name}` : form.mapImageUrl ? '更換地圖圖片' : '上傳地圖圖片'}
              <input
                type="file"
                accept="image/*"
                onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                className="hidden"
              />
            </label>
          )}
        </div>

        <p className="text-[var(--color-text-muted)] text-[11px]">
          目前地址：{address || '（未設定）'} — 地址請至「系統設定」調整，此頁僅顯示唯讀值。
        </p>
      </div>

      {canWrite && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-1.5 text-sm rounded border transition-colors
                       border-[var(--color-gold-primary)] text-[var(--color-gold-primary)]
                       hover:bg-[var(--color-gold-primary)] hover:text-[var(--color-bg-primary)]
                       disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {saving ? '儲存中…' : '儲存交通指引'}
          </button>
          {saved && <span className="text-green-400 text-xs">✓ 已儲存</span>}
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 建立 `src/components/admin/PageContentManager.tsx`**

```tsx
import StoryContentForm from './StoryContentForm'
import DirectionsContentForm from './DirectionsContentForm'

interface Props {
  canWrite: boolean
}

export default function PageContentManager({ canWrite }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-5 flex flex-col gap-5">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">本店歷史</h3>
        <StoryContentForm canWrite={canWrite} />
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-5 flex flex-col gap-5">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">交通指引</h3>
        <DirectionsContentForm canWrite={canWrite} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤輸出

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/DirectionsContentForm.tsx src/components/admin/PageContentManager.tsx
git commit -m "$(cat <<'EOF'
新增後台「交通指引」編輯表單與頁面內容容器

地圖圖片+標題+說明文字可編輯，並唯讀顯示現有系統設定的地址供對照；
PageContentManager 把本店歷史/交通指引兩個表單組裝成一個後台區塊。
EOF
)"
```

---

### Task 4: 後台外殼 — 權限清單 + AdminPage 掛載新 tab

**Files:**
- Modify: `src/components/admin/PermissionModal.tsx`
- Modify: `src/pages/AdminPage.tsx`

**Interfaces:**
- Consumes: `PageContentManager`（Task 3）、`TabKey`（Task 1，已含 `'pages'`）

- [ ] **Step 1: 修改 `src/components/admin/PermissionModal.tsx`**

找到：

```ts
const TAB_LABELS: Record<TabKey, string> = {
  menu:      '菜品管理',
  inventory: '食材庫存',
  orders:    '點餐管理',
  messages:  '留言管理',
  notice:    '文字設定',
  popups:    '彈窗管理',
}

const TAB_KEYS: TabKey[] = ['menu', 'inventory', 'orders', 'messages', 'notice', 'popups']
```

改成：

```ts
const TAB_LABELS: Record<TabKey, string> = {
  menu:      '菜品管理',
  inventory: '食材庫存',
  orders:    '點餐管理',
  messages:  '留言管理',
  notice:    '文字設定',
  popups:    '彈窗管理',
  pages:     '頁面內容',
}

const TAB_KEYS: TabKey[] = ['menu', 'inventory', 'orders', 'messages', 'notice', 'popups', 'pages']
```

- [ ] **Step 2: 修改 `src/pages/AdminPage.tsx` — import 與 tab 型別**

找到檔案開頭 import 區塊：

```tsx
import PopupManager from '../components/admin/PopupManager'

type AdminTab = 'menu' | 'inventory' | 'messages' | 'admins' | 'notice' | 'orders' | 'settings' | 'popups'
```

改成：

```tsx
import PopupManager from '../components/admin/PopupManager'
import PageContentManager from '../components/admin/PageContentManager'

type AdminTab = 'menu' | 'inventory' | 'messages' | 'admins' | 'notice' | 'orders' | 'settings' | 'popups' | 'pages'
```

- [ ] **Step 3: 修改 tabs 陣列與權限過濾**

找到：

```tsx
  const tabs: { key: AdminTab; label: string; ownerOnly?: boolean }[] = [
    { key: 'menu', label: '菜單管理' },
    { key: 'inventory', label: '食材庫存' },
    { key: 'orders', label: '點餐管理' },
    { key: 'messages', label: '留言管理' },
    { key: 'notice', label: '文字設定' },
    { key: 'popups', label: '彈窗管理' },
    { key: 'settings', label: '系統設定', ownerOnly: true },
    { key: 'admins', label: '帳號管理', ownerOnly: true },
  ]

  const visibleTabs = tabs.filter(t => {
    if (t.ownerOnly) return session.role === 'owner'
    const permTab = t.key as 'menu' | 'inventory' | 'orders' | 'messages' | 'notice' | 'popups'
    return canWrite(session, permTab)
  })
```

改成：

```tsx
  const tabs: { key: AdminTab; label: string; ownerOnly?: boolean }[] = [
    { key: 'menu', label: '菜單管理' },
    { key: 'inventory', label: '食材庫存' },
    { key: 'orders', label: '點餐管理' },
    { key: 'messages', label: '留言管理' },
    { key: 'notice', label: '文字設定' },
    { key: 'popups', label: '彈窗管理' },
    { key: 'pages', label: '頁面內容' },
    { key: 'settings', label: '系統設定', ownerOnly: true },
    { key: 'admins', label: '帳號管理', ownerOnly: true },
  ]

  const visibleTabs = tabs.filter(t => {
    if (t.ownerOnly) return session.role === 'owner'
    const permTab = t.key as 'menu' | 'inventory' | 'orders' | 'messages' | 'notice' | 'popups' | 'pages'
    return canWrite(session, permTab)
  })
```

- [ ] **Step 4: 分頁頁籤列改成可換行 + 掛載新 tab 內容**

找到：

```tsx
      {/* 分頁頁籤 */}
      <div className="flex gap-1 mb-6">
```

改成：

```tsx
      {/* 分頁頁籤 */}
      <div className="flex flex-wrap gap-1 mb-6">
```

找到：

```tsx
      {tab === 'popups' && (
        <PopupManager
          canWrite={canWrite(session, 'popups')}
          canDelete={canDelete(session, 'popups')}
        />
      )}
      {tab === 'settings' && session.role === 'owner' && <GlobalSettingsManager />}
```

改成：

```tsx
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
```

- [ ] **Step 5: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤輸出

- [ ] **Step 6: 手動驗證**

Run: `npm run dev:web`，登入後台(owner 帳號)，確認：
- 分頁頁籤列出現「頁面內容」，tab 過多時會自動換行
- 點進去可看到「本店歷史」「交通指引」兩個區塊，各自能編輯、上傳圖片、儲存並看到「✓ 已儲存」

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/PermissionModal.tsx src/pages/AdminPage.tsx
git commit -m "$(cat <<'EOF'
後台掛載「頁面內容」tab，員工權限清單同步新增

AdminPage 新增 pages tab 渲染 PageContentManager；PermissionModal 讓
owner 可以個別授權員工是否能編輯本店歷史/交通指引內容；tab 列改用
flex-wrap 避免 tab 數量增加後橫向擠爆。
EOF
)"
```

---

### Task 5: 前台頁面 — StoryPage / DirectionsPage + 路由 + 導覽列連結

**Files:**
- Create: `src/pages/StoryPage.tsx`
- Create: `src/pages/DirectionsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `getStoryContent`, `getDirectionsContent`, `getGlobalSettings`（Task 1 / 既有）

- [ ] **Step 1: 建立 `src/pages/StoryPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import type { StoryContent } from '../types'
import { getStoryContent } from '../lib/firestore'

export default function StoryPage() {
  const [content, setContent] = useState<StoryContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStoryContent().then(setContent).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="text-center py-6 sm:py-8">
        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl tracking-[0.3em] text-[var(--color-text-primary)]">本店歷史</h2>
        <div className="mx-auto mt-3 h-px w-10 bg-[var(--color-gold-primary)]" />
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm text-center py-8">載入中…</p>
      ) : (
        <div className="flex flex-col gap-8 sm:gap-10">
          {content?.sections.map((section, idx) => (
            <section key={idx} className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
              {section.imageUrl && (
                <img
                  src={section.imageUrl}
                  alt={section.title || `本店歷史 ${idx + 1}`}
                  className="w-full sm:w-64 rounded shadow-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                {section.title && (
                  <h3 className="text-[var(--color-gold-primary)] font-serif text-lg tracking-wide mb-2">{section.title}</h3>
                )}
                <p className="text-[var(--color-text-primary)] text-sm leading-relaxed whitespace-pre-wrap">{section.text}</p>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 建立 `src/pages/DirectionsPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import type { DirectionsContent } from '../types'
import { getDirectionsContent, getGlobalSettings } from '../lib/firestore'

export default function DirectionsPage() {
  const [content, setContent] = useState<DirectionsContent | null>(null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDirectionsContent(), getGlobalSettings()])
      .then(([directions, settings]) => {
        setContent(directions)
        setAddress(settings.address ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="text-center py-6 sm:py-8">
        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl tracking-[0.3em] text-[var(--color-text-primary)]">交通指引</h2>
        <div className="mx-auto mt-3 h-px w-10 bg-[var(--color-gold-primary)]" />
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm text-center py-8">載入中…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {content?.title && (
            <h3 className="text-[var(--color-gold-primary)] font-serif text-lg tracking-wide text-center">{content.title}</h3>
          )}
          {content?.mapImageUrl && (
            <img src={content.mapImageUrl} alt="交通地圖" className="w-full rounded shadow-lg object-contain" />
          )}
          {content?.text && (
            <p className="text-[var(--color-text-primary)] text-sm leading-relaxed whitespace-pre-wrap">{content.text}</p>
          )}
          {address && (
            <p className="text-[var(--color-text-muted)] text-sm text-center border-t border-[var(--color-border-primary)] pt-4">
              📍 {address}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 修改 `src/App.tsx` 加入路由**

找到：

```tsx
import MenuPage from './pages/MenuPage'
import GuestbookPage from './pages/GuestbookPage'
import AdminPage from './pages/AdminPage'
```

改成：

```tsx
import MenuPage from './pages/MenuPage'
import StoryPage from './pages/StoryPage'
import DirectionsPage from './pages/DirectionsPage'
import GuestbookPage from './pages/GuestbookPage'
import AdminPage from './pages/AdminPage'
```

找到：

```tsx
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/guestbook" element={<GuestbookPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
```

改成：

```tsx
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/story" element={<StoryPage />} />
            <Route path="/directions" element={<DirectionsPage />} />
            <Route path="/guestbook" element={<GuestbookPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
```

- [ ] **Step 4: 修改 `src/components/Navbar.tsx` 加入導覽連結**

找到：

```tsx
          <NavLink to="/" className={linkClass} end>
            首頁
          </NavLink>
          <NavLink to="/guestbook" className={linkClass}>
            留言板
          </NavLink>
```

改成：

```tsx
          <NavLink to="/" className={linkClass} end>
            首頁
          </NavLink>
          <NavLink to="/story" className={linkClass}>
            本店歷史
          </NavLink>
          <NavLink to="/directions" className={linkClass}>
            交通指引
          </NavLink>
          <NavLink to="/guestbook" className={linkClass}>
            留言板
          </NavLink>
```

- [ ] **Step 5: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤輸出

- [ ] **Step 6: 手動驗證**

Run: `npm run dev:web`，瀏覽器確認：
- 導覽列依序顯示「首頁／本店歷史／交通指引／留言板」，點擊都能正確切換頁面且高亮當前項目
- `/story`、`/directions` 直接輸入網址也能開啟（`HashRouter`，實際是 `#/story`、`#/directions`）
- 後台尚未填寫內容時，前台頁面不噴錯，空白區塊自然不顯示(無標題/無圖不渲染對應區塊)
- 在後台「頁面內容」填寫並儲存後，重新整理前台頁面能看到新內容

- [ ] **Step 7: Commit**

```bash
git add src/pages/StoryPage.tsx src/pages/DirectionsPage.tsx src/App.tsx src/components/Navbar.tsx
git commit -m "$(cat <<'EOF'
新增前台「本店歷史」「交通指引」頁面與導覽列連結

路由 /story、/directions，內容讀 Task 1 的資料層一次性渲染固定版型；
Navbar 在首頁與留言板之間插入兩個連結。
EOF
)"
```
