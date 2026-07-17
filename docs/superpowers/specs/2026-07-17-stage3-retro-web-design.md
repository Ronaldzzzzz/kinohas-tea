# Stage 3 第一批：90 年代懷舊網頁元素 — Design Spec

日期: 2026-07-17
範圍: 規劃書「階段三：風格差異化與全面優化」的第一批交付 — 側欄假廣告、跑馬燈、訪客計數器。
不含: 本次會話已直接完成的三個獨立修正(彈窗上傳按鈕樣式、後台留言遮蔽可讀可編、首頁宣傳照輪播)— 已 commit,非本 spec 範圍。
前提: Stage 1、Stage 2 已上線。

## 背景

規劃書要求「惡搞型的台式風格，但卻是認真的茶莊」。目前站點風格已走向現代簡約茶行路線(仿 sungshantea.com),但規劃書明確點名的惡搞元素除 Stage 2 彈窗外尚未落地。使用者指定方向: 更多 90 年代網站懷舊元素,具體為左右直幅假廣告、跑馬燈滾動文字、訪客計數器三項。

## 目標

1. 左右直幅假廣告(仿早期入口網站 skyscraper ad),後台可管理圖片與連結。
2. 跑馬燈滾動文字,獨立欄位,後台可編輯。
3. 訪客計數器,真實累加,復古電子鐘數字樣式,放在 Footer。

## 資料模型

### popups collection 擴充

新增 `type: 'banner'`,沿用既有 `imageUrl`/`linkUrl`/`enabled`/`order` 欄位,新增 `position: 'left' | 'right'`(僅 banner 類型使用)。

```ts
export interface Popup {
  id: string
  type: 'entry' | 'floating' | 'banner'
  position?: 'left' | 'right'   // type === 'banner' 時必填
  imageUrl?: string
  text?: string
  linkUrl?: string
  enabled: boolean
  order: number
  createdAt: Timestamp
}
```

Firestore rules 不需變動(popups 已是公開讀/登入寫)。

### globalSettings 擴充

新增 `marqueeText?: string`。空字串或未設定時前台不顯示跑馬燈。

### siteStats collection(新增)

單一文件 `siteStats/hitCounter`,欄位 `count: number`。首次不存在時視為 0。

```
match /siteStats/{docId} {
  allow read: if true;
  allow write: if true;   // 訪客進站即需遞增，公開寫入僅限此單一計數欄位
}
```

安全考量: 允許公開寫入僅此一份計數文件,寫入操作固定為「+1」(前端用 Firestore transaction 保證原子遞增,不接受任意數值覆蓋)。惡意灌數字的風險與現有「按讚可被任何人觸發」風險同等級,可接受。

## 前台元件

### SidebarBanners

- 位置: 固定(`fixed`)於視窗左右兩側,桌面 ≥1024px 才顯示,窄螢幕隱藏(避免遮擋內容)
- 內容: 抓 `enabled && type === 'banner'` 的 popups,依 `position` 分左右;同側多筆時垂直排列(向下堆疊,超出視窗高度可捲動或僅取前 2 筆,避免疊到看不到)
- 樣式: 復古感窄框(閃爍外框動畫、`⚡NEW⚡`/`熱門`風格小標),點擊圖片開新分頁(`linkUrl`)
- `/admin` 路由不顯示(比照 PopupLayer 現行邏輯)

### MarqueeBar

- 位置: Navbar 正下方,橫跨滿版(比照 Hero/highlights 現有的 `-mx-[50vw] w-screen` 滿版手法)
- 內容: `globalSettings.marqueeText`,CSS `@keyframes` 向左連續滾動(非原生 `<marquee>` 標籤,已廢棄且無障礙性差,用等效 CSS 動畫達成相同視覺效果)
- 未設定文字時整個 bar 不渲染(不佔版面)
- 僅首頁顯示(比照現有 Hero 僅在 MenuPage 出現的範圍)

### HitCounter

- 位置: Footer 內,現有三欄下方新增一列
- 樣式: 黑底、等寬字型、綠色或琥珀色數字,仿早期 LCD 計數器,格式「您是本站第 ▓▓▓▓▓▓ 位訪客」,數字以 6 位補零
- 邏輯: 元件掛載時對 `siteStats/hitCounter` 執行一次 transaction `count + 1`,讀取結果顯示;`sessionStorage` 記一個 flag 避免同一瀏覽器 session 內重整/切頁重複計數(如 SPA 換頁不算新訪客,但關閉分頁重開算)

## 後台管理

### PopupManager 擴充

- `type` 下拉加「側欄廣告」選項
- 選 banner 類型時額外顯示 `position`(左/右)下拉
- 列表沿用現有卡片,顯示 type 標籤時 banner 額外顯示 position

### GlobalSettingsManager 擴充

- 新增一個文字輸入框「跑馬燈文字」,綁定 `marqueeText`,沿用現有儲存邏輯

## 不做的事

- 訪客計數器造假數字(維持真實累加的設計決策)
- `<marquee>` 原生標籤(棄用且無障礙性差,CSS 動畫等效替代)
- 側欄廣告在窄螢幕的替代呈現(直接隱藏,不做行動版變體)
- 第二批 90 年代元素(訪客計數器/跑馬燈/側欄廣告以外,如留言簿翻頁 GIF 等)— 視這批成果再排

## 驗收方式

1. `npm run build`、`npm run test` 通過。
2. 後台: 新增左右各一筆 banner 彈窗(含圖+連結),桌面寬度確認固定於視窗兩側正確位置;填寫跑馬燈文字,首頁確認滾動顯示;清空文字確認 bar 消失。
3. 前台: 訪客計數器進站遞增,重整同一 session 不重複計數,關閉分頁重開後再次遞增;窄螢幕(<1024px)確認側欄廣告隱藏。
4. `/admin` 路由不出現側欄廣告(比照彈窗排除邏輯)。
