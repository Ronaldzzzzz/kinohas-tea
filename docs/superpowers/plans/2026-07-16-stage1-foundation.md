# Stage 1 基礎框架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Project Template/` 複製成 `kinohas-tea/` 的獨立可執行專案，套用木葉茗茶坊品牌與台式茶莊視覺風格，並以 Firebase Local Emulator 讓使用者本機體驗完整前後台功能。

**Architecture:** 單一 Vite + React 19 + TypeScript + Tailwind CSS 4 前端專案，Firebase(Firestore/Auth/Storage) 走 Local Emulator Suite。路由結構(`/` MenuPage、`/guestbook`、`/admin`)沿用 Template 原樣，不重構。品牌/視覺改動集中在 `index.html`、`src/index.css`、`src/components/Navbar.tsx`、`src/pages/MenuPage.tsx`、`public/favicon.svg`。

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS 4, Vite, Firebase (Firestore/Auth/Storage), Firebase Local Emulator Suite。

## Global Constraints

- 不可修改 `JW_Website/Full-Moon-Bistro-pages` 與 `Project Template` 的檔案(規劃書全域規則)。
- 本階段不建立真實 Firebase 專案，全程用 Local Emulator，`projectId` 用 `demo-kinohastea`。
- 路由結構不重構，僅套用視覺風格(spec: 品牌與風格套用章節)。
- 品牌名稱一律為「木葉茗茶坊 Kinnoha's Tea」。
- 惡搞彈窗、圖片壓縮上傳、留言遮蔽功能不在本階段範圍內。
- 每個 Task 完成後執行 `npm run build`(在 `kinohas-tea/` 目錄下)確認 TypeScript 編譯與 Vite build 無錯誤，作為本階段的自動化檢查手段(此專案無既有單元測試檔案)。

---

### Task 1: 複製 Project Template 並完成初始化

