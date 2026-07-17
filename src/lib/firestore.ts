import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  increment,
  writeBatch,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { MenuItem, InventoryItem, Message, Reply, NoticeConfig, Order, GlobalSettings, PhotoUrl, StaffPermissions, Popup } from '../types'
import { DEFAULT_STAFF_PERMISSIONS } from '../types'

// ─── Menu Items ────────────────────────────────────────────────

export async function getMenuItems(): Promise<MenuItem[]> {
  const q = query(collection(db, 'menuItems'), orderBy('order'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem))
}

export async function addMenuItem(
  data: Omit<MenuItem, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'menuItems'), data)
  if (data.ingredients && data.ingredients.length > 0) {
    await syncInventoryFromIngredients(data.name, data.ingredients)
  }
  return ref.id
}

export async function updateMenuItem(
  id: string,
  data: Partial<Omit<MenuItem, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'menuItems', id), data)
  if (data.ingredients && data.ingredients.length > 0) {
    // 獲取目前的名稱，如果 data 沒給就從既有資料抓 (這裡簡化為如果有傳 name 就用新的)
    const name = data.name || (await getMenuItems()).find(i => i.id === id)?.name || '未知品項'
    await syncInventoryFromIngredients(name, data.ingredients)
  }
}

async function syncInventoryFromIngredients(itemName: string, ingredients: MenuItem['ingredients']): Promise<void> {
  if (!ingredients || ingredients.length === 0) return
  const inventoryItems = await getInventoryItems()
  const batch = writeBatch(db)
  let hasOps = false
  const processedIds = new Set<number>() // 追蹤此批次已處理的 ID

  // 讀取主資料以解析食材真實名稱與 icon 路徑
  let masterItems: Record<string, { n: string; i?: string }> = {}
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/master_items.json`)
    if (res.ok) {
      masterItems = await res.json()
    }
  } catch (error) {
    console.error('Failed to load master_items.json in sync logic:', error)
  }

  for (const ing of ingredients) {
    if (processedIds.has(ing.id)) continue
    processedIds.add(ing.id)

    // 比對既存食材 (透過 recipeIngredientId 或舊有名稱)
    const existingItem = inventoryItems.find(
      (item) => item.recipeIngredientId === ing.id || item.name === `食材 #${ing.id}`
    )

    const masterData = masterItems[ing.id.toString()]
    const realName = masterData ? masterData.n : `食材 #${ing.id}`
    const iconPath = masterData ? masterData.i : undefined

    if (!existingItem) {
      const newRef = doc(collection(db, 'inventory'))
      const newItemData: Omit<InventoryItem, 'id'> = {
        name: realName,
        stock: 0,
        note: `${itemName}`,
        recipeIngredientId: ing.id,
      }
      if (iconPath) newItemData.icon = iconPath

      batch.set(newRef, newItemData)
      hasOps = true
    } else {
      const updates: Partial<Omit<InventoryItem, 'id'>> = {}
      let needsUpdate = false

      if (existingItem.name === `食材 #${ing.id}` && masterData) {
        updates.name = realName
        needsUpdate = true
      }
      if (!existingItem.icon && iconPath) {
        updates.icon = iconPath
        needsUpdate = true
      }
      if (existingItem.recipeIngredientId !== ing.id) {
        updates.recipeIngredientId = ing.id
        needsUpdate = true
      }

      // 更新備註，僅保留品項名稱
      if (!existingItem.note || existingItem.note.includes('需求')) {
        updates.note = `${itemName}`
        needsUpdate = true
      }

      if (needsUpdate) {
        batch.update(doc(db, 'inventory', existingItem.id), updates)
        hasOps = true
      }
    }
  }

  if (hasOps) {
    await batch.commit()
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'menuItems', id))
}

// ─── Inventory ─────────────────────────────────────────────────

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const snap = await getDocs(collection(db, 'inventory'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem))
}

export async function addInventoryItem(
  data: Omit<InventoryItem, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'inventory'), data)
  return ref.id
}

export async function updateInventoryItem(
  id: string,
  data: Partial<Omit<InventoryItem, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'inventory', id), data)
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'inventory', id))
}

export async function deleteInventoryItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const batch = writeBatch(db)
  ids.forEach(id => {
    batch.delete(doc(db, 'inventory', id))
  })
  await batch.commit()
}

