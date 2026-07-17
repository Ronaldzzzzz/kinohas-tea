# Stage 3 第一批：90 年代懷舊網頁元素 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 左右直幅假廣告(後台可管理)、跑馬燈滾動文字(後台可編輯)、真實累加訪客計數器(復古 LCD 樣式)。

**Architecture:** `popups` collection 擴充 `type: 'banner'` + `position`,沿用既有彈窗上傳/壓縮/顯示排除邏輯;`globalSettings` 加 `marqueeText` 欄位;新增 `siteStats/hitCounter` 單一文件 + Firestore transaction 原子遞增。三個新前台元件掛入既有 `PopupLayer`(banner)、`MenuPage`(marquee)、`Footer`(counter)。

**Tech Stack:** React 19 + TypeScript、Tailwind CSS 4、Firebase(Firestore)、Vitest + Testing Library。

## Global Constraints

- 配色一律 `var(--color-*)`,禁止硬編 hex(既有站規)。
- 側欄廣告桌面 ≥1024px 才顯示,窄螢幕隱藏;`/admin` 路由不顯示(比照現行 PopupLayer 排除邏輯)。
- 跑馬燈欄位為空字串或未設定時,前台整條 bar 不渲染。
- **設計調整(相對 spec 的執行細節)**: spec 原文寫跑馬燈「Navbar 正下方」,但目前 MenuPage 的 Hero 已改為滿版滿視窗高、緊貼在透明導覽列下方營造沉浸感(Stage 1 後續迭代),若在 Hero 上方插入一條實色跑馬燈會切斷這個沉浸效果。改為放在 Hero 區塊結束之後、「本店特色」區塊之前,同樣滿版橫跨,視覺上仍是進站後第一眼看到的橫幅,不影響 Hero 沉浸感。
- 訪客計數器用 Firestore transaction 遞增,不接受任意數值覆蓋;`sessionStorage` 避免同一分頁 session 內重複計數。
- 每個 Task 完成後 `npm run build`、`npm run test` 須通過。
- **不要 push**:每個 Task 結束只 commit,不執行 `git push`(使用者要求手動 push)。
- 工作目錄: `/Users/ronald/syncthing/ff14_RP_website/kinohas-tea`。

---

### Task 1: 型別、Firestore 規則、後台 banner 選項

**Files:**
- Modify: `src/types/index.ts`
- Modify: `firestore.rules`
- Modify: `src/components/admin/PopupManager.tsx`
- Modify: `src/components/admin/GlobalSettingsManager.tsx`

**Interfaces:**
- Consumes: 既有 `Popup` 型別、`getPopups/addPopup/updatePopup/deletePopup`(`src/lib/firestore.ts`)、`GlobalSettings`、`getGlobalSettings/updateGlobalSettings`
- Produces(後續任務依賴): `Popup.type` 聯集加 `'banner'`,新增 `Popup.position?: 'left' | 'right'`;`GlobalSettings.marqueeText?: string`;Firestore `siteStats/{docId}` 規則就緒供 Task 6 使用

- [ ] **Step 1: `src/types/index.ts` 修改 `Popup` 介面**

找到現有 `Popup` 介面(檔案末尾附近),`type` 欄位改為:
```ts
export interface Popup {
  id: string
  type: 'entry' | 'floating' | 'banner'
  position?: 'left' | 'right'   // type === 'banner' 時使用
  imageUrl?: string
  text?: string
  linkUrl?: string
  enabled: boolean
  order: number
  createdAt: Timestamp
}
```

`GlobalSettings` 介面加一行(放在 `photoUrls` 之後):
```ts
  marqueeText?: string         // 首頁跑馬燈文字，留空則不顯示
```

- [ ] **Step 2: `firestore.rules` 新增 `siteStats` 規則**

在檔案末尾 `settings`/`popups` 區塊之後新增:
```
    // 訪客計數器：單一文件，公開讀寫(僅允許遞增，前端用 transaction 保證)
    match /siteStats/{docId} {
      allow read: if true;
      allow write: if true;
    }
```

- [ ] **Step 3: `PopupManager.tsx` 加 banner 選項**

`type` state 型別已隨 `Popup['type']` 自動擴充。找到 `<select>` 的 type 選單:
```tsx
            <select value={type} onChange={e => setType(e.target.value as Popup['type'])}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
              <option value="entry">進版彈窗</option>
              <option value="floating">拖動視窗</option>
              <option value="banner">側欄廣告</option>
            </select>
```

新增 `position` state(放在既有 `file` state 之後):
```tsx
  const [position, setPosition] = useState<'left' | 'right'>('left')
```