**Files:**
- Create: `kinohas-tea/` 下除 `.git`、`node_modules` 外的 `Project Template/` 全部內容(含 `package.json`, `index.html`, `firebase.json`, `firestore.rules`, `storage.rules`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.env.example`, `public/`, `src/`)
- Modify: `kinohas-tea/package.json`(`name` 欄位)

**Interfaces:**
- Consumes: 無(本任務為專案骨架建立)
- Produces: `kinohas-tea/` 成為可 `npm install` / `npm run dev` / `npm run build` 的獨立專案根目錄，後續任務都在此目錄下修改檔案。

- [ ] **Step 1: 複製檔案**

```bash
cd "/Users/ronald/syncthing/ff14_RP_website"
rsync -a --exclude='.git' --exclude='node_modules' "Project Template/" "kinohas-tea/"
```

- [ ] **Step 2: 確認複製結果，`.git` 未被覆蓋**

```bash
cd kinohas-tea
git status
ls -la .git | head -3
```
Expected: `.git` 目錄仍是 kinohas-tea 原本的(`git status` 顯示在 `main` branch，新增大量 untracked files，無 `.git` 被覆蓋的跡象)。

- [ ] **Step 3: 修改 `package.json` 的 `name` 欄位**

`kinohas-tea/package.json` 第 2 行:
```json
  "name": "kinohas-tea",
```

- [ ] **Step 4: 安裝相依套件**

```bash
cd kinohas-tea
npm install
```
Expected: 安裝成功，無 fatal error。

- [ ] **Step 5: 確認 build 可過**

```bash
npm run build
```
Expected: `tsc -b && vite build` 成功完成，`dist/` 產生。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: bootstrap project from Project Template"
```

---

### Task 2: 修正 admin 元件中寫死的舊路徑(功能性 bug)

**背景:** Template 的三個 admin 元件寫死 fetch `/Full-Moon-Bistro-pages/data/master_items.json` 與 `/Full-Moon-Bistro-pages/data/master_recipes.json`，但 `vite.config.ts` 的 `base` 是 `/`，且資料實際放在 `public/data/`，路徑對不上會導致食材搜尋/菜品管理/庫存管理抓不到資料(404)。這會擋掉 Stage 1 驗收項目「後台功能與 Template 原版一致」，故在此修正。

**Files:**
- Modify: `kinohas-tea/src/components/admin/ItemSearchBox.tsx:18`
- Modify: `kinohas-tea/src/components/admin/MenuManager.tsx:69-70`
- Modify: `kinohas-tea/src/components/admin/InventoryManager.tsx:56`

**Interfaces:**
- Consumes: `public/data/master_items.json`, `public/data/master_recipes.json`(Task 1 複製時已隨 `public/` 帶入)
- Produces: 三個檔案改為 fetch `/data/master_items.json` 與 `/data/master_recipes.json`，供後台食材搜尋/菜品管理/庫存管理正常運作。

- [ ] **Step 1: 修正 `ItemSearchBox.tsx`**

`src/components/admin/ItemSearchBox.tsx:18` 改為:
```ts
    fetch('/data/master_items.json')
```

- [ ] **Step 2: 修正 `MenuManager.tsx`**

`src/components/admin/MenuManager.tsx:69-70` 改為:
```ts
          fetch('/data/master_items.json'),
          fetch('/data/master_recipes.json')
```

- [ ] **Step 3: 修正 `InventoryManager.tsx`**

`src/components/admin/InventoryManager.tsx:56` 改為:
```ts
        fetch('/data/master_recipes.json').then(r => r.json())
```

- [ ] **Step 4: 確認 build 仍過**

```bash
npm run build
```
Expected: 成功，無 TypeScript 錯誤。

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ItemSearchBox.tsx src/components/admin/MenuManager.tsx src/components/admin/InventoryManager.tsx
git commit -m "fix: correct hardcoded data fetch paths in admin components"
```

---

### Task 3: 設定 Firebase Local Emulator 並驗證啟動

**Files:**
- Create: `kinohas-tea/.env`(不進 git，需確認 `.gitignore` 已排除)
- Modify: 無(`firebase.json`、`src/lib/firebase.ts` 沿用 Template 原有 emulator 自動偵測邏輯)

**Interfaces:**
- Consumes: `Project Template` 既有的 `firebase.json` emulator port 設定(Firestore 8080 / Auth 9099 / Storage 9199 / UI 4000)與 `src/lib/firebase.ts` 的 dev 環境自動連線邏輯
- Produces: 本機可用 `firebase emulators:start` + `npm run dev` 完整跑通前後台，供後續任務與最終驗收使用。

- [ ] **Step 1: 確認 `.gitignore` 排除 `.env`**

```bash
grep -n "^\.env$\|^\.env" .gitignore
```
Expected: 有一行 `.env` 或 `.env*`。若無，補上一行 `.env` 到 `.gitignore` 並 commit。

- [ ] **Step 2: 建立 `.env`**

`kinohas-tea/.env`:
```env
VITE_FIREBASE_API_KEY=local-dev
VITE_FIREBASE_AUTH_DOMAIN=local-dev
VITE_FIREBASE_PROJECT_ID=demo-kinohastea
VITE_FIREBASE_STORAGE_BUCKET=demo-kinohastea.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:000000000000
```

- [ ] **Step 3: 安裝 firebase-tools(若尚未安裝)**

```bash
firebase --version || npm install -g firebase-tools
```

- [ ] **Step 4: 啟動 emulator，確認四個服務都起來**

```bash
firebase emulators:start --project demo-kinohastea
```
Expected terminal 輸出包含 Firestore(8080)、Auth(9099)、Storage(9199)、Emulator UI(4000)四個都 running，無 port 衝突錯誤。啟動後用 Ctrl+C 停止，或另開一個 terminal 繼續下一步。

- [ ] **Step 5: 在 emulator 運行狀態下啟動前端，確認可連線**

```bash
npm run dev
```
瀏覽器開 `http://localhost:5173`，開發者工具 Console 應無 Firebase 連線錯誤(如 `ERR_CONNECTION_REFUSED` 指向真實 Firebase 網域)。

- [ ] **Step 6: 於 Emulator UI(`http://localhost:4000`)手動新增第一個管理員帳號**

在 Firestore 分頁新增 `adminPasswords` collection 一筆文件(依 README「新增第一個管理員」章節的欄位格式)，供 Task 8 驗收 `/admin` 登入使用。

- [ ] **Step 7: Commit**

```bash
git add .gitignore
git commit -m "chore: configure firebase local emulator for dev" --allow-empty
```
(若 `.gitignore` 本來就已包含 `.env`，此 commit 可能無實質變更，用 `--allow-empty` 避免因無 diff 而失敗；若 Step 1 有改動則正常 commit 即可，不需要 `--allow-empty`。)

---

### Task 4: 品牌文字替換

**Files:**
- Modify: `kinohas-tea/index.html:8`
- Modify: `kinohas-tea/src/components/Navbar.tsx:26`
- Modify: `kinohas-tea/src/pages/MenuPage.tsx:36`

**Interfaces:**
- Consumes: 無
- Produces: 全站可見的品牌名稱固定為「木葉茗茶坊 Kinnoha's Tea」，取代 Template 原本的「餐廳名稱」佔位字與泛用標題。

- [ ] **Step 1: 修改 `index.html` title**

`index.html:8`:
```html
    <title>木葉茗茶坊 Kinnoha's Tea</title>
```

- [ ] **Step 2: 修改 `Navbar.tsx` 品牌名稱**

`src/components/Navbar.tsx:26`:
```tsx
            木葉茗茶坊
```

- [ ] **Step 3: 修改 `MenuPage.tsx` Banner 標題**

`src/pages/MenuPage.tsx:36`:
```tsx
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-widest text-shimmer mb-2">✦ 木葉茗茶坊 ✦</h1>
```

- [ ] **Step 4: 確認 build 仍過**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add index.html src/components/Navbar.tsx src/pages/MenuPage.tsx
git commit -m "feat: rebrand to 木葉茗茶坊 Kinnoha's Tea"
```

---

### Task 5: 置換 favicon 為茶葉意象圖示

**Files:**
- Modify: `kinohas-tea/public/favicon.svg`

**Interfaces:**
- Consumes: 無
- Produces: 瀏覽器分頁圖示改為簡易茶葉造型 SVG，取代 Template 原本的紫色抽象 Logo。

- [ ] **Step 1: 覆寫 `public/favicon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="23" fill="#2f4a34"/>
  <path d="M24 8c8 4 13 11 13 18 0 7-5.8 12-13 12s-13-5-13-12c0-7 5-14 13-18z" fill="#e8c873"/>
  <path d="M24 12v24" stroke="#2f4a34" stroke-width="2" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: 瀏覽器確認圖示顯示正常**

```bash
npm run dev
```
瀏覽器開 `http://localhost:5173`，檢查分頁圖示為茶葉造型且無破圖。

- [ ] **Step 3: Commit**

```bash
git add public/favicon.svg
git commit -m "feat: replace favicon with tea leaf icon"
```

---

### Task 6: 配色與字體改為台式茶莊風格

**Files:**
- Modify: `kinohas-tea/src/index.css:1-26`

**Interfaces:**
- Consumes: 無
- Produces: `@theme` CSS 變數改為茶綠/木質棕/米白配色，`--font-serif` 主字體改為 Noto Serif TC，新增 `--font-sans` 供內文使用 Noto Sans TC；變數名稱與既有使用處(各元件的 `var(--color-*)`、`font-serif` class)不變，僅換值，避免動到元件邏輯。

- [ ] **Step 1: 修改 `src/index.css` 開頭的字體匯入與 `@theme` 區塊**

`src/index.css:1-26` 整段改為:
```css
/*
 * ═══════════════════════════════════════════════════════
 * THEME CUSTOMIZATION — 木葉茗茶坊 台式茶莊配色
 * ═══════════════════════════════════════════════════════
 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap');
@import "tailwindcss";

@theme {
  --color-bg-primary: #f5f0e6;
  --color-bg-card: #ffffff;
  --color-bg-card-hover: #eee7d6;
  --color-border-primary: #d8cdb4;
  --color-border-gold: #7a8c6f;
  --color-gold-primary: #3f5c3f;
  --color-gold-light: #5c7a52;
  --color-text-primary: #3a3226;
  --color-text-muted: #8a7f66;
  /* 茶葉綠光暈 */
  --shadow-glow-warm: 0 0 15px rgba(63, 92, 63, 0.12);
  /* 極致平滑呼吸燈：2.5秒單程，來回共5秒，交替進行 */
  --animate-moon-pulse: moon-pulse 2.5s ease-in-out infinite alternate;
  --color-available: #3f7a4a;
  --color-soldout: #b5453f;
  --font-serif: "Noto Serif TC", serif;
  --font-sans: "Noto Sans TC", sans-serif;
}
```

- [ ] **Step 2: `body` 套用 `--font-sans`**

`src/index.css` 找到既有的 `body { ... }` 區塊(約在原第 42-45 行，緊接 `@keyframes moon-pulse` 之後)，改為:
```css
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 1.05rem;
}
```

- [ ] **Step 3: 確認 build 仍過並目視檢查配色**

```bash
npm run build
npm run dev
```
瀏覽器開 `http://localhost:5173`，確認整體背景/文字/邊框已從深棕西式配色變為米白底+茶綠主色，無殘留原本的金黃/深咖啡配色(除非該色值恰好與新配色相同)。

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: apply tea house color palette and Chinese serif/sans fonts"
```

---

### Task 7: MenuPage Hero 與「關於茶坊」區塊視覺加強

**背景:** `GlobalSettings.introText` 欄位已存在(`src/types/index.ts:137`)，`MenuPage.tsx` 已有條件渲染 `introText` 的區塊(現況只是一般卡片樣式)。本任務只加強 Hero banner 尺寸與質感、並將 `introText` 區塊視覺上定位為「關於茶坊」，不新增資料欄位、不動資料流。

**Files:**
- Modify: `kinohas-tea/src/pages/MenuPage.tsx:34-42`

**Interfaces:**
- Consumes: 既有 `introText` state(來自 `getGlobalSettings()`，型別 `string`)
- Produces: 無新 export，僅調整 JSX 結構與樣式 class。

- [ ] **Step 1: 修改 Hero banner 與 intro 區塊**

`src/pages/MenuPage.tsx:34-42` 現況:
```tsx
      {/* Banner */}
      <div className="border border-[var(--color-border-gold)] rounded p-4 sm:p-6 text-center bg-gradient-to-r from-[var(--color-bg-card)] to-[var(--color-bg-card-hover)] shadow-[var(--shadow-glow-warm)] banner-shimmer">
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-widest text-shimmer mb-2">✦ 木葉茗茶坊 ✦</h1>
        <div className="mt-2 wave-divider" />
      </div>

      {introText.trim() && (
        <div className="border border-[var(--color-border-gold)] rounded p-4 sm:p-6 bg-[var(--color-bg-card)]">
          <p className="text-[#d4c090] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {introText}
          </p>
        </div>
      )}
```

改為:
```tsx
      {/* Hero */}
      <div className="border border-[var(--color-border-gold)] rounded p-8 sm:p-12 md:p-16 text-center bg-gradient-to-r from-[var(--color-bg-card)] to-[var(--color-bg-card-hover)] shadow-[var(--shadow-glow-warm)] banner-shimmer">
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-widest text-shimmer mb-3">✦ 木葉茗茶坊 ✦</h1>
        <p className="font-serif text-sm sm:text-base tracking-widest text-[var(--color-text-muted)]">Kinnoha's Tea</p>
        <div className="mt-4 wave-divider" />
      </div>

      {introText.trim() && (
        <div className="border border-[var(--color-border-gold)] rounded p-4 sm:p-6 bg-[var(--color-bg-card)]">
          <h2 className="font-serif text-lg sm:text-xl text-[var(--color-gold-primary)] mb-2">關於茶坊</h2>
          <p className="text-[var(--color-text-primary)] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {introText}
          </p>
        </div>
      )}
```

- [ ] **Step 2: 確認 build 仍過**

```bash
npm run build
```
Expected: 成功。

- [ ] **Step 3: 在 `/admin` 全域設定填入一段 `introText`，前台目視確認 Hero 與「關於茶坊」區塊顯示正常**

```bash
npm run dev
```
瀏覽器開 `http://localhost:5173/admin`，登入後在全域設定填入介紹文字並儲存，回首頁確認「關於茶坊」區塊標題與內文正常顯示。

- [ ] **Step 4: Commit**

```bash
git add src/pages/MenuPage.tsx
git commit -m "feat: enlarge hero banner and label intro section as 關於茶坊"
```

---

### Task 8: 完整功能走查與驗收

**Files:**
- 無程式碼變更(除非走查中發現需要修正的問題)

**Interfaces:**
- Consumes: Task 1-7 的全部產出
- Produces: 走查紀錄(於本次對話中回報結果)，作為 Stage 1 完成的憑證。

- [ ] **Step 1: 啟動完整開發環境**

```bash
cd kinohas-tea
firebase emulators:start --project demo-kinohastea &
npm run dev
```

- [ ] **Step 2: 前台走查**

瀏覽器開 `http://localhost:5173`，依序確認:
- 首頁 Hero、關於茶坊、菜單分類顯示正常，品牌文字為「木葉茗茶坊 Kinnoha's Tea」
- 送出一筆點餐訂單成功，出現冷卻計時
- `/guestbook` 張貼留言、按讚/倒讚、回覆功能正常

- [ ] **Step 3: 後台走查**

`/admin` 用 Task 3 Step 6 建立的帳號登入，依序確認:
- 菜品管理: 新增/編輯/刪除一筆菜品，庫存開關正常
- 食材庫存管理: 搜尋/新增食材(驗證 Task 2 修正的路徑已生效，無 404)
- 訂單管理: 看得到 Step 2 送出的訂單，可標記完成
- 留言審核: 看得到 Step 2 的留言，可刪除
- 告示看板設定、相片管理、全域設定、管理員帳號管理: 各自開啟後可儲存變更無錯誤

- [ ] **Step 4: 停止 emulator**

```bash
# 找到並結束背景的 firebase emulators 行程
kill %1
```

- [ ] **Step 5: 若走查中發現任何功能性錯誤，記錄後修正並回到 Step 1 重新走查；全部通過後才進入 Step 6**

- [ ] **Step 6: 更新 spec 驗收狀態並做最終 commit**

在 `docs/superpowers/specs/2026-07-16-stage1-foundation-design.md` 的「驗收方式」章節末尾加一行:
```markdown

Stage 1 走查於 2026-07-16 完成，前後台功能與 Template 原版一致，品牌/配色/字體/Hero 區塊已套用。
```

```bash
git add docs/superpowers/specs/2026-07-16-stage1-foundation-design.md
git commit -m "docs: mark stage 1 acceptance walkthrough complete"
```
