import type { RecipeTreeNode } from '../../lib/recipeUtils';

interface Props {
  node: RecipeTreeNode;
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  level?: number;
}

export default function RecipeTreeSelector({ node, selectedIds, onToggle, level = 0 }: Props) {
  const isCrystal = node.id >= 2 && node.id <= 19;
  const isSelected = selectedIds.has(node.id);

  // 如果是水晶類，則不顯示本項目，但仍需遞迴處理子項 (雖然水晶通常沒有子項)
  if (isCrystal) {
    return (
      <>
        {node.ingredients?.map((child, index) => (
          <RecipeTreeSelector 
            key={`${node.id}-${child.id}-${index}`} 
            node={child} 
            selectedIds={selectedIds} 
            onToggle={onToggle} 
            level={level} // 維持目前的 level，因為父項被隱藏了
          />
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div 
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--color-bg-card-hover)] transition-colors cursor-pointer group"
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(node.id);
        }}
      >
        <div className="flex items-center justify-center w-4 h-4">
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={() => {}} // Controlled by parent onClick
            className="accent-[var(--color-gold-primary)] w-3.5 h-3.5 cursor-pointer"
          />
        </div>
        <span className={`text-xs transition-colors ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-muted)]'}`}>
          {node.name} <span className="text-[var(--color-text-muted)] ml-1 opacity-70">x{node.amount}</span>
        </span>
      </div>
      
      {node.ingredients && node.ingredients.length > 0 && (
        <div className="flex flex-col">
          {node.ingredients.map((child, index) => (
            <RecipeTreeSelector 
              key={`${node.id}-${child.id}-${index}`} 
              node={child} 
              selectedIds={selectedIds} 
              onToggle={onToggle} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
