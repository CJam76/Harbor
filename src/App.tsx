import React, { useState, useEffect } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './components/landing/LandingPage';
import { Editor } from './components/editor/Editor';
import { DatabaseViewContainer } from './components/database/DatabaseViewContainer';
import { GraphView } from './components/graph/GraphView';
import { CanvasView } from './components/canvas/CanvasView';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { ExportImportModal } from './components/modals/ExportImportModal';
import { NewSpaceModal } from './components/modals/NewSpaceModal';
import { NewDatabaseModal } from './components/modals/NewDatabaseModal';
import { QuickCaptureModal } from './components/modals/QuickCaptureModal';
import { TrashModal } from './components/modals/TrashModal';
import { Loader2, X, PanelLeft } from 'lucide-react';

const WorkspaceShell: React.FC = () => {
  const {
    isLandingPage,
    isGraphView,
    activePageId,
    activeDatabaseId,
    activeCanvasId,
    isLoading,
    isSidebarOpen,
    setSidebarOpen,
    isInspectorOpen,
    toggleInspector,
    toggleCommandPalette,
    isQuickCaptureOpen,
    setIsQuickCaptureOpen,
    openDailyNote,
    tabs,
    activeTabId,
    closeTab,
    isSplitView,
    secondaryTab,
    toggleSplitView,
    closeSplitView,
    createPage,
    activeSpaceId,
    spaces,
    isZenMode,
    setIsZenMode,
    toggleZenMode,
    toggleTypewriterMode,
    isTrashOpen,
    setIsTrashOpen,
  } = useWorkspace();

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [newSpaceModalOpen, setNewSpaceModalOpen] = useState(false);
  const [newDbModalState, setNewDbModalState] = useState<{ open: boolean; spaceId: string | null }>({
    open: false,
    spaceId: null,
  });

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+N: Quick Capture
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickCaptureOpen(!isQuickCaptureOpen);
      }
      // Ctrl+Alt+D: Today's Daily Note
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        openDailyNote();
      }
      // Ctrl+\: Toggle Split View
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleSplitView();
      }
      // Ctrl+W: Close active tab
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeTab(activeTabId);
      }
      // Ctrl+N or Ctrl+T: New Note
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        const spaceId = activeSpaceId || (spaces[0] ? spaces[0].id : 'default');
        createPage(spaceId, null, 'Untitled Note');
      }
      // F11 or Ctrl+Shift+F: Toggle Zen Focus Mode
      if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        toggleZenMode();
      }
      // Escape: Exit Zen Focus Mode
      if (e.key === 'Escape' && isZenMode) {
        e.preventDefault();
        setIsZenMode(false);
      }
      // Ctrl+Shift+T: Toggle Typewriter Mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTypewriterMode();
      }
      // Ctrl+B: Toggle Navigation Sidebar
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      // Ctrl+Shift+O: Toggle Document Inspector
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        toggleInspector();
      }
      // Ctrl+P / Cmd+P: Obsidian Command Palette
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isQuickCaptureOpen,
    openDailyNote,
    setIsQuickCaptureOpen,
    toggleSplitView,
    closeTab,
    activeTabId,
    createPage,
    activeSpaceId,
    spaces,
    isZenMode,
    toggleZenMode,
    setIsZenMode,
    toggleTypewriterMode,
    setSidebarOpen,
    toggleInspector,
    toggleCommandPalette,
  ]);

  // Desktop Electron global hotkey bridge listener
  useEffect(() => {
    if (window.electronAPI?.onQuickCapture) {
      const unsub = window.electronAPI.onQuickCapture(() => {
        setIsQuickCaptureOpen(true);
      });
      return unsub;
    }
  }, [setIsQuickCaptureOpen]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f4f7fa] dark:bg-[#070b14] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0284c7] mb-3" />
        <span className="text-xs font-mono tracking-widest uppercase">Opening Harbor Vault...</span>
      </div>
    );
  }

  const currentActiveTab = tabs.find(t => t.id === activeTabId);
  const primaryType = currentActiveTab
    ? currentActiveTab.type
    : isLandingPage
    ? 'landing'
    : isGraphView
    ? 'graph'
    : activeCanvasId
    ? 'canvas'
    : activePageId
    ? 'page'
    : activeDatabaseId
    ? 'database'
    : 'landing';
  const primaryTargetId = currentActiveTab
    ? currentActiveTab.targetId
    : activeCanvasId || activePageId || activeDatabaseId || undefined;

  const renderView = (tabType: string, targetId?: string, isSecondary = false) => {
    if (tabType === 'graph') {
      return <GraphView />;
    }
    if (tabType === 'canvas' && targetId) {
      return <CanvasView canvasId={targetId} />;
    }
    if (tabType === 'landing') {
      return (
        <LandingPage
          onOpenNewSpaceModal={() => setNewSpaceModalOpen(true)}
          onOpenNewDbModal={spaceId => setNewDbModalState({ open: true, spaceId })}
        />
      );
    }
    if (tabType === 'database' && targetId) {
      return <DatabaseViewContainer databaseId={targetId} />;
    }
    if (tabType === 'page' && targetId) {
      return <Editor pageId={targetId} isSecondaryPane={isSecondary} />;
    }

    // Default / Fallback routing
    if (isGraphView) return <GraphView />;
    if (activeCanvasId) return <CanvasView canvasId={activeCanvasId} />;
    if (isLandingPage) {
      return (
        <LandingPage
          onOpenNewSpaceModal={() => setNewSpaceModalOpen(true)}
          onOpenNewDbModal={spaceId => setNewDbModalState({ open: true, spaceId })}
        />
      );
    }
    if (activePageId) return <Editor pageId={activePageId} isSecondaryPane={isSecondary} />;
    if (activeDatabaseId) return <DatabaseViewContainer databaseId={activeDatabaseId} />;

    return (
      <LandingPage
        onOpenNewSpaceModal={() => setNewSpaceModalOpen(true)}
        onOpenNewDbModal={spaceId => setNewDbModalState({ open: true, spaceId })}
      />
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f7fa] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans">
      {/* Collapsible Left Sidebar (Hidden in Zen Focus Mode) */}
      {!isZenMode && (
        <Sidebar
          onOpenNewSpaceModal={() => setNewSpaceModalOpen(true)}
          onOpenNewDbModal={spaceId => setNewDbModalState({ open: true, spaceId })}
        />
      )}

      {/* Floating Edge Expand Button when Sidebar is Collapsed */}
      {!isSidebarOpen && !isZenMode && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-14 z-30 flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 bg-white/95 dark:bg-[#0b1120]/95 border border-l-0 border-slate-200/90 dark:border-slate-800 shadow-md text-slate-500 hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none transition-all group backdrop-blur-xs select-none"
          title="Expand sidebar (Ctrl+B)"
        >
          <PanelLeft className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-mono tracking-tight hidden group-hover:inline">
            Sidebar (Ctrl+B)
          </span>
        </button>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Sticky Header (Hidden in Zen Focus Mode) */}
        {!isZenMode && <Header onOpenExportModal={() => setExportModalOpen(true)} />}

        {/* Workspace Tab Bar (Hidden in Zen Focus Mode) */}
        {!isZenMode && <TabBar />}

        {/* Dynamic Route View (Single Pane or Dual Split Pane) */}
        <div className="flex-1 flex overflow-hidden relative">
          {isSplitView && secondaryTab ? (
            <div className="flex-1 flex flex-row h-full w-full overflow-hidden">
              {/* Primary Pane (Left) */}
              <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
                {renderView(primaryType, primaryTargetId, false)}
              </div>

              {/* Secondary Pane (Right) */}
              <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col bg-slate-50/40 dark:bg-[#070b14]/40 border-l border-slate-200 dark:border-slate-800">
                {/* Secondary Pane Header */}
                <div className="h-8 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/60 dark:bg-[#0b1120]/60 text-xs text-slate-600 dark:text-slate-400 select-none">
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{secondaryTab.icon || '📄'}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {secondaryTab.title || 'Untitled'}
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500">
                      Split View
                    </span>
                  </div>
                  <button
                    onClick={closeSplitView}
                    title="Close split pane (Ctrl+\)"
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Secondary Pane Body */}
                <div className="flex-1 overflow-hidden relative">
                  {renderView(secondaryTab.type, secondaryTab.targetId, true)}
                </div>
              </div>
            </div>
          ) : (
            // Standard Single Pane View
            <div className="flex-1 flex h-full w-full overflow-hidden">
              {renderView(primaryType, primaryTargetId, false)}
            </div>
          )}
        </div>
      </div>

      {/* Dialog Modals */}
      <CommandPaletteModal />
      <GlobalSearchModal />
      <ExportImportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
      <NewSpaceModal
        isOpen={newSpaceModalOpen}
        onClose={() => setNewSpaceModalOpen(false)}
      />
      <NewDatabaseModal
        isOpen={newDbModalState.open}
        spaceId={newDbModalState.spaceId}
        onClose={() => setNewDbModalState({ open: false, spaceId: null })}
      />
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
      />
      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
