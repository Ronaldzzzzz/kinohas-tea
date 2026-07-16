import { useState, useMemo } from 'react'
import type { MenuItem, InventoryItem } from '../../types'
import type { MasterItem, MasterRecipe } from '../../lib/recipeUtils'
import { craftMenuItemBatch } from '../../lib/firestore'
import { isCrystal } from '../../lib/constants'

// ─── Types ─────────────────────────────────────────────────────

interface CraftNode {
  id: number
  name: string
  icon?: string
  neededTotal: number
  invItem?: InventoryItem
  fromStock: number   // deduct this many from invItem.stock
  fromSub: number     // this many must come from sub-recipe expansion
  children: CraftNode[]
  sufficient: boolean
}

interface Props {
  menuItem: MenuItem
  inventoryItems: InventoryItem[]
  masterItems: Record<number, MasterItem>
  masterRecipes: Record<number, MasterRecipe>
  onClose: () => void
  onCrafted: () => void
}

// ─── Algorithm ─────────────────────────────────────────────────

const MAX_CRAFT_DEPTH = 8

function buildNode(
  itemId: number,
  needed: number,
  inventoryItems: InventoryItem[],
  masterItems: Record<number, MasterItem>,
  masterRecipes: Record<number, MasterRecipe>,
  stockRemaining: Map<string, number>,
  visited: Set<number> = new Set(),
  depth: number = 0
): CraftNode {
  const masterItem = masterItems[itemId]
  const invItem = inventoryItems.find(it => it.recipeIngredientId === itemId)

  // Try to satisfy from stock first
  let fromStock = 0
  let fromSub = needed
  if (invItem) {
    const avail = stockRemaining.get(invItem.id) ?? 0
    fromStock = Math.min(avail, needed)
    stockRemaining.set(invItem.id, avail - fromStock)
    fromSub = needed - fromStock
  }

  // For the deficit, expand sub-recipe if available (guard against cycles and excessive depth)
  const children: CraftNode[] = []
  let sufficient = fromSub === 0

  if (fromSub > 0 && depth < MAX_CRAFT_DEPTH && !visited.has(itemId)) {
    const subRecipe = masterRecipes[itemId]
    if (subRecipe) {
      const nextVisited = new Set(visited)
      nextVisited.add(itemId)
      let allOk = true
      for (const ing of subRecipe.ings) {
        if (isCrystal(ing.i)) continue
        const child = buildNode(ing.i, ing.a * fromSub, inventoryItems, masterItems, masterRecipes, stockRemaining, nextVisited, depth + 1)
        children.push(child)
        if (!child.sufficient) allOk = false
      }
      sufficient = allOk
    }
    // no subRecipe + fromSub > 0 → sufficient remains false
  }

  return {
    id: itemId,
    name: invItem?.name ?? masterItem?.n ?? `#${itemId}`,
    icon: masterItem?.i,
    neededTotal: needed,
    invItem,
    fromStock,
    fromSub,
    children,
    sufficient,
  }
}

function calcTopLevel(
  recipeId: number,
  craftQty: number,
  inventoryItems: InventoryItem[],
  masterItems: Record<number, MasterItem>,
  masterRecipes: Record<number, MasterRecipe>
) {
  const recipe = masterRecipes[recipeId]
  if (!recipe) return { nodes: [], deductions: [], allSufficient: false }

  const stockRemaining = new Map<string, number>(inventoryItems.map(it => [it.id, it.stock]))

  const nodes = recipe.ings
    .filter(ing => !isCrystal(ing.i))
    .map(ing => buildNode(ing.i, ing.a * craftQty, inventoryItems, masterItems, masterRecipes, stockRemaining))

  const deductions: { inventoryItemId: string; amount: number }[] = []
  for (const inv of inventoryItems) {
    const used = inv.stock - (stockRemaining.get(inv.id) ?? inv.stock)
    if (used > 0) deductions.push({ inventoryItemId: inv.id, amount: used })
  }

  return { nodes, deductions, allSufficient: nodes.every(n => n.sufficient) }
}

function calcMax(
  recipeId: number | undefined,
  inventoryItems: InventoryItem[],
  masterItems: Record<number, MasterItem>,
  masterRecipes: Record<number, MasterRecipe>
): number {
  if (!recipeId || !masterRecipes[recipeId]) return 0
  let lo = 0, hi = 999
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (calcTopLevel(recipeId, mid, inventoryItems, masterItems, masterRecipes).allSufficient) lo = mid
    else hi = mid - 1
  }
  return lo
}

// ─── Component ─────────────────────────────────────────────────

