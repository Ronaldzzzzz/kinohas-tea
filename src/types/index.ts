import { Timestamp } from 'firebase/firestore'

export type MenuCategory = 'appetizer' | 'main' | 'dessert' | 'drink' | 'set'

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  appetizer: '開胃菜',
  main: '主食',
  dessert: '甜品',
  drink: '飲品',
  set: '套餐',
}

export const CATEGORY_ORDER: MenuCategory[] = ['appetizer', 'main', 'dessert', 'drink', 'set']

export interface MenuItem {
  id: string
  category: MenuCategory
  name: string
  alias?: string
  description: string
  price: number
  imageUrl: string
  available: boolean
  unlimited?: boolean
  order: number
  stock?: number
  recipeId?: number
  ingredients?: RecipeIngredient[]
}

export interface InventoryItem {
  id: string
  name: string
  icon?: string
  stock: number
  note: string
  recipeIngredientId?: number
}

export interface RecipeIngredient {
  id: number
  amount: number
}

export interface Recipe {
  id: number
  name_zh: string
  icon: string
  ingredients: RecipeIngredient[]
}

export interface Reply {
  id: string
  authorId: string
  serverName: string
  isAnonymous: boolean
  content: string
  timestamp: Timestamp
  masked?: boolean
  maskNote?: string
}

export interface Message {
  id: string
  authorId: string
  serverName: string
  isAnonymous: boolean
  content: string
  timestamp: Timestamp
  likes: number
  dislikes: number
  replies?: Reply[]
  masked?: boolean
  maskNote?: string
}

// ─── Admin Permissions ─────────────────────────────────────────

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

export interface AdminSession {
  role: 'owner' | 'staff'
  label: string
  hash: string
  permissions: StaffPermissions
}

export interface NoticeConfig {
  id: string
  emoji: string
  lines: string[]
  isActive: boolean
  updatedAt: Timestamp | Date
}

// 點餐訂單
export interface Order {
  id: string
  customerName: string        // 客人 ID 名稱
  items: { menuItemId: string; menuItemName: string; quantity: number }[]
  timestamp: Timestamp
  note?: string
  status?: 'pending' | 'completed'
  completedBy?: string        // 完成此訂單的管理員標籤

}

/**
 * 裁切參數，所有值均為相對於原圖的百分比（0–100）
 * x, y: 裁切起點（左上角）
 * width, height: 裁切區域大小
 */
export interface CropData {
  x: number      // 0-100 百分比，相對於原圖寬度
  y: number      // 0-100 百分比，相對於原圖高度
  width: number  // 0-100 百分比，裁切區域寬度
  height: number // 0-100 百分比，裁切區域高度
}

export interface PhotoUrl {
  url: string
  cropData?: CropData
}

// 全局設定
export interface GlobalSettings {
  address: string             // 餐廳地址（顯示於 Navbar）
  introText?: string          // 菜單頁介紹文字（顯示於注意事項上方）
  orderCooldownMinutes: number // 點餐冷卻分鐘數（預設 30）
  photoUrls: PhotoUrl[]       // 宣傳全身照（含可選裁切資料）
  realModeEnabled?: boolean   // true = 真實庫存連動模式
  marqueeText?: string         // 首頁跑馬燈文字，留空則不顯示
  entryPopupCount?: number     // 進版彈窗同時顯示數量：-1=全部隨機不重疊，0=不顯示，1-6=固定排列，預設 1
}

// 彈窗(進版廣告 / 可拖動視窗)
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
