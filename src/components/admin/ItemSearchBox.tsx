import { useState, useEffect, useRef } from 'react';
import type { MasterItem } from '../../lib/recipeUtils';

interface Props {
  onSelect: (itemId: number, item: MasterItem) => void;
  placeholder?: string;
}

export default function ItemSearchBox({ onSelect, placeholder = "搜尋 FFXIV 物品名稱或 ID..." }: Props) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Record<number, MasterItem>>({});
  const [results, setResults] = useState<{ id: number; item: MasterItem }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 載入本地 master 資料
  useEffect(() => {
    fetch('/data/master_items.json')
      .then(res => res.json())
      .then(setItems)
      .catch(err => console.error('Failed to load master items:', err));

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 執行搜尋（300ms debounce，避免每個字元都掃 49000 筆資料）
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const searchResults: { id: number; item: MasterItem }[] = [];
      const lowerQuery = query.toLowerCase();

      for (const [idStr, item] of Object.entries(items)) {
        const id = parseInt(idStr, 10);
        if (idStr.includes(query) || item.n.toLowerCase().includes(lowerQuery)) {
          searchResults.push({ id, item });
          if (searchResults.length >= 50) break;
        }
      }
      setResults(searchResults);
      setIsOpen(true);
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, items]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-4 py-2 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-light)] transition-colors"
        />
        <span className="absolute right-3 top-2.5 opacity-40">🔍</span>
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-[100] mt-1 w-full max-h-64 overflow-y-auto bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] rounded shadow-2xl custom-scrollbar">
          {results.map(({ id, item }) => (
            <li
              key={id}
              onClick={() => {
                onSelect(id, item);
                setQuery('');
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-card-hover)] cursor-pointer border-b border-[var(--color-border-gold)]/10 last:border-none"
            >
              <img 
                src={`https://xivapi.com${item.i}`} 
                alt="" 
                className="w-8 h-8 rounded bg-black/20"
                onError={(e) => (e.currentTarget.src = 'https://xivapi.com/i/066000/066313_hr1.png')}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[var(--color-gold-light)] text-sm font-medium truncate">{item.n}</div>
                <div className="text-[var(--color-text-muted)] text-[10px]">ID: {id}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