// ─── Messages ──────────────────────────────────────────────────

export async function getMessages(): Promise<Message[]> {
  const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'))
  const snap = await getDocs(q)

  const messages = await Promise.all(
    snap.docs.map(async (d) => {
      const repliesSnap = await getDocs(
        query(collection(db, 'messages', d.id, 'replies'), orderBy('timestamp'))
      )
      const replies: Reply[] = repliesSnap.docs.map(
        (r) => ({ id: r.id, ...r.data() } as Reply)
      )
      return { id: d.id, ...d.data(), replies } as Message
    })
  )

  return messages
}

export async function addMessage(data: {
  authorId: string
  serverName: string
  isAnonymous: boolean
  content: string
}): Promise<string> {
  const ref = await addDoc(collection(db, 'messages'), {
    ...data,
    timestamp: serverTimestamp(),
    likes: 0,
    dislikes: 0,
  })
  return ref.id
}

export async function addReply(
  messageId: string,
  data: {
    authorId: string
    serverName: string
    isAnonymous: boolean
    content: string
  }
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'messages', messageId, 'replies'),
    { ...data, timestamp: serverTimestamp() }
  )
  return ref.id
}

export async function likeMessage(
  messageId: string,
  type: 'likes' | 'dislikes'
): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), {
    [type]: increment(1),
  })
}

export async function deleteMessage(messageId: string): Promise<void> {
  // 先刪除子集合 replies，再刪除主文件
  const repliesSnap = await getDocs(
    collection(db, 'messages', messageId, 'replies')
  )
  const batch = writeBatch(db)
  repliesSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'messages', messageId))
  await batch.commit()
}

export async function deleteReply(
  messageId: string,
  replyId: string
): Promise<void> {
  await deleteDoc(doc(db, 'messages', messageId, 'replies', replyId))
}

// ─── Admin Management ──────────────────────────────────────────

export interface AdminRecord {
  id: string
  role: string
  label: string
  permissions?: StaffPermissions
}

export async function getAdmins(): Promise<AdminRecord[]> {
  const snap = await getDocs(collection(db, 'adminPasswords'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminRecord))
}

export async function addAdmin(hash: string, role: 'owner' | 'staff', label: string): Promise<void> {
  const data: { role: string; label: string; permissions?: StaffPermissions } = { role, label }
  if (role === 'staff') data.permissions = DEFAULT_STAFF_PERMISSIONS
  await setDoc(doc(db, 'adminPasswords', hash), data)
}

export async function deleteAdmin(hash: string): Promise<void> {
  await deleteDoc(doc(db, 'adminPasswords', hash))
}

export async function updateAdminPermissions(
  hash: string,
  permissions: StaffPermissions
): Promise<void> {
  await updateDoc(doc(db, 'adminPasswords', hash), { permissions })
}

export function subscribeAdminAccount(
  hash: string,
  onChange: () => void
): () => void {
  return onSnapshot(doc(db, 'adminPasswords', hash), onChange)
}

// ─── Notices ───────────────────────────────────────────────────

export async function getNotices(): Promise<NoticeConfig[]> {
  const q = query(collection(db, 'notices'), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NoticeConfig))
}

export async function updateNotice(id: string, data: Partial<Omit<NoticeConfig, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'notices', id), {
    ...data,
    updatedAt: serverTimestamp()
  })
}

export async function addNotice(data: Omit<NoticeConfig, 'id' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'notices'), {
    ...data,
    updatedAt: serverTimestamp()
  })
  return ref.id
}

export async function deleteNotice(id: string): Promise<void> {
  await deleteDoc(doc(db, 'notices', id))
}

// ─── Orders ────────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
}

export async function addOrder(data: Omit<Order, 'id' | 'timestamp'>): Promise<string> {
  const ref = await addDoc(collection(db, 'orders'), {
    ...data,
    status: 'pending',
    timestamp: serverTimestamp(),
  })
  return ref.id
}

export async function completeOrder(id: string, completedBy?: string): Promise<void> {
  await updateDoc(doc(db, 'orders', id), { status: 'completed', completedBy: completedBy ?? '' })
}

