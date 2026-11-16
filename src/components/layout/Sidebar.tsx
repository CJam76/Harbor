import React, { useState, useRef } from 'react';
import {
  Anchor,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Database as DbIcon,
  LayoutGrid,
  Compass,
  MoreVertical,
  Trash2,
  Copy,
  Edit2,
  FolderPlus,
  CornerDownRight,
  GripVertical,
  X,
  PlusCircle,
  FolderGit2,
  Share2,
  CalendarDays,
  Zap,
  Star,
  PanelLeftClose
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page, Space, Database, Canvas } from '../../types';

interface SidebarProps {
  onOpenNewSpaceModal: () => void;
  onOpenNewDbModal: (spaceId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenNewSpaceModal,
  onOpenNewDbModal,
}) => {
  const {
    spaces,
    pages,
    databases,
    canvases,
    activeSpaceId,
    activePageId,
    activeDatabaseId,
    activeCanvasId,
    isLandingPage,
    isGraphView,
    isSidebarOpen,
    setSidebarOpen,
    navigateToHome,
    navigateToGraph,
    navigateToPage,
    navigateToDatabase,
    navigateToCanvas,
    createPage,
    deletePage,
    duplicatePage,
    movePage,
    deleteSpace,
    renameSpace,
    deleteDatabase,
    createCanvas,
    updateCanvas,
    deleteCanvas,
    setIsSearchOpen,
    openDailyNote,
    setIsQuickCaptureOpen,
    resetToSampleData,
    setIsTrashOpen,
    trashCount,
    toggleFavorite,
    toggleCommandPalette,
  } = useWorkspace();

  // Favorites state
  const [isFavoritesCollapsed, setIsFavoritesCollapsed] = useState(false);
  const favoritePages = pages.filter(p => !p.isDeleted && p.isFavorite);
  const favoriteDatabases = databases.filter(d => !d.isDeleted && d.isFavorite);
  const favoriteCanvases = canvases.filter(c => !c.isDeleted && c.isFavorite);
  const hasFavorites = favoritePages.length > 0 || favoriteDatabases.length > 0 || favoriteCanvases.length > 0;

  // Collapsed spaces tracking
  const [collapsedSpaces, setCollapsedSpaces] = useState<Record<string, boolean>>({});
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({});

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'space' | 'page' | 'database' | 'canvas';
    id: string;
    item: any;
  } | null>(null);

  // Drag and drop state
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'inside' | 'before' | 'after' | null>(null);

  // Inline rename state
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'space' | 'page'; value: string } | null>(null);

  const toggleSpaceCollapse = (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSpaces(prev => ({ ...prev, [spaceId]: !prev[spaceId] }));
  };

  const togglePageCollapse = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedPages(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', pageId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPageId(pageId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPageId === targetId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    if (relativeY < rect.height * 0.25) {
      setDropPosition('before');
    } else if (relativeY > rect.height * 0.75) {
      setDropPosition('after');
    } else {
      setDropPosition('inside');
    }
    setDragOverTargetId(targetId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverTargetId(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPage: Page) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedPageId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetPage.id) {
      setDragOverTargetId(null);
      setDraggedPageId(null);
      return;
    }

    try {
      if (dropPosition === 'inside') {
        // Nest inside target page
        await movePage(sourceId, targetPage.id, targetPage.spaceId);
        // auto-expand parent
        setCollapsedPages(prev => ({ ...prev, [targetPage.id]: false }));
      } else {
        // Place as peer of target page
        await movePage(sourceId, targetPage.parentId || null, targetPage.spaceId, (targetPage.order ?? 0) + (dropPosition === 'after' ? 1 : -1));
      }
    } catch (err) {
      console.error('Failed to move page:', err);
    } finally {
      setDraggedPageId(null);
      setDragOverTargetId(null);
      setDropPosition(null);
    }
  };

  const handleSpaceDrop = async (e: React.DragEvent, targetSpaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedPageId || e.dataTransfer.getData('text/plain');
    if (!sourceId) return;

    try {
      await movePage(sourceId, null, targetSpaceId);
    } finally {
      setDraggedPageId(null);
      setDragOverTargetId(null);
    }
  };

  // Open context menu
  const openContextMenu = (e: React.MouseEvent, type: 'space' | 'page' | 'database' | 'canvas', item: any) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 240);
    setContextMenu({ x, y, type, id: item.id, item });
  };

  // Recursively render nested pages
  const renderPageTree = (spaceId: string, parentId: string | null = null, depth = 0) => {
    const spacePages = pages.filter(
      p => !p.isDeleted && p.spaceId === spaceId && !p.isDatabaseRow && (parentId ? p.parentId === parentId : !p.parentId)
    );

    if (spacePages.length === 0) return null;

    return (
      <div className="flex flex-col">
        {spacePages.map(page => {
          const subPages = pages.filter(p => !p.isDeleted && p.parentId === page.id && !p.isDatabaseRow);
          const hasChildren = subPages.length > 0;
          const isCollapsed = collapsedPages[page.id] ?? false;
          const isActive = activePageId === page.id;
          const isDragged = draggedPageId === page.id;
          const isDragTarget = dragOverTargetId === page.id;

          return (
            <div key={page.id} className="relative group/page">
              <div
                draggable
                onDragStart={e => handleDragStart(e, page.id)}
                onDragOver={e => handleDragOver(e, page.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, page)}
                onContextMenu={e => openContextMenu(e, 'page', page)}
                onClick={() => navigateToPage(page.id)}
                style={{ paddingLeft: `${16 + depth * 14}px` }}
                className={`flex items-center justify-between py-1.5 pr-2 text-xs cursor-pointer select-none transition-all rounded-none hairline-border-b ${
                  isActive
                    ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] font-medium border-l-2 border-l-[#0284c7]'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-l-transparent'
                } ${isDragged ? 'opacity-40' : ''} ${
                  isDragTarget && dropPosition === 'inside' ? 'bg-[#0284c7]/20 ring-1 ring-[#0284c7]' : ''
                } ${
                  isDragTarget && dropPosition === 'before' ? 'border-t-2 border-t-[#0284c7]' : ''
                } ${
                  isDragTarget && dropPosition === 'after' ? 'border-b-2 border-b-[#0284c7]' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {hasChildren ? (
                    <button
                      onClick={e => togglePageCollapse(page.id, e)}
                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  ) : (
                    <div className="w-3 h-3" />
                  )}

                  <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

                  {editingItem?.id === page.id ? (
                    <input
                      type="text"
                      autoFocus
                      defaultValue={page.title}
                      className="bg-white dark:bg-slate-900 border border-[#0284c7] px-1 py-0.5 text-xs text-slate-900 dark:text-slate-100 w-full outline-none"
                      onClick={e => e.stopPropagation()}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                          await pageRenameConfirm(page.id, (e.target as HTMLInputElement).value);
                        } else if (e.key === 'Escape') {
                          setEditingItem(null);
                        }
                      }}
                      onBlur={e => pageRenameConfirm(page.id, e.target.value)}
                    />
                  ) : (
                    <span className="truncate flex-1">{page.title}</span>
                  )}
                </div>

                {/* Hover actions */}
                <div className="opacity-0 group-hover/page:opacity-100 flex items-center gap-1">
                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      await createPage(page.spaceId, page.id, 'Untitled Sub-page');
                      setCollapsedPages(prev => ({ ...prev, [page.id]: false }));
                    }}
                    title="Add sub-page"
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => openContextMenu(e, 'page', page)}
                    title="More actions"
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sub-pages nested */}
              {hasChildren && !isCollapsed && renderPageTree(spaceId, page.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const pageRenameConfirm = async (id: string, newTitle: string) => {
    if (newTitle.trim()) {
      const { updatePage } = useWorkspace();
      // Directly call context update
      setEditingItem(null);
    } else {
      setEditingItem(null);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-64 glass-panel z-40 flex flex-col border-r border-slate-200/80 dark:border-slate-800 transition-transform duration-200 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        {/* Top Logo / App Title */}
        <div className="h-12 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
            <div className="w-6 h-6 bg-[#080c14] dark:bg-white text-white dark:text-[#080c14] flex items-center justify-center rounded-none shadow-sm">
              <Anchor className="w-3.5 h-3.5" />
            </div>
            <span>Harbor</span>
            <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-slate-200/60 dark:bg-slate-800 text-slate-500 rounded-none ml-1">
              Local
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-none transition-colors"
              title="Collapse sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-4 h-4 hidden lg:block" />
              <X className="w-4 h-4 lg:hidden" />
            </button>
          </div>
        </div>

        {/* Global Navigation: Home, Graph, Daily Notes, Quick Capture & Search */}
        <div className="p-2 space-y-1 border-b border-slate-200/80 dark:border-slate-800">
          <button
            onClick={navigateToHome}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-none transition-colors ${
              isLandingPage
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" />
            <span>Harbor Landing</span>
          </button>

          <button
            onClick={() => openDailyNote()}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors group"
            title="Open Today's Daily Note (Ctrl+Alt+D)"
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Today's Daily Note</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-1 py-0.2 rounded-none">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </button>

          <button
            onClick={() => setIsQuickCaptureOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
            title="Quick Capture thought or task (Ctrl+Alt+N)"
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span>Quick Capture</span>
            </div>
            <kbd className="text-[10px] font-mono bg-white dark:bg-slate-800 px-1 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-400">
              Ctrl+Alt+N
            </kbd>
          </button>

          <button
            onClick={navigateToGraph}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-none transition-colors ${
              isGraphView
                ? 'bg-[#0284c7] text-white font-medium'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-[#0284c7] group-hover:text-white" />
            <span>Knowledge Graph</span>
          </button>

          <button
            onClick={toggleCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
            title="Command Palette (Ctrl+P)"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-3.5 h-3.5 text-violet-500" />
              <span>Command Palette</span>
            </div>
            <kbd className="text-[10px] font-mono bg-white dark:bg-slate-800 px-1 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-400">
              Ctrl+P
            </kbd>
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5" />
              <span>Search Notes...</span>
            </div>
            <kbd className="text-[10px] font-mono bg-white dark:bg-slate-800 px-1 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Pinned / Starred Favorites Section */}
        {hasFavorites && (
          <div className="border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <div
              onClick={() => setIsFavoritesCollapsed(!isFavoritesCollapsed)}
              className="px-3 pt-3 pb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Favorites</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400">
                  {favoritePages.length + favoriteDatabases.length + favoriteCanvases.length}
                </span>
                {isFavoritesCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </div>
            </div>

            {!isFavoritesCollapsed && (
              <div className="px-1 space-y-0.5 mt-0.5">
                {favoritePages.map(page => {
                  const isActive = activePageId === page.id;
                  return (
                    <div
                      key={page.id}
                      onClick={() => navigateToPage(page.id)}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer select-none transition-colors rounded-none group/fav ${
                        isActive
                          ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] font-medium border-l-2 border-l-[#0284c7]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{page.title || 'Untitled'}</span>
                      </div>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          await toggleFavorite(page.id, 'page');
                        }}
                        className="opacity-0 group-hover/fav:opacity-100 p-0.5 text-amber-500 hover:text-slate-400 transition-opacity"
                        title="Remove from favorites"
                      >
                        <Star className="w-3 h-3 fill-amber-500" />
                      </button>
                    </div>
                  );
                })}

                {favoriteDatabases.map(db => {
                  const isActive = activeDatabaseId === db.id;
                  return (
                    <div
                      key={db.id}
                      onClick={() => navigateToDatabase(db.id)}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer select-none transition-colors rounded-none group/fav ${
                        isActive
                          ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] font-medium border-l-2 border-l-[#0284c7]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DbIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{db.title || 'Untitled Database'}</span>
                      </div>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          await toggleFavorite(db.id, 'database');
                        }}
                        className="opacity-0 group-hover/fav:opacity-100 p-0.5 text-amber-500 hover:text-slate-400 transition-opacity"
                        title="Remove from favorites"
                      >
                        <Star className="w-3 h-3 fill-amber-500" />
                      </button>
                    </div>
                  );
                })}

                {favoriteCanvases.map(c => {
                  const isActive = activeCanvasId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigateToCanvas(c.id)}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer select-none transition-colors rounded-none group/fav ${
                        isActive
                          ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] font-medium border-l-2 border-l-[#0284c7]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <LayoutGrid className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        <span className="truncate">{c.title || 'Untitled Canvas'}</span>
                      </div>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          await toggleFavorite(c.id, 'canvas');
                        }}
                        className="opacity-0 group-hover/fav:opacity-100 p-0.5 text-amber-500 hover:text-slate-400 transition-opacity"
                        title="Remove from favorites"
                      >
                        <Star className="w-3 h-3 fill-amber-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Spaces & Page Tree Header */}
        <div className="px-3 pt-4 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span>Spaces & Vaults</span>
          <button
            onClick={onOpenNewSpaceModal}
            className="p-1 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-none transition-colors"
            title="Create new Space"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Spaces List */}
        <div className="flex-1 overflow-y-auto px-1 py-1 space-y-3">
          {spaces.map(space => {
            const isCollapsed = collapsedSpaces[space.id] ?? false;
            const spaceDatabases = databases.filter(d => !d.isDeleted && d.spaceId === space.id);

            return (
              <div
                key={space.id}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleSpaceDrop(e, space.id)}
                className="group/space"
              >
                {/* Space Header */}
                <div
                  onContextMenu={e => openContextMenu(e, 'space', space)}
                  className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer select-none rounded-none"
                  onClick={e => toggleSpaceCollapse(space.id, e)}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-400">
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                    <span className="truncate">{space.name}</span>
                  </div>

                  <div className="opacity-0 group-hover/space:opacity-100 flex items-center gap-0.5">
                    {/* + Page */}
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        await createPage(space.id, null, 'Untitled Page');
                        setCollapsedSpaces(prev => ({ ...prev, [space.id]: false }));
                      }}
                      title="Add Page to this space"
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    {/* + Database */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenNewDbModal(space.id);
                      }}
                      title="Add Database to this space"
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <DbIcon className="w-3 h-3" />
                    </button>
                    {/* + Canvas */}
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        await createCanvas(space.id, 'New Canvas');
                        setCollapsedSpaces(prev => ({ ...prev, [space.id]: false }));
                      }}
                      title="Add Canvas whiteboard to this space"
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <LayoutGrid className="w-3 h-3" />
                    </button>
                    {/* Space kebab */}
                    <button
                      onClick={e => openContextMenu(e, 'space', space)}
                      title="Space options"
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Databases in Space */}
                {!isCollapsed && (
                  <div className="mt-0.5 space-y-0.5">
                    {spaceDatabases.map(db => {
                      const isActive = activeDatabaseId === db.id;
                      return (
                        <div
                          key={db.id}
                          onClick={() => navigateToDatabase(db.id)}
                          onContextMenu={e => openContextMenu(e, 'database', db)}
                          className={`flex items-center justify-between px-3 py-1 text-xs cursor-pointer select-none transition-colors rounded-none group/db ${
                            isActive
                              ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] font-medium border-l-2 border-l-[#0284c7]'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-l-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <DbIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{db.title}</span>
                          </div>
                          <button
                            onClick={e => openContextMenu(e, 'database', db)}
                            className="opacity-0 group-hover/db:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Canvases in Space */}
                    {canvases
                      .filter(c => !c.isDeleted && c.spaceId === space.id)
                      .map(c => {
                        const isActive = activeCanvasId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => navigateToCanvas(c.id)}
                            onContextMenu={e => openContextMenu(e, 'canvas', c)}
                            className={`flex items-center justify-between px-3 py-1 text-xs cursor-pointer select-none transition-colors rounded-none group/canvas ${
                              isActive
                                ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] font-medium border-l-2 border-l-[#0284c7]'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-l-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <LayoutGrid className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                              <span className="truncate">{c.title}</span>
                            </div>
                            <button
                              onClick={e => openContextMenu(e, 'canvas', c)}
                              className="opacity-0 group-hover/canvas:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}

                    {/* Pages in Space (Nested Tree) */}
                    {renderPageTree(space.id, null, 0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Workspace Trash Can Button */}
        <div className="px-2 py-1 border-t border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setIsTrashOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-none transition-colors group/trash"
            title="Open Workspace Trash Can"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover/trash:text-slate-700 dark:group-hover/trash:text-slate-200" />
              <span>Trash</span>
            </div>
            {trashCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-medium border border-rose-500/20 font-mono">
                {trashCount}
              </span>
            )}
          </button>
        </div>

        {/* Footer info & sample data reset */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Harbor v1.0 • Offline Ready</span>
          <button
            onClick={() => {
              if (window.confirm("Reload default starter spaces and templates? Any unsaved edits will be refreshed.")) {
                resetToSampleData();
              }
            }}
            className="hover:text-slate-700 dark:hover:text-slate-200 underline"
            title="Reset workspace with starter templates"
          >
            Reset Starter
          </button>
        </div>
      </aside>

      {/* Global Context Menu Popover */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass py-1 w-48 text-xs select-none rounded-none"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={() => setContextMenu(null)}
        >
          {contextMenu.type === 'space' && (
            <>
              <button
                onClick={async () => {
                  const newName = prompt('Enter new space name:', contextMenu.item.name);
                  if (newName && newName.trim()) {
                    await renameSpace(contextMenu.id, newName.trim());
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename Space</span>
              </button>
              <button
                onClick={() => createPage(contextMenu.id, null, 'Untitled Page')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400" />
                <span>New Page</span>
              </button>
              <button
                onClick={() => onOpenNewDbModal(contextMenu.id)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <DbIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>New Database</span>
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
              <button
                onClick={async () => {
                  if (window.confirm(`Delete space "${contextMenu.item.name}" and all its contents?`)) {
                    await deleteSpace(contextMenu.id);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Space</span>
              </button>
            </>
          )}

          {contextMenu.type === 'page' && (
            <>
              <button
                onClick={async () => {
                  const newTitle = prompt('Enter new page title:', contextMenu.item.title);
                  if (newTitle && newTitle.trim()) {
                    const { updatePage } = useWorkspace();
                    await updatePage({ id: contextMenu.id, title: newTitle.trim() });
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename Page</span>
              </button>
              <button
                onClick={() => createPage(contextMenu.item.spaceId, contextMenu.id, 'Untitled Sub-page')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                <span>Add Sub-page</span>
              </button>
              <button
                onClick={() => duplicatePage(contextMenu.id)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Duplicate Page</span>
              </button>
              <button
                onClick={() => toggleFavorite(contextMenu.id, 'page')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Star className={`w-3.5 h-3.5 ${contextMenu.item.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>{contextMenu.item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
              <button
                onClick={async () => {
                  if (window.confirm(`Delete page "${contextMenu.item.title}"?`)) {
                    await deletePage(contextMenu.id);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Page</span>
              </button>
            </>
          )}

          {contextMenu.type === 'database' && (
            <>
              <button
                onClick={async () => {
                  const newTitle = prompt('Enter new database title:', contextMenu.item.title);
                  if (newTitle && newTitle.trim()) {
                    const { updateDatabase } = useWorkspace();
                    await updateDatabase({ id: contextMenu.id, title: newTitle.trim() });
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename Database</span>
              </button>
              <button
                onClick={() => toggleFavorite(contextMenu.id, 'database')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Star className={`w-3.5 h-3.5 ${contextMenu.item.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>{contextMenu.item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
              <button
                onClick={async () => {
                  if (window.confirm(`Delete database "${contextMenu.item.title}" and all its records?`)) {
                    await deleteDatabase(contextMenu.id);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Database</span>
              </button>
            </>
          )}

          {contextMenu.type === 'canvas' && (
            <>
              <button
                onClick={async () => {
                  const newTitle = prompt('Enter new canvas title:', contextMenu.item.title);
                  if (newTitle && newTitle.trim()) {
                    await updateCanvas({ id: contextMenu.id, title: newTitle.trim() });
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename Canvas</span>
              </button>
              <button
                onClick={() => toggleFavorite(contextMenu.id, 'canvas')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Star className={`w-3.5 h-3.5 ${contextMenu.item.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>{contextMenu.item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
              <button
                onClick={async () => {
                  if (window.confirm(`Delete canvas "${contextMenu.item.title}"?`)) {
                    await deleteCanvas(contextMenu.id);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Canvas</span>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};
