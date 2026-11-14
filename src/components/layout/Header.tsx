import React from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Type,
  FileText,
  Code2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Share2,
  Database as DbIcon,
  ChevronRight,
  Anchor,
  Zap,
  CalendarDays,
  Maximize
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface HeaderProps {
  onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExportModal }) => {
  const {
    spaces,
    pages,
    databases,
    activeSpaceId,
    activePageId,
    activeDatabaseId,
    isLandingPage,
    isGraphView,
    navigateToHome,
    navigateToGraph,
    navigateToPage,
    navigateToSpace,
    theme,
    toggleTheme,
    typography,
    setTypography,
    editorMode,
    setEditorMode,
    isSidebarOpen,
    setSidebarOpen,
    saveStatus,
    setIsSearchOpen,
    openDailyNote,
    setIsQuickCaptureOpen,
    toggleZenMode,
  } = useWorkspace();

  const currentSpace = spaces.find(s => s.id === activeSpaceId);
  const currentPage = pages.find(p => p.id === activePageId);
  const currentDb = databases.find(d => d.id === activeDatabaseId);

  // Compute breadcrumbs for nested pages
  const breadcrumbChain: { id: string; title: string; isSpace?: boolean }[] = [];
  if (currentSpace) {
    breadcrumbChain.push({ id: currentSpace.id, title: currentSpace.name, isSpace: true });
  }

  if (currentPage) {
    const parentPages: { id: string; title: string }[] = [];
    let curr = currentPage;
    while (curr && curr.parentId) {
      const parent = pages.find(p => p.id === curr?.parentId);
      if (parent) {
        parentPages.unshift({ id: parent.id, title: parent.title });
        curr = parent;
      } else {
        break;
      }
    }
    breadcrumbChain.push(...parentPages);
    breadcrumbChain.push({ id: currentPage.id, title: currentPage.title });
  } else if (currentDb) {
    breadcrumbChain.push({ id: currentDb.id, title: currentDb.title });
  }

  return (
    <header className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md px-4 flex items-center justify-between select-none z-10 sticky top-0 transition-colors">
      {/* Left section: Sidebar toggle & Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
          {isGraphView ? (
            <button
              onClick={navigateToGraph}
              className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 hover:text-[#0284c7] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Knowledge Graph</span>
            </button>
          ) : isLandingPage ? (
            <button
              onClick={navigateToHome}
              className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100 hover:text-[#0284c7] transition-colors"
            >
              <Anchor className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Harbor Home</span>
            </button>
          ) : (
            breadcrumbChain.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                <button
                  onClick={() => {
                    if (crumb.isSpace) navigateToSpace(crumb.id);
                    else navigateToPage(crumb.id);
                  }}
                  className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors truncate max-w-[140px] ${
                    idx === breadcrumbChain.length - 1
                      ? 'font-semibold text-slate-900 dark:text-slate-100'
                      : ''
                  }`}
                  title={crumb.title}
                >
                  {crumb.title}
                </button>
              </React.Fragment>
            ))
          )}
        </nav>
      </div>

      {/* Right controls: Editor modes, search, typography, theme, export */}
      <div className="flex items-center gap-1.5">
        {/* Autosave Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 px-2 py-0.5 border-r border-slate-200 dark:border-slate-800 mr-1">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-[#0284c7]" />
              <span className="text-slate-500">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-slate-400">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span className="text-rose-500">Save failed</span>
            </>
          )}
        </div>

        {/* Quick Capture Button */}
        <button
          onClick={() => setIsQuickCaptureOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/80 rounded-none transition-colors"
          title="Quick Capture thought or task (Ctrl+Alt+N)"
        >
          <Zap className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline font-medium">Capture</span>
        </button>

        {/* Daily Note Button */}
        <button
          onClick={() => openDailyNote()}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/80 dark:border-sky-800/80 rounded-none transition-colors"
          title="Today's Daily Note (Ctrl+Alt+D)"
        >
          <CalendarDays className="w-3 h-3" />
          <span className="hidden md:inline font-medium">Today</span>
        </button>

        {/* Search Quick Trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-500 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-none transition-colors"
          title="Search anything (Ctrl+K)"
        >
          <Search className="w-3 h-3 text-slate-400" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono bg-white dark:bg-slate-800 px-1 py-0.2 border border-slate-300 dark:border-slate-700 text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Editor Mode Selector (only when a page is active) */}
        {currentPage && (
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-none bg-slate-100 dark:bg-slate-900 p-0.5">
            <button
              onClick={() => setEditorMode('rich')}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-none transition-all ${
                editorMode === 'rich'
                  ? 'bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Rich / Live formatted mode with slash menu"
            >
              <FileText className="w-3 h-3" />
              <span className="hidden sm:inline">Rich</span>
            </button>
            <button
              onClick={() => setEditorMode('raw')}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-none transition-all ${
                editorMode === 'raw'
                  ? 'bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Raw markdown code mode"
            >
              <Code2 className="w-3 h-3" />
              <span className="hidden sm:inline">Raw</span>
            </button>
          </div>
        )}

        {/* Typography Selector (Sans vs Serif) */}
        <button
          onClick={() => setTypography(typography === 'sans' ? 'serif' : 'sans')}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
          title={`Font: ${typography === 'sans' ? 'Modern Sans (switch to Serif)' : 'Refined Serif (switch to Sans)'}`}
        >
          <Type className="w-3.5 h-3.5" />
        </button>

        {/* Portability / Export / Import Trigger */}
        <button
          onClick={onOpenExportModal}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
          title="Backup, export, or import data"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Zen Focus Mode Trigger */}
        <button
          onClick={toggleZenMode}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
          title="Zen Focus Mode (F11 or Ctrl+Shift+F)"
          aria-label="Zen Focus Mode"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
          title={`Theme: currently ${theme} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