export async function addOrderWithStockDeduction(
  data: Omit<Order, 'id' | 'timestamp'>
): Promise<string> {
  const orderRef = doc(collection(db, 'orders'))
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(
      data.items.map(item => tx.get(doc(db, 'menuItems', item.menuItemId)))
    )
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      const snapData = snaps[i].data()
      if (snapData?.unlimited) continue
      const currentStock = (snapData?.stock ?? 0) as number
      if (currentStock < item.quantity) {
        throw new Error(`${item.menuItemName} 庫存不足`)
      }
    }
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      const snapData = snaps[i].data()
      if (snapData?.unlimited) continue
      tx.update(doc(db, 'menuItems', item.menuItemId), {
        stock: increment(-item.quantity),
      })
    }
    tx.set(orderRef, {
      ...data,
      status: 'pending',
      timestamp: serverTimestamp(),
    })
  })
  return orderRef.id
}

export async function deleteOrderAndRestoreStock(order: Order): Promise<void> {
  const menuSnaps = await Promise.all(
    order.items.map(item => getDoc(doc(db, 'menuItems', item.menuItemId)))
  )
  const batch = writeBatch(db)
  batch.delete(doc(db, 'orders', order.id))
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i]
    if (menuSnaps[i].data()?.unlimited) continue
    batch.update(doc(db, 'menuItems', item.menuItemId), {
      stock: increment(item.quantity),
    })
  }
  await batch.commit()
}

export async function craftMenuItemBatch(
  menuItemId: string,
  addQty: number,
  deductions: { inventoryItemId: string; amount: number }[]
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'menuItems', menuItemId), { stock: increment(addQty) })
  for (const d of deductions) {
    batch.update(doc(db, 'inventory', d.inventoryItemId), {
      stock: increment(-d.amount),
    })
  }
  await batch.commit()
}

export async function deleteOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', id))
}

// ─── Global Settings ────────────────────────────────────────────

let _settingsCache: GlobalSettings | null = null

function mapSettingsData(data: Record<string, unknown> | undefined): GlobalSettings {
  return {
    address: (data?.address as string) ?? '',
    introText: (data?.introText as string) ?? '',
    orderCooldownMinutes: (data?.orderCooldownMinutes as number) ?? 30,
    photoUrls: ((data?.photoUrls ?? []) as (string | PhotoUrl)[])
      .map(entry => typeof entry === 'string' ? { url: entry } : entry),
    realModeEnabled: (data?.realModeEnabled as boolean) ?? false,
    marqueeText: (data?.marqueeText as string) ?? '',
  }
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  if (_settingsCache) return _settingsCache
  const docSnap = await getDoc(doc(db, 'settings', 'global'))
  _settingsCache = mapSettingsData(docSnap.exists() ? docSnap.data() : undefined)
  return _settingsCache
}

export async function updateGlobalSettings(data: Partial<GlobalSettings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'global'), data, { merge: true })
  _settingsCache = null
}

/**
 * 即時訂閱全域設定；用於長駐不隨路由重掛載的元件(Navbar/Footer)，
 * 讓後台儲存後不需整頁重整就能反映最新值(一次性 getGlobalSettings 在這類元件上只會讀到掛載當下的舊值)。
 */
export function subscribeGlobalSettings(onChange: (settings: GlobalSettings) => void): () => void {
  return onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
    const settings = mapSettingsData(docSnap.exists() ? docSnap.data() : undefined)
    _settingsCache = settings
    onChange(settings)
  })
}

// ─── Popups ─────────────────────────────────────────

export async function getPopups(): Promise<Popup[]> {
  const snap = await getDocs(query(collection(db, 'popups'), orderBy('order')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Popup))
}

export async function getEnabledPopups(): Promise<Popup[]> {
  const all = await getPopups()
  return all.filter(p => p.enabled)
}

export async function addPopup(data: Omit<Popup, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'popups'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function updatePopup(id: string, data: Partial<Omit<Popup, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'popups', id), data)
}

export async function deletePopup(id: string): Promise<void> {
  await deleteDoc(doc(db, 'popups', id))
}

// ─── 留言遮蔽 ─────────────────────────────────────────

export async function setMessageMask(messageId: string, masked: boolean, maskNote?: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), { masked, maskNote: maskNote ?? '' })
}

export async function setReplyMask(messageId: string, replyId: string, masked: boolean, maskNote?: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId, 'replies', replyId), { masked, maskNote: maskNote ?? '' })
}
