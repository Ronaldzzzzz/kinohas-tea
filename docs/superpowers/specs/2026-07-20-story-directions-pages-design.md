# 本店歷史 + 交通指引頁面 設計

## 背景

前台目前只有首頁(菜單)、留言板、後台三個路由。要新增兩個靜態內容頁：

- **本店歷史**：店主照片 + 幹話介紹
- **交通指引**：遊戲內地圖(圖片) + 說明文字 + 現有地址欄位

兩頁內容（照片/文字/地圖）皆需後台可編輯，但版面格式寫死在程式碼裡，不做成通用 CMS。

## 資料模型

沿用現有 `settings/{id}` collection（`firestore.rules` 已允許登入者寫入、任何人讀取，不需改規則）。

```ts
// types/index.ts 新增

export interface StorySection {
  title: string
  text: string
  imageUrl?: string
}

// settings/story 文件內容
export interface StoryContent {
  sections: [StorySection, StorySection, StorySection] // 固定三個，第一個的 imageUrl 由後台表單強制必填
}

// settings/directions 文件內容
export interface DirectionsContent {
  title: string
  text: string
  mapImageUrl?: string   // 遊戲內地圖截圖，圖片上傳
}
```

地址不重複儲存，交通指引頁直接讀現有 `GlobalSettings.address`（`subscribeGlobalSettings` 或一次性 `getGlobalSettings`）。

## firestore.ts 新增函式

比照 `getGlobalSettings`/`updateGlobalSettings` 的一次性讀取模式（這兩頁流量低，不需要 `onSnapshot` 即時訂閱）：

```ts
export async function getStoryContent(): Promise<StoryContent>
export async function updateStoryContent(data: StoryContent): Promise<void>

export async function getDirectionsContent(): Promise<DirectionsContent>
export async function updateDirectionsContent(data: DirectionsContent): Promise<void>
```

各自搭配 `mapXxxData` 轉換函式提供預設值（未建立文件時的 fallback，比照 `mapSettingsData`）。

## 圖片上傳

沿用 `compressImage` + Firebase Storage，路徑：

- `story-images/{timestamp}.webp`（3 張，section 各一）
- `directions-images/{timestamp}.webp`（1 張，地圖）

沿用 `PopupManager.tsx` 既有的「換圖上傳成功後才刪除舊檔」邏輯，避免上傳失敗把舊圖清掉。

## 後台

新增一個 tab「頁面內容」：

- `types/index.ts`：`TabKey` 新增 `'pages'`；`DEFAULT_STAFF_PERMISSIONS` 新增 `pages: { write: false, delete: false }`
- `PermissionModal.tsx`：`TAB_KEYS`/`TAB_LABELS` 加入 `pages: '頁面內容'`
- 新元件 `components/admin/PageContentManager.tsx`：只吃 `canWrite`（比照 `NoticeManager`，這頁沒有「刪除」概念），內含兩個獨立子區塊（本店歷史／交通指引），各自獨立載入、獨立存檔按鈕
  - 本店歷史子區塊：三組「標題 input + 文字 textarea + 圖片上傳」表單，section 1 圖片為必填(送出前檢查)，section 2/3 圖片選填
  - 交通指引子區塊：標題 input + 地圖圖片上傳 + 說明文字 textarea；下方唯讀顯示目前 `GlobalSettings.address`，附一行提示「地址請至系統設定調整」
- `AdminPage.tsx`：
  - `tabs` 陣列新增 `{ key: 'pages', label: '頁面內容' }`
  - `visibleTabs` 沿用既有 `canWrite(session, permTab)` 邏輯
  - 分頁頁籤列 class 加 `flex-wrap`（tab 變多，避免橫向擠爆）
  - 新增 `{tab === 'pages' && <PageContentManager canWrite={canWrite(session, 'pages')} />}`

## 前台

- 新增 `src/pages/StoryPage.tsx`：讀 `getStoryContent()`，固定渲染三個 section（標題 + 文字 + 有圖才顯示圖片），loading 態文字比照 `GuestbookPage` 的 `載入中…`
- 新增 `src/pages/DirectionsPage.tsx`：讀 `getDirectionsContent()` + `getGlobalSettings()`（或 `subscribeGlobalSettings` 拿地址），渲染標題 + 地圖圖片 + 說明文字 + 地址區塊
- `App.tsx`：新增路由 `/story`、`/directions`
- `Navbar.tsx`：在「首頁」與「留言板」的 `NavLink` 之間插入「本店歷史」「交通指引」兩個 `NavLink`，樣式沿用既有 `linkClass`

## 不做的事

- 不做成通用 CMS（不支援新增/刪除 section、不支援任意排版）
- 交通指引不接 Google Maps 嵌入（遊戲內地址用靜態圖）
- 兩頁皆不用即時訂閱，一次性讀取即可
- 不做圖片裁切（沿用現有 `compressImage` 純壓縮，不套用 `CropTool`）
