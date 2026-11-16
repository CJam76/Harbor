import React, { useRef, useState } from 'react';
import {
  X,
  Plus,
  Columns2,
  FileText,
  Database as DatabaseIcon,
  Network,
  Home,
  ChevronLeft,
  ChevronRight,
  SplitSquareVertical,
  LayoutGrid
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceTab } from '../../types';

export const TabBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    selectTab,
    closeTab,
    createPage,
    activeSpaceId,
    spaces,
    isSplitView,
    toggleSplitView,
    openTab,
  } = useWorkspace();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenuTab, setContextMenuTab] = useState<{ tab: WorkspaceTab; x: number; y: number } | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleNewPage = async () => {
    const spaceId = activeSpaceId || (spaces[0] ? spaces[0].id : 'default');
    await createPage(spaceId, null, 'Untitled Note');
  };

  const getTabIcon = (tab: WorkspaceTab) => {
    if (tab.icon && tab.icon.length <= 2) {
      return <span className="text-xs mr-1">{tab.icon}</span>;
    }
    switch (tab.type) {
      case 'landing':
        return <Home className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />;
      case 'graph':
        return <Network className="w-3.5 h-3.5 mr-1.5 text-emerald-500 shrink-0" />;
      case 'database':
        return <DatabaseIcon className="w-3.5 h-3.5 mr-1.5 text-amber-500 shrink-0" />;
      case 'canvas':
        return <LayoutGrid className="w-3.5 h-3.5 mr-1.5 text-purple-500 shrink-0" />;
      case 'page':
      default:
        return <FileText className="w-3.5 h-3.5 mr-1.5 text-[#0284c7] shrink-0" />;
    }
  };

  return (
    <div className="h-9 w-full flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#070b14]/70 backdrop-blur-md select-none z-10">
      {/* Horizontal Tabs List */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center h-full overflow-x-auto no-scrollbar scroll-smooth"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(tab.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenuTab({ tab, x: e.clientX, y: e.clientY });
              }}
              title={`${tab.title} (Middle click or Ctrl+W to close)`}
              className={`group relative flex items-center h-full px-3 text-xs border-r border-slate-200/80 dark:border-slate-800/80 transition-all cursor-pointer max-w-[200px] min-w-[110px] shrink-0 ${
                isActive
                  ? 'bg-[#fbfcfe] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 font-medium border-t-2 border-t-[#0284c7] shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border-t-2 border-t-transparent'
              }`}
            >
              <div className="flex items-center min-w-0 flex-1 mr-1">
                {getTabIcon(tab)}
                <span className="truncate">{tab.title || 'Untitled'}</span>
              </div>

              {/* Close Tab Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity ${
                  isActive ? 'opacity-70 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Close tab (Ctrl+W)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Quick Add Tab Button */}
        <button
          onClick={handleNewPage}
          title="New Note (Ctrl+T)"
          className="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Controls: Split View & Controls */}
      <div className="flex items-center h-full px-2 gap-1 border-l border-slate-200/80 dark:border-slate-800/80 bg-slate-100/90 dark:bg-[#070b14]/90 shrink-0">
        {/* Toggle Split View */}
        <button
          onClick={() => toggleSplitView()}
          title={`Split View Side-by-Side (Ctrl+\\) ${isSplitView ? '• Active' : ''}`}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
            isSplitView
              ? 'bg-[#0284c7]/15 text-[#0284c7] font-medium border border-[#0284c7]/30'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Split</span>
        </button>
      </div>

      {/* Tab Context Menu */}
      {contextMenuTab && (
        <div
          className="fixed z-50 bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded shadow-lg py-1 w-44 text-xs font-sans text-slate-700 dark:text-slate-200"
          style={{ top: contextMenuTab.y + 4, left: contextMenuTab.x }}
          onClick={() => setContextMenuTab(null)}
          onMouseLeave={() => setContextMenuTab(null)}
        >
          <button
            onClick={() => closeTab(contextMenuTab.tab.id)}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between"
          >
            <span>Close Tab</span>
            <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+W</kbd>
          </button>
          <button
            onClick={() => {
              toggleSplitView(contextMenuTab.tab);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between"
          >
            <span>Open to the Right</span>
            <Columns2 className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
};
