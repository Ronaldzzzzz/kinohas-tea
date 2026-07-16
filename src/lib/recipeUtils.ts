export interface MasterItem {
  n: string; // name
  i: string; // icon path
  r?: number; // recipeId
}

export interface MasterRecipe {
  res: number; // result item id
  ings: { i: number; a: number }[]; // ingredients (id, amount)
}

export interface RecipeTreeNode {
  id: number;
  name: string;
  amount: number;
  ingredients?: RecipeTreeNode[];
}

/**
 * 遞迴計算製作一個目標物品所需的最底層原始素材數量。
 * 
 * @param itemId 目標物品 ID
 * @param amount 需求數量
 * @param items 物品主資料
 * @param recipes 配方主資料
 * @param result 累加結果 (itemId -> amount)
 * @param visited 用於防範循環依賴
 */
export function getBaseMaterials(
  itemId: number,
  amount: number,
  items: Record<number, MasterItem>,
  recipes: Record<number, MasterRecipe>,
  result: Record<number, number> = {},
  visited: Set<number> = new Set()
): Record<number, number> {
  // 防範循環依賴
  if (visited.has(itemId)) return result;
  
  const item = items[itemId];
  if (!item) return result;

  if (recipes[itemId]) {
    visited.add(itemId);
    const recipe = recipes[itemId];
    for (const ing of recipe.ings) {
      getBaseMaterials(ing.i, ing.a * amount, items, recipes, result, visited);
    }
    visited.delete(itemId);
  } else {
    // 該物品已無配方，視為最底層素材
    result[itemId] = (result[itemId] || 0) + amount;
  }

  return result;
}

/**
 * 遞迴獲取該物品的所有素材，若素材本身也有配方，則將其 ingredients 展開為 RecipeTreeNode[]。
 */
export function getRecipeTree(
  itemId: number,
  amount: number,
  items: Record<number, MasterItem>,
  recipes: Record<number, MasterRecipe>,
  visited: Set<number> = new Set()
): RecipeTreeNode {
  const item = items[itemId];
  const node: RecipeTreeNode = {
    id: itemId,
    name: item ? item.n : `Unknown Item (${itemId})`,
    amount: amount,
  };

  // 防範循環依賴
  if (visited.has(itemId)) return node;

  if (recipes[itemId]) {
    visited.add(itemId);
    node.ingredients = recipes[itemId].ings.map((ing) =>
      getRecipeTree(ing.i, ing.a * amount, items, recipes, new Set(visited))
    );
    visited.delete(itemId);
  }

  return node;
}