`type === 'banner'` 時顯示 position 下拉,緊接在 type select 後面:
```tsx
            {type === 'banner' && (
              <select value={position} onChange={e => setPosition(e.target.value as 'left' | 'right')}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
                <option value="left">左側</option>
                <option value="right">右側</option>
              </select>
            )}
```

`handleAdd` 內組 `addPopup` 資料的地方,加入 position(僅 banner 需要):
```tsx
      await addPopup({
        type,
        ...(type === 'banner' ? { position } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(linkUrl.trim() ? { linkUrl: linkUrl.trim() } : {}),
        enabled: true,
        order: popups.length,
      })
```

`TYPE_LABELS` 常數加 `banner: '側欄廣告',`。

列表項目顯示 type 標籤處,banner 額外顯示 position(找到 `<span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]">{TYPE_LABELS[p.type]}</span>` 這行),改為:
```tsx
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]">
                {TYPE_LABELS[p.type]}{p.type === 'banner' && p.position ? `(${p.position === 'left' ? '左' : '右'})` : ''}
              </span>
```

- [ ] **Step 4: `GlobalSettingsManager.tsx` 新增跑馬燈文字欄位**

加 state(放在 `realModeEnabled` state 之後):
```tsx
  const [marqueeText, setMarqueeText] = useState('')
```

`useEffect` 載入設定的地方加一行:
```tsx
        setMarqueeText(s.marqueeText ?? '')
```

`handleSave` 的 `updateGlobalSettings` 呼叫加入 `marqueeText`:
```tsx
      await updateGlobalSettings({ address, orderCooldownMinutes: cooldown, realModeEnabled, marqueeText })
```

在「庫存模式開關」區塊之後、「儲存按鈕」之前,新增一個欄位區塊:
```tsx
        {/* 跑馬燈文字 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs tracking-wide">
            首頁跑馬燈文字
          </label>
          <input
            type="text"
            value={marqueeText}
            onChange={e => setMarqueeText(e.target.value)}
            placeholder="例：本週特調上市！內用低消 100 元"
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                       placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)]
                       transition-colors"
          />
          <p className="text-[var(--color-text-muted)] text-[11px]">顯示於首頁 Hero 下方的跑馬燈。留空則不顯示。</p>
        </div>
```

- [ ] **Step 5: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts firestore.rules src/components/admin/PopupManager.tsx src/components/admin/GlobalSettingsManager.tsx
git commit -m "feat: add banner popup type, marqueeText field, and siteStats rules"
```

不執行 `git push`。

---

### Task 2: SidebarBanners(左右直幅假廣告)

**Files:**
- Create: `src/components/popups/SidebarBanners.tsx`
- Modify: `src/components/popups/PopupLayer.tsx`

**Interfaces:**
- Consumes: `Popup` 型別、`PopupLayer` 現有的 `popups` state(已 fetch 過,不重複 fetch)
- Produces: `SidebarBanners({ banners }: { banners: Popup[] })` default export,無其他 export

- [ ] **Step 1: 建立 `src/components/popups/SidebarBanners.tsx`**

```tsx
import type { Popup } from '../../types'

interface Props {
  banners: Popup[]
}

