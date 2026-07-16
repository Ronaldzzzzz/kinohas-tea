# 餐廳點餐系統模板

基於 React + Firebase 的通用餐廳點餐系統，包含前台菜單展示與後台管理功能。

## 功能

**前台**
- 菜單分類展示（附圖片、描述、價格）
- 客人點餐表單（含冷卻計時器防止重複點餐）
- 告示看板（可由後台設定）
- 留言板（含回覆、按讚/倒讚功能）

**後台（/admin）**
- 密碼登入，支援多帳號與角色權限（Owner / Staff）
- 菜品管理（新增、編輯、刪除、庫存開關）
- 食材庫存管理
- 訂單管理（進行中 / 歷史訂單）
- 留言審核與刪除
- 告示看板設定
- 相片管理（支援裁切上傳）
- 全域設定（餐廳地址、介紹文字、點餐冷卻時間等）
- 管理員帳號管理（新增/刪除/設定細項權限）

## 快速開始

### 1. 安裝相依套件

```bash
npm install
```

### 2. 設定 Firebase

1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立新專案
2. 啟用以下服務：
   - Firestore Database
   - Storage
   - Authentication（啟用「匿名登入」）
3. 複製 `.env.example` 為 `.env`，填入你的 Firebase 設定值

```bash
cp .env.example .env
```

### 3. 部署 Firebase 規則

```bash
firebase deploy --only firestore:rules,storage
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

### 5. 新增第一個管理員

前往 `http://localhost:5173/admin`，系統會提示輸入密碼。由於尚無帳號，請直接到 Firestore Console 的 `adminPasswords` 集合手動新增第一筆資料，或使用 Firebase Admin SDK 腳本初始化。

## 本地開發（不需要真實 Firebase 專案）

開發初期可使用 **Firebase Local Emulator Suite** 在本機完整模擬 Firestore、Auth、Storage，無需建立真實的 Firebase 專案，也無需填入真實的 API 金鑰。

### 1. 安裝 Firebase CLI

```bash
npm install -g firebase-tools
```

> 本地模擬不需要 `firebase login`，跳過即可。

### 2. 建立假的 `.env`

複製 `.env.example` 為 `.env`，填入任意假值（模擬器不驗證金鑰）：

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=local-dev
VITE_FIREBASE_AUTH_DOMAIN=local-dev
VITE_FIREBASE_PROJECT_ID=demo-restaurant
VITE_FIREBASE_STORAGE_BUCKET=demo-restaurant.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:000000000000
```

> `projectId` 建議以 `demo-` 開頭，Firebase CLI 會自動以純本地模式啟動，不會嘗試連接雲端。

### 3. 啟動模擬器與開發伺服器

開啟兩個終端分別執行：

```bash
# 終端 1：啟動 Firebase 模擬器
firebase emulators:start --project demo-restaurant

# 終端 2：啟動 Vite 開發伺服器
npm run dev
```

`npm run dev` 時，`src/lib/firebase.ts` 會自動偵測開發環境並連接到本地模擬器，**部署時不需要修改任何程式碼**。

### 4. 模擬器管理介面

瀏覽器開啟 `http://localhost:4000`，可以：
- 直接在 Firestore 新增/編輯資料（例如新增第一個管理員帳號至 `adminPasswords` 集合）
- 查看 Storage 上傳的檔案
- 管理 Auth 使用者

### 模擬器 Port 對照

| 服務 | Port |
|------|------|
| Firestore | 8080 |
| Auth | 9099 |
| Storage | 9199 |
| 管理介面 UI | 4000 |

### 切換至真實 Firebase

準備好上線時，依照「快速開始」章節建立 Firebase 專案並填入真實的 `.env` 值，執行 `npm run build` 即可，不需改動任何程式碼。

---

## 自訂主題

### 顏色方案

開啟 `src/index.css`，修改頂部的 CSS 變數：

```css
--color-gold-primary: ...    /* 主色調 */
--color-bg-primary: ...      /* 背景色 */
/* 其他變數參見檔案內說明 */
```

### 餐廳名稱

- `src/components/Navbar.tsx` — 修改品牌名稱文字
- `src/pages/MenuPage.tsx` — 修改 Banner 標題文字
- `index.html` — 修改 `<title>` 標籤

### 部署路徑

若需部署到 GitHub Pages 的子路徑，修改 `vite.config.ts`：

```ts
base: '/your-repo-name/'
```

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 路由 | React Router 7 |
| 樣式 | Tailwind CSS 4 |
| 建置工具 | Vite |
| 資料庫 | Firebase Firestore |
| 檔案儲存 | Firebase Storage |
| 認證 | Firebase Auth（匿名） |

## Firestore 集合結構

| 集合 | 用途 |
|------|------|
| `menuItems` | 菜品資料 |
| `inventory` | 食材庫存 |
| `orders` | 點餐訂單 |
| `messages` | 留言板訊息 |
| `notices` | 告示看板 |
| `adminPasswords` | 管理員帳號（SHA-256 雜湊） |
| `globalSettings` | 全域設定（地址、介紹文字等） |
