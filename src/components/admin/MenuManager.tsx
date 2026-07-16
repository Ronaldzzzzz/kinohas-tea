import { useEffect, useState } from 'react'
import {
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getInventoryItems,
} from '../../lib/firestore'
import type { MenuItem, MenuCategory, InventoryItem } from '../../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../types'
import ItemSearchBox from './ItemSearchBox'
import RecipeTreeSelector from './RecipeTreeSelector'
import CraftModal from './CraftModal'
import { getRecipeTree } from '../../lib/recipeUtils'
import type { MasterItem, MasterRecipe, RecipeTreeNode } from '../../lib/recipeUtils'

const EMPTY_FORM = {
  name: '',
  alias: '',
  description: '',
  price: 0,
  category: 'drink' as MenuCategory,
  imageUrl: '',
  available: true,
  unlimited: false,
  stock: 0,
  order: 0,
  recipeId: undefined as number | undefined,
  ingredients: [] as MenuItem['ingredients'],
}

interface Props {
  canWrite: boolean
  canDelete: boolean
}

export default function MenuManager({ canWrite, canDelete }: Props) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [craftTarget, setCraftTarget] = useState<MenuItem | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  const [masterData, setMasterData] = useState<{
    items: Record<number, MasterItem>;
    recipes: Record<number, MasterRecipe>;
  } | null>(null)

  // 樹狀勾選狀態
  const [recipeTree, setRecipeTree] = useState<RecipeTreeNode | null>(null)
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<number>>(new Set())

  async function load() {
    setLoading(true)
    const [data, inv] = await Promise.all([getMenuItems(), getInventoryItems()])
    setItems(data)
    setInventoryItems(inv)
    setLoading(false)
  }

  useEffect(() => { 
    load() 
    async function loadMasterData() {
      try {
        const [itemsRes, recipesRes] = await Promise.all([
          fetch('/Full-Moon-Bistro-pages/data/master_items.json'),
          fetch('/Full-Moon-Bistro-pages/data/master_recipes.json')
        ])
        const [items, recipes] = await Promise.all([
          itemsRes.json(),
          recipesRes.json()
        ])
        setMasterData({ items, recipes })
      } catch (err) {
        console.error('Failed to load master data:', err)
      }
    }
    loadMasterData()
  }, [])

  function startEdit(item: MenuItem) {
    setEditing(item)
    setForm({
      name: item.name,
      alias: item.alias || '',
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl,
      available: item.available,
      unlimited: item.unlimited ?? false,
      stock: item.stock ?? 0,
      order: item.order,
      recipeId: item.recipeId || undefined,
      ingredients: item.ingredients || []
    })

    if (masterData && item.recipeId) {
      const tree = getRecipeTree(item.recipeId, 1, masterData.items, masterData.recipes)
      setRecipeTree(tree)
      setSelectedIngredientIds(new Set(item.ingredients?.map(ing => ing.id) || []))
    } else {
      setRecipeTree(null)
      setSelectedIngredientIds(new Set())
    }

    setShowForm(true)
  }

  function startNew() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, order: items.length })
    setRecipeTree(null)
    setSelectedIngredientIds(new Set())
    setShowForm(true)
  }

  function handleSelectItem(id: number, item: MasterItem) {
    let tree: RecipeTreeNode | null = null
    const selectedIds = new Set<number>()
    
    if (masterData && masterData.recipes[id]) {
      tree = getRecipeTree(id, 1, masterData.items, masterData.recipes)
      
      const collectValidIds = (node: RecipeTreeNode) => {
        const isCrystal = node.id >= 2 && node.id <= 19
        if (!isCrystal && node.id !== id) {
          selectedIds.add(node.id)
        }
        node.ingredients?.forEach(collectValidIds)
      }
      
      if (tree.ingredients) {
        tree.ingredients.forEach(collectValidIds)
      }
    }

    setForm({
      ...form,
      name: item.n,
      imageUrl: `https://xivapi.com${item.i}`,
      category: 'drink',
      recipeId: id,
      ingredients: []
    })
    setRecipeTree(tree)
    setSelectedIngredientIds(selectedIds)
  }

  const handleToggleIngredient = (id: number) => {
    setSelectedIngredientIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    try {
      // 從樹狀結構中過濾出被勾選的項目並計算總量
      const selectedIngredients: MenuItem['ingredients'] = []
      if (recipeTree) {
        const collectSelected = (node: RecipeTreeNode) => {
          if (selectedIngredientIds.has(node.id)) {
            selectedIngredients.push({ id: node.id, amount: node.amount })
          }
          node.ingredients?.forEach(collectSelected)
        }
        recipeTree.ingredients?.forEach(collectSelected)
      }

      const data = { ...form, ingredients: selectedIngredients }
      if (editing) {
        await updateMenuItem(editing.id, data)
      } else {
        await addMenuItem(data)
      }
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: MenuItem) {
    await updateMenuItem(item.id, { available: !item.available })
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除此品項？')) return
    await deleteMenuItem(id)
    await load()
  }

  const grouped = CATEGORY_ORDER.reduce<Record<MenuCategory, MenuItem[]>>(
    (acc, cat) => ({ ...acc, [cat]: items.filter((i) => i.category === cat) }),
    {} as Record<MenuCategory, MenuItem[]>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-[#9a8a70] text-sm">{items.length} 個品項</span>
        {canWrite && (
          <button
            onClick={startNew}
            className="bg-[#c9a55a] text-[#1a1510] text-sm font-semibold px-4 py-1.5 rounded hover:bg-[#d4af7a] transition-colors"
          >
            ＋ 新增品項
          </button>
        )}
      </div>

      {showForm && canWrite && (
        <form onSubmit={handleSave} className="bg-[#2a2015] border border-[#6a5030] rounded p-4 mb-6 flex flex-col gap-4">
          <h3 className="text-[#c9a55a] text-sm font-semibold border-b border-[#6a5030] pb-2">
            {editing ? '編輯品項' : '新增品項'}
          </h3>

          {!editing && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#9a8a70]">搜尋 FFXIV 資料庫匯入</label>
              <ItemSearchBox onSelect={handleSelectItem} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#9a8a70]">原始名稱 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#c9a55a]">菜單別名 (Alias)</label>
              <input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="例如：錫蘭伯爵紅茶" className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#f4e38e] placeholder-[#6a5030] focus:outline-none focus:border-[#c9a55a]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#9a8a70]">價格 (gil)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required min={0} className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#9a8a70]">庫存數量</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Math.max(0, parseInt(e.target.value) || 0) })} min={0} disabled={form.unlimited} className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a] disabled:opacity-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#9a8a70]">排序</label>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} min={0} className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a]" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9a8a70]">描述</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a] resize-none" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9a8a70]">分類</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MenuCategory })} className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a]">
              {CATEGORY_ORDER.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          {/* 配方樹狀勾選 */}
          {recipeTree && (
            <div className="mt-2 border border-[#4a3820] rounded p-3 bg-[#1a1510]/50">
              <label className="text-xs text-[#c9a55a] block mb-2 font-semibold">
                勾選欲納入「食材管理」的素材：
                <span className="text-[#6a5030] ml-2 font-normal">(已排除碎晶/水晶/簇晶)</span>
              </label>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <RecipeTreeSelector 
                  node={recipeTree} 
                  selectedIds={selectedIngredientIds} 
                  onToggle={handleToggleIngredient} 
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-[#9a8a70] cursor-pointer">
                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="accent-[#c9a55a]" />
                供應中
              </label>
              <label className="flex items-center gap-2 text-xs text-[#c9a55a] cursor-pointer">
                <input type="checkbox" checked={form.unlimited} onChange={(e) => setForm({ ...form, unlimited: e.target.checked })} className="accent-[#c9a55a]" />
                無限量
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-[#9a8a70] hover:text-[#d4c090] px-3 py-1.5">取消</button>
              <button type="submit" disabled={saving} className="bg-[#c9a55a] text-[#1a1510] text-sm font-semibold px-5 py-1.5 rounded hover:bg-[#d4af7a] disabled:opacity-50 transition-colors">
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 品項列表 */}
      {loading ? (
        <p className="text-[#9a8a70] text-sm">載入中…</p>
      ) : (
        CATEGORY_ORDER.map((cat) =>
          grouped[cat].length > 0 ? (
            <div key={cat} className="mb-6">
              <h4 className="text-[#c9a55a] text-xs tracking-widest mb-2 border-b border-[#4a3820] pb-1 uppercase">{CATEGORY_LABELS[cat]}</h4>
              <div className="flex flex-col gap-2">
                {grouped[cat].map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-[#2a2015] border border-[#4a3820] rounded p-2.5">
                    <div className="w-10 h-10 rounded bg-[#3a2e18] flex-shrink-0 overflow-hidden">
                      <img 
                        src={item.imageUrl || `https://xivapi.com/i/066000/066313_hr1.png`} 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => (e.currentTarget.src = 'https://xivapi.com/i/066000/066313_hr1.png')}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#d4c090] text-lg font-bold truncate">
                        {item.alias ? (
                          <span className="text-[#f4e38e]">
                            {item.alias}
                            <small className="text-[#6a5030] ml-2 font-normal opacity-70 text-sm">
                              ({item.name})
                            </small>
                          </span>
                        ) : (
                          item.name
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#c9a55a] text-sm font-medium">{item.price} gil</span>
                        {item.unlimited ? (
                          <span className="text-xs px-1.5 py-0.5 rounded border text-[#c9a55a] border-[#6a5030]">∞ 無限量</span>
                        ) : (
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${
                            (item.stock ?? 0) > 0
                              ? 'text-[#81c784] border-[#3a5a3a]'
                              : 'text-[#ef9a9a] border-[#6a3030]'
                          }`}>
                            庫存 {item.stock ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {(item.ingredients?.length ?? 0) > 0 && (
                        <button
                          onClick={() => setCraftTarget(item)}
                          disabled={!masterData}
                          className="text-sm text-[#c9a55a] border border-[#6a5030] hover:bg-[#2a2015] px-3 py-1 rounded transition-colors disabled:opacity-40"
                        >
                          製作
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(item)}
                        className={`text-sm px-3 py-1 rounded-md font-medium transition-colors ${item.available ? 'bg-[#1e3a1e] text-[#81c784] hover:bg-[#254a25]' : 'bg-[#3a1e1e] text-[#ef9a9a] hover:bg-[#4a2222]'}`}
                      >
                        {item.available ? '供應中' : '已下架'}
                      </button>
                      {canWrite && (
                        <button onClick={() => startEdit(item)} className="text-sm text-[#9a8a70] hover:text-[#d4c090] px-2 py-1 font-medium underline underline-offset-4">編輯</button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(item.id)} className="text-sm text-[#6a3030] hover:text-[#ef9a9a] px-2 py-1 font-medium">刪除</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )
      )}

      {craftTarget && masterData && (
        <CraftModal
          menuItem={craftTarget}
          inventoryItems={inventoryItems}
          masterItems={masterData.items}
          masterRecipes={masterData.recipes}
          onClose={() => setCraftTarget(null)}
          onCrafted={load}
        />
      )}
    </div>
  )
}