/** 左右直幅假廣告：仿早期入口網站 skyscraper ad，桌面(≥1024px)固定於視窗兩側 */
export default function SidebarBanners({ banners }: Props) {
  const left = banners.filter(b => b.position === 'left').slice(0, 2)
  const right = banners.filter(b => b.position === 'right').slice(0, 2)

  const renderStack = (items: Popup[], side: 'left' | 'right') => (
    <div className={`hidden lg:flex fixed top-24 ${side === 'left' ? 'left-4' : 'right-4'} z-30 flex-col gap-3`}>
      {items.map(banner => {
        const img = (
          <img
            src={banner.imageUrl}
            alt=""
            className="w-32 xl:w-40 rounded shadow-lg animate-pulse"
            draggable={false}
          />
        )
        return (
          <div
            key={banner.id}
            className="border-2 border-[var(--color-gold-primary)] rounded p-1 bg-[var(--color-bg-card)]"
          >
            <p className="text-center text-[9px] tracking-widest text-[var(--color-gold-primary)] mb-0.5">⚡ 熱門廣告 ⚡</p>
            {banner.linkUrl ? (
              <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">{img}</a>
            ) : img}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      {left.length > 0 && renderStack(left, 'left')}
      {right.length > 0 && renderStack(right, 'right')}
    </>
  )
}
```

- [ ] **Step 2: `PopupLayer.tsx` 掛入**

import 加 `import SidebarBanners from './SidebarBanners'`。

在既有 `floats` 的 `useMemo` 之後新增:
```tsx
  const banners = useMemo(() => popups.filter(p => p.type === 'banner' && p.imageUrl), [popups])
```

回傳的 JSX 片段開頭加入(`<>` 之後第一個元素):
```tsx
      <SidebarBanners banners={banners} />
```
(`if (pathname.startsWith('/admin')) return null` 已在 `SidebarBanners` 渲染之前執行,admin 路由自動排除,不需額外處理。)

- [ ] **Step 3: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/components/popups/SidebarBanners.tsx src/components/popups/PopupLayer.tsx
git commit -m "feat: add sidebar skyscraper ad banners"
```

不執行 `git push`。

---

### Task 3: MarqueeBar(跑馬燈)

**Files:**
- Create: `src/components/menu/MarqueeBar.tsx`
- Modify: `src/index.css`
- Modify: `src/pages/MenuPage.tsx`

**Interfaces:**
- Consumes: `globalSettings.marqueeText`(MenuPage 既有的 `getGlobalSettings()` 呼叫)
- Produces: `MarqueeBar({ text }: { text: string })` default export;不渲染時回傳 `null`(呼叫端仍需檢查空字串,元件內部也做防呆)

- [ ] **Step 1: `src/index.css` 新增跑馬燈動畫**

在既有 `@keyframes bounce-in` 之後新增:
```css
@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.marquee-track {
  animation: marquee-scroll 20s linear infinite;
}
```

- [ ] **Step 2: 建立 `src/components/menu/MarqueeBar.tsx`**

```tsx
interface Props {
  text: string
}

/** 跑馬燈：CSS 動畫等效實作(不用已廢棄的 <marquee> 標籤)，內容重複兩次無縫循環 */
export default function MarqueeBar({ text }: Props) {
  if (!text.trim()) return null

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-[var(--color-deep-green)] border-y border-[var(--color-gold-primary)]/30 py-2">
      <div className="marquee-track flex whitespace-nowrap w-max">
        <span className="text-sm text-[var(--color-on-deep)] tracking-wider px-8">📣 {text}</span>
        <span className="text-sm text-[var(--color-on-deep)] tracking-wider px-8" aria-hidden="true">📣 {text}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `MenuPage.tsx` 掛入**

import 加 `import MarqueeBar from '../components/menu/MarqueeBar'`。

state 加(放在 `heroPhotos` 之後):
```tsx
  const [marqueeText, setMarqueeText] = useState('')
```

`getGlobalSettings().then(settings => {...})` 的 callback 內加一行:
```tsx
        setMarqueeText(settings.marqueeText ?? '')
```

JSX 中,在 Hero 區塊(`</div>` 結束 Hero,即 `{/* 捲動提示 */}` 的 `</a>` 之後那個 `</div>`)之後、「本店特色」區塊之前插入:
```tsx
      <MarqueeBar text={marqueeText} />
```

- [ ] **Step 4: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/menu/MarqueeBar.tsx src/pages/MenuPage.tsx
git commit -m "feat: add marquee text bar below hero"
```

不執行 `git push`。

---

### Task 4: HitCounter(訪客計數器,TDD)

**Files:**
- Create: `src/lib/siteStats.ts`
- Create: `src/lib/siteStats.test.ts`
- Create: `src/components/HitCounter.tsx`
- Modify: `src/components/Footer.tsx`

**Interfaces:**
- Consumes: `db`(`src/lib/firebase.ts`)
- Produces: `formatCounter(count: number): string`(純函式,補零到 6 位,供測試與元件共用);`incrementHitCounter(): Promise<number>`(transaction 遞增並回傳新值,寫在 `src/lib/siteStats.ts`,與 `firestore.ts` 分開避免該檔繼續肥大);`HitCounter()` default export(無 props,自行判斷 sessionStorage)

- [ ] **Step 1: 寫失敗測試 `src/lib/siteStats.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { formatCounter } from './siteStats'

describe('formatCounter', () => {
  it('補零至 6 位', () => {
    expect(formatCounter(42)).toBe('000042')
  })
  it('超過 6 位時原樣顯示，不截斷', () => {
    expect(formatCounter(1234567)).toBe('1234567')
  })
  it('0 顯示為全零', () => {
    expect(formatCounter(0)).toBe('000000')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
npm run test
```
Expected: FAIL(`siteStats.ts` 不存在)。

- [ ] **Step 3: 建立 `src/lib/siteStats.ts`**

```ts
import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

const COUNTER_REF_PATH = ['siteStats', 'hitCounter'] as const

/** 補零至 6 位；超過 6 位數原樣顯示 */
export function formatCounter(count: number): string {
  return String(count).padStart(6, '0')
}

/** 原子遞增訪客計數器並回傳遞增後的總數 */
export async function incrementHitCounter(): Promise<number> {
  const ref = doc(db, ...COUNTER_REF_PATH)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const current = (snap.data()?.count as number | undefined) ?? 0
    const next = current + 1
    tx.set(ref, { count: next })
    return next
  })
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
npm run test
```
Expected: PASS(3 new tests + 既有 5 tests = 8)。

- [ ] **Step 5: 建立 `src/components/HitCounter.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { incrementHitCounter, formatCounter } from '../lib/siteStats'

const SESSION_KEY = 'hitCounterCounted'

/** 復古 LCD 樣式訪客計數器：同一分頁 session 只計一次，關閉分頁重開才會再次遞增 */
export default function HitCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const alreadyCounted = sessionStorage.getItem(SESSION_KEY)
    if (alreadyCounted) {
      setCount(Number(alreadyCounted))
      return
    }
    incrementHitCounter()
      .then(next => {
        sessionStorage.setItem(SESSION_KEY, String(next))
        setCount(next)
      })
      .catch(() => {})
  }, [])

  if (count === null) return null

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="text-[10px] text-[var(--color-on-deep)] opacity-60 tracking-wider">您是本站第</span>
      <span className="font-mono text-sm bg-black text-[#39ff14] px-2 py-0.5 rounded tracking-[0.2em] border border-[#39ff14]/40">
        {formatCounter(count)}
      </span>
      <span className="text-[10px] text-[var(--color-on-deep)] opacity-60 tracking-wider">位訪客</span>
    </div>
  )
}
```

- [ ] **Step 6: `Footer.tsx` 掛入**

import 加 `import HitCounter from './HitCounter'`。

在既有 `<div className="border-t border-[var(--color-on-deep)]/10">...</div>`(版權列)之前插入:
```tsx
      <div className="border-t border-[var(--color-on-deep)]/10">
        <HitCounter />
      </div>
```
(保留原本版權列的 `border-t` 區塊在其後,即新增一個獨立的 `border-t` 區塊夾在中間;確認縮排與現有版權 `<div>` 同層級。)

- [ ] **Step 7: build 驗證**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 8: Commit**

```bash
git add src/lib/siteStats.ts src/lib/siteStats.test.ts src/components/HitCounter.tsx src/components/Footer.tsx
git commit -m "feat: add real-incrementing retro hit counter to footer"
```

不執行 `git push`。

---

### Task 5: 走查驗收

**Files:**
- Modify: `docs/superpowers/specs/2026-07-17-stage3-retro-web-design.md`(驗收註記)

**Interfaces:**
- Consumes: Task 1-4 全部產出
- Produces: 驗收紀錄

- [ ] **Step 1: 啟動開發環境**

```bash
npm run dev
```

- [ ] **Step 2: 後台走查**

`/#/admin` 登入(`admin123`):
- 彈窗管理:新增一筆 banner(左)、一筆 banner(右),各帶圖片與連結;列表正確顯示「側欄廣告(左)」「側欄廣告(右)」
- 系統設定:填入跑馬燈文字並儲存;清空後儲存確認可還原空值

- [ ] **Step 3: 前台走查**

- 桌面寬度(≥1024px):首頁左右各看到剛才新增的廣告直幅,點擊圖片開新分頁
- 縮小視窗至 <1024px:側欄廣告消失
- 首頁 Hero 下方出現跑馬燈,文字連續向左捲動無跳動;`/admin` 不顯示跑馬燈(本來就只在 MenuPage)
- 清空跑馬燈文字重整,確認該區塊完全不佔版面
- Footer 底部看到「您是本站第 ▓▓▓▓▓▓ 位訪客」LCD 樣式數字;重整同分頁數字不變;新開無痕分頁再進站數字遞增
- `/#/admin` 路由確認不出現側欄廣告

- [ ] **Step 4: 全測試+build**

```bash
npm run test && npm run build
```
Expected: 8/8 測試通過 + build 成功。

- [ ] **Step 5: 發現問題則修復後回到 Step 1;全過後在 spec 驗收章節末補一行**

```markdown

Stage 3 第一批(90 年代懷舊元素)走查於 [日期] 完成,三項功能驗收通過。
```

- [ ] **Step 6: Commit(不 push)**

```bash
git add docs/superpowers/specs/2026-07-17-stage3-retro-web-design.md
git commit -m "docs: mark stage 3 batch 1 acceptance complete"
```

提醒使用者本輪全部 commit 已完成,待其確認後自行 `git push`。
