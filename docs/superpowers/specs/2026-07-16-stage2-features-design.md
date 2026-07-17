# Stage 2: 功能新增 — Design Spec

日期: 2026-07-16
範圍: 規劃書「階段二：功能新增」— 惡搞彈窗、彈窗圖片上傳與壓縮、留言遮蔽。
前提: Stage 1 已上線(GitHub Pages + Firebase 後端)。安全模型維持現行密碼驗證(使用者已接受 request.auth != null 的已知風險)。

## 1. 資料模型與後台管理

### popups collection(新增)

| 欄位 | 型別 | 說明 |
|------|------|------|
| `type` | `'entry' \| 'floating'` | 進版彈窗 / 可拖動視窗 |
| `imageUrl` | `string?` | Storage 圖片 URL(floating 可純文字) |
| `text` | `string?` | 文字內容(floating 用;entry 選填) |
| `linkUrl` | `string?` | 點擊圖片開新分頁的連結 |
| `enabled` | `boolean` | 啟用開關 |
| `order` | `number` | 排序 |
| `createdAt` | `Timestamp` | 建立時間 |

Firestore rules: 公開可讀(前台要顯示)、寫入需 `request.auth != null`(與其他管理集合一致)。

### 後台「彈窗管理」分頁

- 掛入現有 AdminPage tab 系統,納入 TabKey 權限模型(staff 權限可設定)
- 功能: 新增(選 type、上傳圖、填文字/連結)、啟用開關、刪除、排序
- 進版彈窗多張啟用時,前台隨機挑一張;floating 啟用的全部出現

### 圖片壓縮(共用 util)

- 上傳時前端 canvas 轉 WebP,長邊上限 1200px,品質 0.8 起,檔案 >200KB 逐階降品質(下限 0.5)
- 做成 `src/utils/imageCompress.ts` 共用函式;彈窗上傳必經壓縮
- 不更動現有 PhotoManager 裁切流程(可後續自行接上)

## 2. 前台彈窗行為

### 進版彈窗(Shopee 式)

- 每次進站(頁面載入)都彈;半透明黑遮罩+置中大圖
- 僅能點右上角小「X」關閉;點遮罩、Esc 無效(惡搞重點)
- 有 `linkUrl` 時點圖開新分頁
- 僅前台路由(`/`、`/guestbook`)出現;`/admin` 不彈

### 可拖動視窗(zutomayo 式)

- 啟用的視窗進站全數出現,位置隨機散落(避開畫面中央,不擋 Hero 主文案)
- 復古視窗外框: 標題列+關閉鈕;標題列可拖曳(pointer events,滑鼠+觸控),點擊置頂
- 關閉即消失;重整重新出現(不記憶狀態)
- 手機(<640px): 尺寸縮小,同時最多 2 個

### 實作結構

- `PopupLayer` 掛在 App 層(admin 路由除外),內含 `EntryPopup`、`FloatingWindow`
- 拖曳自行實作,不引入新套件

## 3. 留言遮蔽

### 資料

- `messages` 文件新增 `masked: boolean`、`maskNote?: string`;回覆(replies)同構,可各自遮蔽

### 前台呈現(全用戶可見)

- 內文黑條化: 保留原文長度,黑底黑字+`select-none`,視覺如被塗黑
- 標籤「▓ 此留言已被店家遮蔽」
- `maskNote` 存在時顯示「店家註: …」(茶綠色小字)
- 按讚/倒讚等互動照常

### 後台

- 留言審核(MessageManager)每則留言/回覆加「遮蔽/解除」按鈕;遮蔽時可填/改註解

### 已知限制(使用者已知悉)

純前端遮蔽,原文仍存於 Firestore 文件,開發者工具可讀取。與現行安全模型同層級的接受風險。

## 不做的事

- 彈窗顯示頻率控制(cookie/localStorage 記憶)— 刻意每次都彈
- 真隱藏遮蔽內容(需伺服器端)
- PhotoManager 全面改壓縮(僅提供共用 util,彈窗先用)

## 驗收方式

1. `npm run build` 通過。
2. 後台: 建立 entry 與 floating 彈窗各一(含圖片上傳,確認產出 WebP 且 <200KB)、開關與刪除正常。
3. 前台: 進站必彈 entry(僅 X 可關)、floating 隨機散落可拖曳可關閉、手機寬度最多 2 個 floating。
4. 留言遮蔽: 後台遮蔽+註解 → 前台黑條+標籤+店家註即時呈現;解除後恢復。
5. `/admin` 路由不出現任何彈窗。

## Stage 2 完成狀態(2026-07-17)

7 個 Task 全數完成並個別通過 review(T5/T6 因平台服務中斷改由 controller 直接審查/實作,證據見 .superpowers/sdd/progress.md)。自動化驗證: 測試 5/5、build 綠、安全規則行為經模擬器 REST 探測確認(未登入寫 popups 403、未登入解除遮蔽 403、未登入按讚 200、公開讀 popups 200)。互動走查由使用者本機執行後手動 push 部署上線。後續修正依使用者回饋進行。