export default function CraftModal({ menuItem, inventoryItems, masterItems, masterRecipes, onClose, onCrafted }: Props) {
  const maxCraft = useMemo(
    () => calcMax(menuItem.recipeId, inventoryItems, masterItems, masterRecipes),
    [menuItem.recipeId, inventoryItems, masterItems, masterRecipes]
  )

  const [qty, setQty] = useState(Math.max(1, maxCraft))
  const [crafting, setCrafting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { nodes, deductions, allSufficient } = useMemo(
    () => menuItem.recipeId
      ? calcTopLevel(menuItem.recipeId, qty, inventoryItems, masterItems, masterRecipes)
      : { nodes: [], deductions: [], allSufficient: false },
    [menuItem.recipeId, qty, inventoryItems, masterItems, masterRecipes]
  )

  async function handleCraft() {
    if (!allSufficient || qty <= 0 || crafting) return
    setCrafting(true)
    setError(null)
    try {
      await craftMenuItemBatch(menuItem.id, qty, deductions)
      onCrafted()
      onClose()
    } catch (err) {
      console.error('製作失敗:', err)
      setError('製作失敗，請確認庫存是否足夠。')
    } finally {
      setCrafting(false)
    }
  }

  function renderNode(node: CraftNode, level: number, keyPrefix: string) {
    const key = `${keyPrefix}-${node.id}`
    return (
      <div key={key} className="flex flex-col">
        <div
          className={`flex items-center gap-1.5 py-1 rounded text-sm ${
            !node.sufficient ? 'bg-[#3a1e1e]/50' : ''
          }`}
          style={{ paddingLeft: `${0.5 + level * 1.5}rem`, paddingRight: '0.5rem' }}
        >
          {level > 0 && <span className="text-[#4a3820] text-xs flex-shrink-0 select-none">└─</span>}
          {node.icon ? (
            <img src={`https://xivapi.com${node.icon}`} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}
          <span className={`flex-1 min-w-0 truncate ${node.sufficient ? 'text-[#d4c090]' : 'text-[#ef9a9a]'}`}>
            {node.name}
          </span>
          <span className="flex items-center gap-1 font-mono text-xs flex-shrink-0 ml-1">
            {node.fromStock > 0 && (
              <span className="text-[#81c784]">-{node.fromStock}</span>
            )}
            {node.fromSub > 0 && node.children.length > 0 && (
              <span className="text-[#c9a55a]">↓{node.fromSub}</span>
            )}
            {node.fromSub > 0 && node.children.length === 0 && (
              <span className="text-[#ef9a9a]">缺{node.fromSub}</span>
            )}
            <span className="text-[#4a3820]">/{node.neededTotal}</span>
          </span>
        </div>
        {node.children.map((child, i) => renderNode(child, level + 1, `${key}-${i}`))}
      </div>
    )
  }

  const hasRecipe = !!menuItem.recipeId && !!masterRecipes[menuItem.recipeId]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1e1a10] border border-[#6a5030] rounded-lg p-5 w-full max-w-md flex flex-col gap-4 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="flex items-center gap-3">
          {menuItem.imageUrl && (
            <img src={menuItem.imageUrl} alt={menuItem.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
          )}
          <div>
            <h3 className="text-[#c9a55a] font-serif tracking-wide text-base">
              製作：{menuItem.alias || menuItem.name}
            </h3>
            <p className="text-[#9a8a70] text-xs mt-0.5">
              現有成品庫存：<span className="text-[#d4c090]">{menuItem.stock ?? 0}</span>
            </p>
          </div>
        </div>

        {/* 食材樹 */}
        {!hasRecipe ? (
          <p className="text-[#9a8a70] text-sm">無法載入配方資料。</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#9a8a70]">食材需求</p>
              <div className="flex gap-2 text-[10px] leading-none">
                <span className="text-[#81c784]">綠: 庫存扣除</span>
                <span className="text-[#c9a55a]">金: 展開次層</span>
                <span className="text-[#ef9a9a]">紅: 不足</span>
              </div>
            </div>
            <div className="flex flex-col bg-[#1a1510] rounded border border-[#3a2c1a] py-1">
              {nodes.map((node, i) => renderNode(node, 0, `r${i}`))}
            </div>
          </div>
        )}

        {/* 數量輸入 */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-[#9a8a70] whitespace-nowrap">製作數量</label>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-[#2d1e12] border border-[#8b6b4a] text-[#e8d5b5] rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-[#c9a55a]"
          />
          <span className="text-xs text-[#9a8a70]">最多可製作 {maxCraft} 份</span>
        </div>

        {error && <p className="text-[#ef9a9a] text-xs">{error}</p>}

        {/* 按鈕列 */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-sm text-[#9a8a70] hover:text-[#d4c090] px-4 py-1.5 transition-colors">
            取消
          </button>
          <button
            onClick={handleCraft}
            disabled={!allSufficient || qty <= 0 || crafting}
            className="text-sm bg-[#c9a55a] text-[#1a1510] font-semibold px-5 py-1.5 rounded hover:bg-[#d4af7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {crafting ? '製作中…' : `確認製作 ×${qty}`}
          </button>
        </div>
      </div>
    </div>
  )
}
