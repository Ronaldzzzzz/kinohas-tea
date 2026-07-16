import { useEffect, useState, useRef, useMemo } from 'react'
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  deleteInventoryItems,
  getMenuItems,
} from '../../lib/firestore'
import type { InventoryItem, MenuItem } from '../../types'
import type { MasterRecipe } from '../../lib/recipeUtils'
import { useToast } from '../../hooks/useToast'
import Toast from '../Toast'

const EMPTY_FORM = {
  name: '',
  stock: 0,
  note: '',
}


interface InventoryNode extends InventoryItem {
  children: InventoryNode[]
  totalDemand?: number
}

interface DisplayNode extends InventoryNode {
  docIds?: string[]
}

interface Props {
  canWrite: boolean
  canDelete: boolean
}

export default function InventoryManager({ canWrite, canDelete }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [masterRecipes, setMasterRecipes] = useState<Record<number, MasterRecipe>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { toast, showToast } = useToast()
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [invData, menuData, recipesRes] = await Promise.all([
        getInventoryItems(),
        getMenuItems(),
        fetch('/Full-Moon-Bistro-pages/data/master_recipes.json').then(r => r.json())
      ])
      setItems(invData)
      setMenuItems(menuData)
      setMasterRecipes(recipesRes)
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // 1. 計算全菜單的總需求量
  const totalDemands = useMemo(() => {
    const demands: Record<number, number> = {}
    menuItems.forEach(menuItem => {
      menuItem.ingredients?.forEach(ing => {
        demands[ing.id] = (demands[ing.id] || 0) + ing.amount
      })
    })
    return demands
  }, [menuItems])

  // 2. 樹狀結構建構 (注入需求量)
  const inventoryTrees = useMemo(() => {
    if (items.length === 0) return [];
    const nodes: Record<string, InventoryNode> = {};
    items.forEach(item => { 
      nodes[item.id] = { 
        ...item, 
        children: [], 
        totalDemand: item.recipeIngredientId ? totalDemands[item.recipeIngredientId] : 0 
      }; 
    });
    
    const recipeIdToInvId: Record<number, string> = {};
    items.forEach(item => { if (item.recipeIngredientId) recipeIdToInvId[item.recipeIngredientId] = item.id; });
    
    const childIds = new Set<string>();
    items.forEach(item => {
      if (item.recipeIngredientId && masterRecipes[item.recipeIngredientId]) {
        masterRecipes[item.recipeIngredientId].ings.forEach(ing => {
          const childInvId = recipeIdToInvId[ing.i];
          if (childInvId && nodes[item.id] && childInvId !== item.id) {
            nodes[item.id].children.push(nodes[childInvId]);
            childIds.add(childInvId);
          }
        });
      }
    });
    return Object.values(nodes).filter(node => !childIds.has(node.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, masterRecipes, totalDemands]);

  // 3. 模式切換邏輯 (注入需求量並加總)
  const displayItems = useMemo<DisplayNode[]>(() => {
    if (viewMode === 'tree') return inventoryTrees;
    const groups: Record<string, DisplayNode & { rawNotes: string[] }> = {};
    items.forEach(item => {
      const key = item.recipeIngredientId ? `id_${item.recipeIngredientId}` : `name_${item.name}`;
      if (!groups[key]) {
        groups[key] = { 
          ...item, 
          docIds: [item.id], 
          children: [],
          totalDemand: item.recipeIngredientId ? totalDemands[item.recipeIngredientId] : 0,
          rawNotes: item.note ? [item.note] : [] // 使用陣列追蹤原始備註
        };
      } else {
        groups[key].stock += item.stock;
        if (item.note && !groups[key].rawNotes.includes(item.note)) {
          groups[key].rawNotes.push(item.note);
        }
        groups[key]!.docIds!.push(item.id);
      }
    });

    // 格式化最終備註
    return Object.values(groups).map(group => {
      if (group.rawNotes.length > 0) {
        group.note = group.rawNotes.join('、');
      }
      return group;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, viewMode, inventoryTrees, totalDemands]);

  const handleQuickStockUpdate = (item: DisplayNode, newStock: number) => {
    if (newStock < 0) return;
    const diff = newStock - item.stock;
    const docIds = item.docIds || [item.id];
    setItems(prev => prev.map(i => i.id === docIds[0] ? { ...i, stock: i.stock + diff } : i));
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await updateInventoryItem(docIds[0], { stock: item.stock + diff });
        showToast('庫存同步成功');
      } catch (err) {
        showToast('同步失敗', 'error');
        await load();
      }
    }, 1000);
  }

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`確定要刪除選中的 ${selectedIds.size} 樣食材？`)) return;
    setSaving(true);
    try {
      await deleteInventoryItems(Array.from(selectedIds));
      showToast(`成功刪除食材`);
      await load();
    } catch (err) {
      showToast('批量刪除失敗', 'error');
    } finally {
      setSaving(false);
    }
  }

  const renderNode = (node: DisplayNode, level: number = 0) => {
    const isSelected = selectedIds.has(node.id);
    const demand = node.totalDemand ?? 0
    const isUnderstocked = demand > 0 && node.stock < demand;

    return (
      <div key={node.id} className="flex flex-col">
        <div 
          onClick={() => handleToggleSelect(node.id)}
          className={`flex items-center gap-3 bg-[#2a2015] border rounded p-3 hover:border-[#6a5030] transition-all cursor-pointer ${
            isSelected ? 'border-[#c9a55a] shadow-[var(--shadow-glow-warm)]' : 'border-[#4a3820]'
          }`}
          style={{ marginLeft: `${level * 1.5}rem` }}
        >
          {level > 0 && <span className="text-[#6a5030] opacity-50">└─</span>}
          {canDelete && (
            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
              <input type="checkbox" checked={isSelected} onChange={() => {}} className="accent-[#c9a55a] w-4 h-4" />
            </div>
          )}
          <div className="w-8 h-8 rounded bg-black/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#4a3820]">
            {node.icon ? <img src={`https://xivapi.com${node.icon}`} alt="" className="w-full h-full object-contain" /> : <span className="text-lg">📦</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[#d4c090] text-base font-bold truncate">{node.name}</span>
              {demand > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full border ${isUnderstocked ? 'text-[#ef9a9a] border-[#ef9a9a]/30 bg-[#ef9a9a]/10' : 'text-[#81c784] border-[#81c784]/30 bg-[#81c784]/10'}`}>
                  需求: {demand}
                </span>
              )}
            </div>
            {node.note && <div className="text-[#6a5030] text-sm truncate mt-0.5 opacity-80">{node.note}</div>}
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleQuickStockUpdate(node, node.stock - 1)} className="w-6 h-6 flex items-center justify-center bg-[#3a2e18] text-[#c9a55a] rounded hover:bg-[#4a3820] transition-colors text-lg font-bold">-</button>
            <input type="number" value={node.stock} onChange={(e) => handleQuickStockUpdate(node, parseInt(e.target.value) || 0)} className="w-20 bg-[#1a1510] border border-[#4a3820] rounded px-2 py-0.5 text-center text-sm text-[#f4e38e] focus:outline-none focus:border-[#c9a55a]" />
            <button onClick={() => handleQuickStockUpdate(node, node.stock + 1)} className="w-6 h-6 flex items-center justify-center bg-[#3a2e18] text-[#c9a55a] rounded hover:bg-[#4a3820] transition-colors text-lg font-bold">+</button>
          </div>
          {(canWrite || canDelete) && (
            <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
              {canWrite && (
                <button onClick={() => { setEditing(node); setForm({ name: node.name, stock: node.stock, note: node.note }); setShowForm(true); }} className="text-xs text-[#9a8a70] hover:text-[#d4c090] p-1">⚙</button>
              )}
              {canDelete && (
                <button onClick={() => handleDelete(node.id)} className="text-xs text-[#6a3030] hover:text-[#ef9a9a] p-1">✕</button>
              )}
            </div>
          )}
        </div>
        {node.children && node.children.length > 0 && (
          <div className="flex flex-col mt-1">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateInventoryItem(editing.id, form);
      else await addInventoryItem(form);
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除此食材？')) return;
    await deleteInventoryItem(id);
    await load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <span className="text-[#9a8a70] text-sm">{items.length} 樣食材</span>
          <div className="flex bg-[#1a1510] border border-[#4a3820] rounded p-0.5">
            <button onClick={() => setViewMode('tree')} className={`px-3 py-1 text-[10px] rounded transition-colors ${viewMode === 'tree' ? 'bg-[#c9a55a] text-[#1a1510] font-bold' : 'text-[#6a5030] hover:text-[#9a8a70]'}`}>樹狀</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-[10px] rounded transition-colors ${viewMode === 'list' ? 'bg-[#c9a55a] text-[#1a1510] font-bold' : 'text-[#6a5030] hover:text-[#9a8a70]'}`}>清單</button>
          </div>
          {canDelete && items.length > 0 && (
            <button onClick={handleSelectAll} className="text-[#c9a55a] text-xs hover:underline">{selectedIds.size === items.length ? '取消全選' : '全選'}</button>
          )}
          {canDelete && selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} disabled={saving} className="bg-[#3a1e1e] text-[#ef9a9a] text-xs px-3 py-1 rounded hover:bg-[#4a2222] transition-colors disabled:opacity-50">刪除選中 ({selectedIds.size})</button>
          )}
        </div>
        {canWrite && (
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }} className="bg-[#c9a55a] text-[#1a1510] text-sm font-semibold px-4 py-1.5 rounded hover:bg-[#d4af7a] transition-colors">＋ 手動新增食材</button>
        )}
      </div>

      {showForm && canWrite && (
        <form onSubmit={handleSave} className="bg-[#2a2015] border border-[#6a5030] rounded p-4 mb-6 flex flex-col gap-3">
          <h3 className="text-[#c9a55a] text-sm font-semibold">{editing ? '編輯食材' : '新增食材'}</h3>
          <div className="flex flex-col gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="食材名稱 *" required className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a]" />
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="備註 (如：用於製作 OO)" rows={2} className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] focus:outline-none focus:border-[#c9a55a] resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-[#9a8a70] hover:text-[#d4c090] px-3 py-1.5">取消</button>
            <button type="submit" disabled={saving} className="bg-[#c9a55a] text-[#1a1510] text-sm font-semibold px-5 py-1.5 rounded hover:bg-[#d4af7a] disabled:opacity-50 transition-colors">{saving ? '儲存中…' : '儲存'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-[#9a8a70] text-sm">載入中…</p>
      ) : (
        <div className="grid gap-2">
          {displayItems.map(item => renderNode(item))}
          {displayItems.length === 0 && (
            <p className="text-[#9a8a70] text-sm text-center py-8">目前無食材資料</p>
          )}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
