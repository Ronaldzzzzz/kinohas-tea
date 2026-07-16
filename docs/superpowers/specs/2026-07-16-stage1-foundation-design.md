# Stage 1: 基礎框架 — Design Spec

日期: 2026-07-16
範圍: 僅涵蓋 `Instruction for Kinnoha's Tea 木葉茗茶坊.md` 的「階段一：基礎框架」。
不含: 惡搞彈窗、圖片壓縮上傳、留言遮蔽(屬 Stage 2/3)。

## 背景

`kinohas-tea/` 目前僅有 `LICENSE` 與需求說明文件，尚無程式碼。
`Project Template/` 是基於 `JW_Website/Full-Moon-Bistro-pages` 抽出的通用餐廳點餐系統模板(React 19 + TypeScript + Tailwind CSS 4 + Vite + Firebase)，已包含完整前後台功能:

- 前台: 菜單分類展示、點餐表單(含冷卻計時)、告示看板、留言板(回覆/按讚)
- 後台(`/admin`): 密碼登入(多帳號/角色權限)、菜品管理、食材庫存、訂單管理(進行中/歷史)、留言審核刪除、告示看板設定、相片管理、全域設定、管理員帳號管理

`Full-Moon-Bistro-pages` 與 `Project Template` 皆不可修改。實作方式為複製 `Project Template` 到 `kinohas-tea/` 後在複本上開發。

## 目標

1. `kinohas-tea/` 成為獨立可執行的專案根目錄，具備 Template 的完整後台功能，讓使用者可本機體驗。
2. 前台套用「木葉茗茶坊」品牌與台式茶莊視覺風格，與月圓餐館/模板原樣做出明顯區隔，不再是西式餐廳外觀。
3. 不需要使用者現在手動建立真實 Firebase 專案 — 改用 Firebase Local Emulator Suite 開發。

## 架構

- 複製 `Project Template/` 全部內容(排除 `.git`、`node_modules`)至 `kinohas-tea/` 根目錄，成為與 `JW_Website` 平行的獨立 React 專案。
- 路由結構沿用 Template 原樣，不重構:
  - `/` → `MenuPage`(首頁，含菜單展示與點餐)
  - `/guestbook` → `GuestbookPage`
  - `/admin` → `AdminPage`
- Firebase 走 Local Emulator Suite(Firestore/Auth/Storage)。`.env` 使用假值，`VITE_FIREBASE_PROJECT_ID` 設為 `demo-kinohastea`(`demo-` 前綴使 CLI 自動走純本地模式)。不需要真實 Firebase 專案；待日後要正式上線時，另行通知使用者手動建立。
- Firestore 集合結構、`src/lib/firebase.ts` 的 emulator 自動偵測邏輯沿用 Template 原有設計，不更動。

## 品牌與視覺風格

- 品牌名稱取代: 「Full Moon Bistro / 月圓餐館」→「木葉茗茶坊 Kinnoha's Tea」。修改範圍:
  - `index.html` 的 `<title>`
  - `src/components/Navbar.tsx` 品牌名稱文字
  - `src/pages/MenuPage.tsx` Banner 標題文字
  - 相關 favicon/靜態圖片素材(若為 Template 內建的月圓意象圖片，替換或移除)
- 配色: 仿參考網站(sungshantea.com)台式茶行氣質 — 茶綠、木質棕、米白底為主色調。修改 `src/index.css` 頂部 CSS 變數(`--color-gold-primary`、`--color-bg-primary` 等),不更動變數命名或使用邏輯,僅換色值。
- 字體: 標題改用 Noto Serif TC(書法/宋體感),內文改用 Noto Sans TC,取代原本西式字體堆疊。
- `MenuPage` 首頁頂部加大 Hero 橫幅區塊(茶莊意象圖 + 標語)與簡短「關於茶坊」文字區塊,置於原有菜單展示區之上。菜單網格、點餐表單、留言板、後台各功能的邏輯與資料流不動,僅套用新配色與字體(視覺統一,避免切換頁面時風格突兀)。

## 不做的事(本階段排除)

- 惡搞彈窗(廣告彈窗/可拖動視窗)與其後台圖片上傳/壓縮功能 — Stage 2。
- 留言遮蔽功能 — Stage 2。
- 全站頁面架構重新規劃(如把 admin/guestbook 併入單頁 scroll)— 使用者已明確選擇「折衷」,僅統一風格,不重構路由。
- 建立真實 Firebase 專案 — 待日後正式部署階段再處理。

## 驗收方式

1. `npm install` 成功。
2. `firebase emulators:start --project demo-kinohastea` + `npm run dev` 皆可正常啟動,無編譯錯誤。
3. 本機瀏覽器手動走過: 首頁菜單展示與點餐送出、留言板張貼與按讚回覆、`/admin` 登入後的菜品/庫存/訂單/留言審核/告示看板/相片管理/全域設定/管理員帳號管理,功能與 Template 原版一致。
4. 目視確認品牌名稱、配色、字體、Hero 區塊已套用,與 Full Moon Bistro 原版有明顯視覺區隔。

## Stage 1 完成狀態(2026-07-16)

Task 1-7(專案複製、後台舊路徑 bug 修正、Firebase Local Emulator 設定、品牌文字、favicon、配色字體、Hero 區塊)皆已實作並個別通過 code review。

Task 8 自動化/API 層驗證已完成: `npm run build` 每個 Task 後皆通過、首頁 `<title>` 正確、favicon 與 `/data/master_items.json`、`/data/master_recipes.json` 可正常存取(驗證 Task 2 修正生效)、Firestore Emulator 內已種入管理員帳號(密碼 `admin123`,SHA-256 hash 對應 `adminPasswords` collection)且可被 app 的登入邏輯正確查到、Vite dev log 無 runtime error。

因本環境瀏覽器 automation 未連線,驗收方式第 3、4 項(點餐送出、留言板互動、`/admin` 各面板操作、視覺配色確認)改為使用者於本機手動走查,結果另行回報處理。
