# 木葉茗茶坊 Kinoha's Tea

專為 FF14 模擬 RP 打造的台式茶莊互動網站。前台為一頁式茶莊形象頁與菜單點餐，後台提供完整店務管理。

**正式站**：<https://ronaldzzzzz.github.io/kinohas-tea/>

## 功能

**前台**
- 沉浸式滿版首屏、本店特色介紹、關於茶坊
- 菜單卡片網格展示（圖片、描述、價格、供應狀態）
- 客人點餐表單（含冷卻計時防重複下單）
- 告示看板、留言板（回覆、按讚/倒讚）

**後台（`/#/admin`）**
- 密碼登入，多帳號與角色權限（Owner / Staff）
- 菜品管理、食材庫存、訂單管理（進行中／歷史）
- 留言審核、告示看板、相片管理（裁切上傳）
- 全域設定（店址、介紹文字、點餐冷卻時間等）
- 管理員帳號管理

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + TypeScript + React Router 7（HashRouter） |
| 樣式 | Tailwind CSS 4 |
| 建置 | Vite |
| 後端 | Firebase（Firestore / Storage / 匿名 Auth） |
| 靜態託管 | GitHub Pages（GitHub Actions 自動部署） |

## 本地開發

不需要真實 Firebase 專案，全程走 Local Emulator：

```bash
npm install
npm run dev        # 一鍵啟動 Firebase 模擬器(含 UI :4000) + Vite
```

- 前台：<http://localhost:5173>
- 模擬器 UI：<http://localhost:4000>
- `.env` 使用 demo 值，模擬器資料存於 `.emulator-seed-data/`，關閉時自動匯出保留
- 模擬器需 JDK 21+，若系統 Java 過舊，script 會自動改用 Homebrew 的 `openjdk@21`
- 只跑前端不開模擬器：`npm run dev:web`

**開發用管理員帳號**：模擬器種子資料已內建，密碼 `admin123`。

## 部署

推上 `main` 即自動部署——GitHub Actions 會以 repo secrets 建置並發佈到 GitHub Pages。

需要的 repo secrets（Settings → Secrets and variables → Actions）：

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

本機正式建置則讀取 gitignored 的 `.env.production`（欄位同上，參見 `.env.example`）。

Firestore / Storage 安全規則更新後需手動發佈：

```bash
npx firebase-tools login   # 首次
npm run deploy:rules
```

### 正式站新增管理員

Firebase Console → Firestore → `adminPasswords` collection：

- 文件 ID＝密碼的 SHA-256 hex：
  ```bash
  node -e "const c=require('crypto');console.log(c.createHash('sha256').update('你的密碼').digest('hex'))"
  ```
- 欄位：`role`＝`"owner"`（string）、`label`＝`"名字"`（string）

## 常用指令

| 指令 | 用途 |
|------|------|
| `npm run dev` | 模擬器 + Vite 開發環境 |
| `npm run dev:web` | 只跑 Vite 前端 |
| `npm run build` | 正式建置（TypeScript 檢查 + Vite build） |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run deploy:rules` | 發佈 Firestore / Storage 規則 |

## Firestore 集合

| 集合 | 用途 |
|------|------|
| `menuItems` | 菜品 |
| `inventory` | 食材庫存 |
| `orders` | 訂單 |
| `messages` | 留言板 |
| `notices` | 告示看板 |
| `adminPasswords` | 管理員帳號（SHA-256 雜湊） |
| `globalSettings` | 全域設定 |

## 專案文件

- 需求：`Instruction for Kinnoha's Tea 木葉茗茶坊.md`
- 設計規格：`docs/superpowers/specs/`
- 實作計畫：`docs/superpowers/plans/`
