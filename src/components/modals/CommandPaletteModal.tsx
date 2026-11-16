import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  Database as DbIcon,
  LayoutGrid,
  Share2,
  Columns,
  Maximize2,
  AlignCenter,
  Eye,
  Sun,
  Moon,
  Type,
  Plus,
  Calendar,
  Zap,
  Trash2,
  History,
  Download,
  PanelLeft,
  PanelRight,
  Palette,
  X,
  CornerDownLeft,
  ArrowRight
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface CommandItem {
  id: string;
  category: 'Commands' | 'Notes' | 'Databases' | 'Canvases' | 'Preferences';
  title: string;
  subtitle?: string;
  hotkey?: string;
  icon: React.ElementType;
  action: () => void;
}

export const CommandPaletteModal: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    pages,
    databases,
    canvases,
    spaces,
    activeSpaceId,
    activePageId,
    createPage,
    createDatabase,
    createCanvas,
    openDailyNote,
    setIsQuickCaptureOpen,
    toggleSplitView,
    setSidebarOpen,
    toggleInspector,
    toggleZenMode,
    isZenMode,
    toggleTypewriterMode,
    isTypewriterMode,
    toggleParagraphFocusMode,
    isParagraphFocusMode,
    theme,
    toggleTheme,
    typography,
    setTypography,
    navigateToHome,
    navigateToGraph,
    navigateToPage,
    navigateToDatabase,
    navigateToCanvas,
    setIsTrashOpen,
    setIsSearchOpen,
    closeTab,
    activeTabId,
    exportPageMarkdown,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isCommandPaletteOpen]);

  // Build full list of command actions
  const allItems: CommandItem[] = useMemo(() => {
    const defaultSpaceId = activeSpaceId || spaces[0]?.id || 'default';
    const list: CommandItem[] = [
      // Core Actions
      {
        id: 'cmd-new-note',
        category: 'Commands',
        title: 'New Note',
        subtitle: 'Create a blank markdown document in current space',
        hotkey: 'Ctrl+T',
        icon: Plus,
        action: () => createPage(defaultSpaceId, null, 'Untitled Note'),
      },
      {
        id: 'cmd-new-db',
        category: 'Commands',
        title: 'New Database',
        subtitle: 'Create a multi-view relational database',
        icon: DbIcon,
        action: () => createDatabase(defaultSpaceId, 'New Database', 'tasks'),
      },
      {
        id: 'cmd-new-canvas',
        category: 'Commands',
        title: 'New Obsidian Canvas',
        subtitle: 'Create an infinite 2D spatial whiteboard',
        icon: LayoutGrid,
        action: () => createCanvas(defaultSpaceId, 'New Canvas'),
      },
      {
        id: 'cmd-daily-note',
        category: 'Commands',
        title: 'Open Daily Note',
        subtitle: "Jump to today's timestamped journal entry",
        hotkey: 'Ctrl+Alt+D',
        icon: Calendar,
        action: () => openDailyNote(),
      },
      {
        id: 'cmd-quick-capture',
        category: 'Commands',
        title: 'Quick Capture Scratchpad',
        subtitle: 'Floating scratchpad to capture thoughts or todos instantly',
        hotkey: 'Ctrl+Alt+N',
        icon: Zap,
        action: () => setIsQuickCaptureOpen(true),
      },
      {
        id: 'cmd-toggle-sidebar',
        category: 'Commands',
        title: 'Toggle Left Sidebar',
        subtitle: 'Collapse or reveal the navigation sidebar',
        hotkey: 'Ctrl+B',
        icon: PanelLeft,
        action: () => setSidebarOpen(prev => !prev),
      },
      {
        id: 'cmd-toggle-inspector',
        category: 'Commands',
        title: 'Toggle Document Inspector',
        subtitle: 'Open or close outline, backlinks & local graph drawer',
        hotkey: 'Ctrl+Shift+O',
        icon: PanelRight,
        action: () => toggleInspector(),
      },
      {
        id: 'cmd-toggle-split',
        category: 'Commands',
        title: 'Toggle Split View (Side-by-Side Dual Pane)',
        subtitle: 'Open two documents or views next to each other',
        hotkey: 'Ctrl+\\',
        icon: Columns,
        action: () => toggleSplitView(),
      },
      {
        id: 'cmd-knowledge-graph',
        category: 'Commands',
        title: 'Open Full Knowledge Graph',
        subtitle: 'Explore all notes, databases & bidirectional links visually',
        hotkey: 'Ctrl+G',
        icon: Share2,
        action: () => navigateToGraph(),
      },
      {
        id: 'cmd-dashboard',
        category: 'Commands',
        title: 'Open Dashboard / Home',
        subtitle: 'Return to the workspace landing overview',
        icon: FileText,
        action: () => navigateToHome(),
      },
      {
        id: 'cmd-trash',
        category: 'Commands',
        title: 'Open Trash & Recycle Bin',
        subtitle: 'View and restore soft-deleted pages and databases',
        icon: Trash2,
        action: () => setIsTrashOpen(true),
      },
      {
        id: 'cmd-search',
        category: 'Commands',
        title: 'Open Global Full-Text Search',
        subtitle: 'Deep keyword search across all notes and database records',
        hotkey: 'Ctrl+K',
        icon: Search,
        action: () => setIsSearchOpen(true),
      },
      {
        id: 'cmd-close-tab',
        category: 'Commands',
        title: 'Close Active Tab',
        subtitle: 'Close the currently focused tab in the top tab bar',
        hotkey: 'Ctrl+W',
        icon: X,
        action: () => closeTab(activeTabId),
      },

      // Focus & Writing Preferences
      {
        id: 'pref-zen',
        category: 'Preferences',
        title: `Toggle Zen Focus Mode (Currently: ${isZenMode ? 'ON' : 'OFF'})`,
        subtitle: 'Distraction-free fullscreen writing with sprint timer',
        hotkey: 'F11 / Ctrl+Shift+F',
        icon: Maximize2,
        action: () => toggleZenMode(),
      },
      {
        id: 'pref-typewriter',
        category: 'Preferences',
        title: `Toggle Typewriter Scrolling (Currently: ${isTypewriterMode ? 'ON' : 'OFF'})`,
        subtitle: 'Keep the active typing line centered on screen',
        hotkey: 'Ctrl+Shift+T',
        icon: AlignCenter,
        action: () => toggleTypewriterMode(),
      },
      {
        id: 'pref-paragraph-focus',
        category: 'Preferences',
        title: `Toggle Paragraph Focus (Currently: ${isParagraphFocusMode ? 'ON' : 'OFF'})`,
        subtitle: 'Dim non-active surrounding paragraphs',
        icon: Eye,
        action: () => toggleParagraphFocusMode(),
      },
      {
        id: 'pref-theme',
        category: 'Preferences',
        title: `Switch Theme to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle Graphic Realism dark/light elevation',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => toggleTheme(),
      },
      {
        id: 'pref-typography',
        category: 'Preferences',
        title: `Switch Typography to ${typography === 'sans' ? 'Serif' : 'Sans-Serif'}`,
        subtitle: 'Toggle editorial serif or clean modern grotesque typeface',
        icon: Type,
        action: () => setTypography(typography === 'sans' ? 'serif' : 'sans'),
      },
    ];

    if (activePageId) {
      list.push({
        id: 'cmd-export-page',
        category: 'Commands',
        title: 'Export Active Note as Markdown (.md)',
        subtitle: 'Save active page to a clean local markdown file',
        icon: Download,
        action: () => exportPageMarkdown(activePageId),
      });
    }

    // Append Canvases
    canvases
      .filter(c => !c.isDeleted)
      .forEach(c => {
        const space = spaces.find(s => s.id === c.spaceId);
        list.push({
          id: `canvas-${c.id}`,
          category: 'Canvases',
          title: c.title,
          subtitle: `Canvas • ${space?.name || 'Workspace'}`,
          icon: LayoutGrid,
          action: () => navigateToCanvas(c.id),
        });
      });

    // Append Databases
    databases
      .filter(d => !d.isDeleted)
      .forEach(d => {
        const space = spaces.find(s => s.id === d.spaceId);
        list.push({
          id: `db-${d.id}`,
          category: 'Databases',
          title: d.title,
          subtitle: `Database (${d.columns.length} cols) • ${space?.name || 'Workspace'}`,
          icon: DbIcon,
          action: () => navigateToDatabase(d.id),
        });
      });

    // Append Pages (excluding database rows)
    pages
      .filter(p => !p.isDeleted && !p.isDatabaseRow)
      .forEach(p => {
        const space = spaces.find(s => s.id === p.spaceId);
        list.push({
          id: `page-${p.id}`,
          category: 'Notes',
          title: p.title || 'Untitled Note',
          subtitle: `Note • ${space?.name || 'Workspace'}${p.tags && p.tags.length > 0 ? ` • #${p.tags.join(' #')}` : ''}`,
          icon: FileText,
          action: () => navigateToPage(p.id),
        });
      });

    return list;
  }, [
    activeSpaceId,
    activePageId,
    spaces,
    canvases,
    databases,
    pages,
    isZenMode,
    isTypewriterMode,
    isParagraphFocusMode,
    theme,
    typography,
    activeTabId,
    createPage,
    createDatabase,
    createCanvas,
    openDailyNote,
    setIsQuickCaptureOpen,
    setSidebarOpen,
    toggleInspector,
    toggleSplitView,
    navigateToGraph,
    navigateToHome,
    setIsTrashOpen,
    setIsSearchOpen,
    closeTab,
    toggleZenMode,
    toggleTypewriterMode,
    toggleParagraphFocusMode,
    toggleTheme,
    setTypography,
    exportPageMarkdown,
    navigateToCanvas,
    navigateToDatabase,
    navigateToPage,
  ]);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchHotkey = item.hotkey?.toLowerCase().includes(q);
      return matchTitle || matchSub || matchCategory || matchHotkey;
    });
  }, [allItems, query]);

  // Keep selectedIndex within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setIsCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCommandPaletteOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 sm:pt-28 p-4 animate-in fade-in duration-100"
      onClick={() => setIsCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-glass rounded-none overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-3 bg-slate-50/50 dark:bg-slate-900/40">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, hotkey, or search notes and databases..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-200/70 dark:bg-slate-800 text-[10px] font-mono text-slate-500 rounded-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 select-none">
              No matching commands or notes found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => {
                    item.action();
                    setIsCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-xs transition-colors select-none ${
                    isSelected
                      ? 'bg-[#0284c7] text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`p-1.5 rounded-none border ${
                        isSelected
                          ? 'border-white/30 bg-white/10 text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-mono px-1 py-0.2 border ${
                            isSelected
                              ? 'border-white/40 text-white/90 bg-white/10'
                              : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hotkey badge or arrow */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.hotkey ? (
                      <kbd
                        className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                          isSelected
                            ? 'bg-white/20 border-white/40 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.hotkey}
                      </kbd>
                    ) : isSelected ? (
                      <CornerDownLeft className="w-3.5 h-3.5 text-white/80" />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">↑</kbd>
              <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">↓</kbd> to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">↵</kbd> to execute
            </span>
          </div>
          <span>Obsidian Command Palette</span>
        </div>
      </div>
    </div>
  );
};
