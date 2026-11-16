import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Database as DbIcon,
  Table,
  ArrowRight,
  X,
  CornerDownLeft
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    pages,
    databases,
    spaces,
    navigateToPage,
    navigateToDatabase,
    openRowModal,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  // Filter items matching query
  const cleanQuery = query.toLowerCase().trim();

  interface SearchResultItem {
    id: string;
    type: 'page' | 'database' | 'row';
    title: string;
    spaceName: string;
    snippet?: string;
    rowId?: string;
    dbId?: string;
  }

  const results: SearchResultItem[] = [];

  // Match databases
  for (const db of databases) {
    if (db.isDeleted) continue;
    const space = spaces.find(s => s.id === db.spaceId);
    if (!cleanQuery || db.title.toLowerCase().includes(cleanQuery) || db.description?.toLowerCase().includes(cleanQuery)) {
      results.push({
        id: db.id,
        type: 'database',
        title: db.title,
        spaceName: space?.name || 'Workspace',
        snippet: db.description,
        dbId: db.id,
      });
    }
  }

  // Match pages & database rows
  for (const page of pages) {
    if (page.isDeleted) continue;
    const space = spaces.find(s => s.id === page.spaceId);
    const titleMatch = page.title.toLowerCase().includes(cleanQuery);
    const contentMatch = page.content.toLowerCase().includes(cleanQuery);
    const tagMatch = page.tags?.some(t => t.toLowerCase().includes(cleanQuery));

    if (!cleanQuery || titleMatch || contentMatch || tagMatch) {
      let snippet = '';
      if (cleanQuery && contentMatch) {
        const idx = page.content.toLowerCase().indexOf(cleanQuery);
        const start = Math.max(0, idx - 30);
        const end = Math.min(page.content.length, idx + cleanQuery.length + 30);
        snippet = (start > 0 ? '...' : '') + page.content.substring(start, end).replace(/\n/g, ' ') + (end < page.content.length ? '...' : '');
      }

      results.push({
        id: page.id,
        type: page.isDatabaseRow ? 'row' : 'page',
        title: page.title,
        spaceName: space?.name || 'Workspace',
        snippet: snippet || (page.tags && page.tags.length > 0 ? `#${page.tags.join(' #')}` : undefined),
        rowId: page.isDatabaseRow ? page.id : undefined,
        dbId: page.databaseId,
      });
    }
  }

  const handleSelect = (item: SearchResultItem) => {
    setIsSearchOpen(false);
    if (item.type === 'page') {
      navigateToPage(item.id);
    } else if (item.type === 'database') {
      navigateToDatabase(item.id);
    } else if (item.type === 'row' && item.rowId) {
      if (item.dbId) navigateToDatabase(item.dbId);
      openRowModal(item.rowId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  return (
    <div
      onClick={() => setIsSearchOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-[#0b111e] border border-slate-200 dark:border-slate-800 shadow-glass rounded-none overflow-hidden flex flex-col text-xs"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a page title, tag, or keyword to jump..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] font-mono bg-white dark:bg-slate-800 px-1 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-1">
          {results.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">
              No matching pages, databases, or notes found.
            </div>
          ) : (
            results.slice(0, 20).map((item, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 cursor-pointer rounded-none transition-colors ${
                    isSelected
                      ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/20 border-l-2 border-l-[#0284c7]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.type === 'page' && (
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    {item.type === 'database' && (
                      <DbIcon className="w-4 h-4 text-[#0284c7] flex-shrink-0" />
                    )}
                    {item.type === 'row' && (
                      <Table className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {item.spaceName}
                        </span>
                      </div>
                      {item.snippet && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.snippet}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono ml-2 flex-shrink-0">
                      <span>Jump</span>
                      <CornerDownLeft className="w-3 h-3 text-[#0284c7]" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] text-slate-400 flex items-center justify-between px-3 select-none">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> select
            </span>
          </div>
          <span>Harbor Instant Index</span>
        </div>
      </div>
    </div>
  );
};
