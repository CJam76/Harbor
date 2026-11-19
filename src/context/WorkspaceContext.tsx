import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Database, Page, Space, WorkspaceBackup, BacklinkInfo, DatabaseColumn, WorkspaceTab, TabType, Canvas } from '../types';
import { storage } from '../lib/storage';
import { seedInitialDataIfNeeded } from '../lib/storage/seed';
import { findBacklinks } from '../lib/markdown';
import {
  pickLocalDirectory,
  syncSpaceToLocalFolder,
  importPagesFromLocalFolder,
  isFileSystemAccessSupported
} from '../lib/filesystem';
import {
  formatDailyNoteDate,
  getDueTasksForDate,
  generateDailyNoteContent
} from '../lib/dailyNotes';

export type EditorMode = 'rich' | 'raw';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type TypographyPreference = 'sans' | 'serif';

interface WorkspaceContextType {
  // Navigation & Active items
  activeSpaceId: string | null;
  activePageId: string | null;
  activeDatabaseId: string | null;
  activeCanvasId: string | null;
  isLandingPage: boolean;
  isGraphView: boolean;
  selectedRowPageId: string | null; // For database row slide-over / modal
  
  // Data
  spaces: Space[];
  pages: Page[];
  databases: Database[];
  canvases: Canvas[];
  isLoading: boolean;

  // Preferences
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  typography: TypographyPreference;
  setTypography: (t: TypographyPreference) => void;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isInspectorOpen: boolean;
  setIsInspectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleInspector: () => void;
  isZenMode: boolean;
  setIsZenMode: (zen: boolean | ((prev: boolean) => boolean)) => void;
  toggleZenMode: () => void;
  isTypewriterMode: boolean;
  toggleTypewriterMode: () => void;
  isParagraphFocusMode: boolean;
  toggleParagraphFocusMode: () => void;
  toggleFavorite: (id: string, type?: 'page' | 'database' | 'canvas') => Promise<void>;

  // Status
  saveStatus: SaveStatus;
  lastSavedAt: number | null;

  // Actions - Navigation
  navigateToHome: () => void;
  navigateToGraph: () => void;
  navigateToPage: (pageId: string) => void;
  navigateToDatabase: (databaseId: string) => void;
  navigateToCanvas: (canvasId: string, inSplitPane?: boolean) => void;
  navigateToSpace: (spaceId: string) => void;
  openWikiLink: (targetTitle: string) => void;
  openRowModal: (rowId: string | null) => void;

  // Actions - Spaces
  createSpace: (name: string, icon?: string) => Promise<string>;
  renameSpace: (id: string, name: string) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  reorderSpaces: (spaceIds: string[]) => Promise<void>;

  // Actions - Pages
  createPage: (spaceId: string, parentId?: string | null, title?: string, content?: string) => Promise<string>;
  updatePage: (updates: Partial<Page> & { id: string }) => Promise<void>;
  deletePage: (id: string, soft?: boolean) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  permanentlyDeletePage: (id: string) => Promise<void>;
  duplicatePage: (id: string) => Promise<string>;
  movePage: (pageId: string, newParentId: string | null, targetSpaceId?: string, newOrder?: number) => Promise<void>;

  // Actions - Databases
  createDatabase: (spaceId: string, title: string, template?: 'tasks' | 'assignments' | 'reading' | 'projects' | 'blank') => Promise<string>;
  updateDatabase: (updates: Partial<Database> & { id: string }) => Promise<void>;
  deleteDatabase: (id: string, soft?: boolean) => Promise<void>;
  restoreDatabase: (id: string) => Promise<void>;
  permanentlyDeleteDatabase: (id: string) => Promise<void>;

  // Actions - Canvases
  createCanvas: (spaceId: string, title?: string) => Promise<string>;
  updateCanvas: (updates: Partial<Canvas> & { id: string }) => Promise<void>;
  deleteCanvas: (id: string, soft?: boolean) => Promise<void>;

  // Trash & Revisions
  storageAdapter: typeof storage;
  isTrashOpen: boolean;
  setIsTrashOpen: (open: boolean) => void;
  trashCount: number;
  emptyTrash: () => Promise<void>;

  // Actions - Rows
  createDatabaseRow: (databaseId: string, title?: string, initialProps?: Record<string, any>) => Promise<string>;
  updateDatabaseRow: (rowId: string, properties: Record<string, any>, title?: string) => Promise<void>;
  deleteDatabaseRow: (rowId: string) => Promise<void>;

  // Helpers
  getBacklinksForPage: (pageId: string) => BacklinkInfo[];
  
  // Search & Command Palette
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleCommandPalette: () => void;

  // Daily Notes & Quick Capture
  openDailyNote: (date?: Date) => Promise<string>;
  isQuickCaptureOpen: boolean;
  setIsQuickCaptureOpen: (open: boolean) => void;
  quickCapture: (
    text: string,
    target: 'daily' | 'database' | 'page',
    meta?: { databaseId?: string; spaceId?: string; title?: string }
  ) => Promise<void>;

  // Tabs & Split View
  tabs: WorkspaceTab[];
  activeTabId: string;
  isSplitView: boolean;
  secondaryTab: WorkspaceTab | null;
  openTab: (tab: Omit<WorkspaceTab, 'id'>, inSplitPane?: boolean) => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  toggleSplitView: (targetTab?: WorkspaceTab) => void;
  closeSplitView: () => void;
  setSecondaryTab: (tab: WorkspaceTab | null) => void;

  // Import / Export & Local Folder Sync
  exportWorkspaceJSON: () => Promise<void>;
  importWorkspaceJSON: (jsonData: string, mode?: 'replace' | 'merge') => Promise<void>;
  exportPageMarkdown: (pageId: string) => void;
  exportDatabaseCSV: (databaseId: string) => void;
  importMarkdownFile: (spaceId: string, filename: string, markdownContent: string) => Promise<string>;
  connectedDirectoryHandle: any;
  connectLocalDirectory: () => Promise<boolean>;
  syncSpaceToLocalDirectory: (spaceId: string) => Promise<{ written: number; errors: string[] }>;
  importPagesFromLocalDirectory: (spaceId: string) => Promise<{ imported: number; fileNames: string[] }>;
  resetToSampleData: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active state
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeDatabaseId, setActiveDatabaseId] = useState<string | null>(null);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [isLandingPage, setIsLandingPage] = useState<boolean>(true);
  const [isGraphView, setIsGraphView] = useState<boolean>(false);
  const [selectedRowPageId, setSelectedRowPageId] = useState<string | null>(null);
  const [connectedDirectoryHandle, setConnectedDirectoryHandle] = useState<any>(null);

  // Tabs & Split View state
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    { id: 'tab-landing', type: 'landing', title: 'Dashboard', icon: '🏠' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-landing');
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [secondaryTab, setSecondaryTab] = useState<WorkspaceTab | null>(null);

  // Search & UI
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(prev => !prev);
  }, []);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpenRaw] = useState<boolean>(() => {
    const saved = localStorage.getItem('harbor_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });
  const setSidebarOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setSidebarOpenRaw(prev => {
      const next = typeof open === 'function' ? open(prev) : open;
      localStorage.setItem('harbor_sidebar_open', String(next));
      return next;
    });
  }, []);

  const [isInspectorOpen, setIsInspectorOpenRaw] = useState<boolean>(() => {
    const saved = localStorage.getItem('harbor_inspector_open');
    return saved !== null ? saved === 'true' : false; // Closed by default for clean writing
  });
  const setIsInspectorOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setIsInspectorOpenRaw(prev => {
      const next = typeof open === 'function' ? open(prev) : open;
      localStorage.setItem('harbor_inspector_open', String(next));
      return next;
    });
  }, []);
  const toggleInspector = useCallback(() => {
    setIsInspectorOpenRaw(prev => {
      const next = !prev;
      localStorage.setItem('harbor_inspector_open', String(next));
      return next;
    });
  }, []);

  const [editorMode, setEditorMode] = useState<EditorMode>('rich');
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState<boolean>(() => {
    return localStorage.getItem('harbor_typewriter') === 'true';
  });
  const [isParagraphFocusMode, setIsParagraphFocusMode] = useState<boolean>(() => {
    return localStorage.getItem('harbor_paragraph_focus') === 'true';
  });

  // Trash & Revisions State
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const trashCount = pages.filter(p => p.isDeleted && !p.isDatabaseRow).length + databases.filter(d => d.isDeleted).length;
  const lastRevisionTimeRef = useRef<Record<string, number>>({});
  const lastRevisionContentRef = useRef<Record<string, string>>({});

  const toggleZenMode = useCallback(() => {
    setIsZenMode(prev => !prev);
  }, []);

  const toggleTypewriterMode = useCallback(() => {
    setIsTypewriterMode(prev => {
      const next = !prev;
      localStorage.setItem('harbor_typewriter', String(next));
      return next;
    });
  }, []);

  const toggleParagraphFocusMode = useCallback(() => {
    setIsParagraphFocusMode(prev => {
      const next = !prev;
      localStorage.setItem('harbor_paragraph_focus', String(next));
      return next;
    });
  }, []);
  const [typography, setTypography] = useState<TypographyPreference>(() => {
    return (localStorage.getItem('harbor_typography') as TypographyPreference) || 'sans';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('harbor_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(Date.now());

  // Debounce ref for page saving
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Theme synchronization
  useEffect(() => {
    localStorage.setItem('harbor_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Typography synchronization
  useEffect(() => {
    localStorage.setItem('harbor_typography', typography);
  }, [typography]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Initial Load & Seeding
  const loadWorkspaceData = useCallback(async () => {
    try {
      setIsLoading(true);
      await seedInitialDataIfNeeded(storage);
      const [allSpaces, allPages, allDatabases, allCanvases] = await Promise.all([
        storage.getSpaces(),
        storage.getPages(),
        storage.getDatabases(),
        storage.getCanvases(),
      ]);

      setSpaces(allSpaces);
      setPages(allPages);
      setDatabases(allDatabases);
      setCanvases(allCanvases || []);

      // Default to landing page or initial space
      if (allSpaces.length > 0 && !activeSpaceId) {
        setActiveSpaceId(allSpaces[0].id);
      }
    } catch (err) {
      console.error('Failed to load workspace data from storage:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSpaceId]);

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation handlers
  const navigateToHome = useCallback(() => {
    setIsLandingPage(true);
    setIsGraphView(false);
    setActivePageId(null);
    setActiveDatabaseId(null);
    setSelectedRowPageId(null);

    const tabId = 'tab-landing';
    setTabs(prev => {
      if (prev.some(t => t.id === tabId)) return prev;
      return [{ id: tabId, type: 'landing', title: 'Dashboard', icon: '🏠' }, ...prev];
    });
    setActiveTabId(tabId);
  }, []);

  const navigateToGraph = useCallback(() => {
    setIsGraphView(true);
    setIsLandingPage(false);
    setActivePageId(null);
    setActiveDatabaseId(null);
    setSelectedRowPageId(null);

    const tabId = 'tab-graph';
    setTabs(prev => {
      if (prev.some(t => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: 'graph', title: 'Knowledge Graph', icon: '🕸️' }];
    });
    setActiveTabId(tabId);
  }, []);

  const navigateToPage = useCallback((pageId: string) => {
    const target = pages.find(p => p.id === pageId);
    if (target) {
      setActiveSpaceId(target.spaceId);
      setActivePageId(pageId);
      setActiveDatabaseId(null);
      setIsLandingPage(false);
      setIsGraphView(false);
      setSelectedRowPageId(null);

      const tabId = `tab-page-${pageId}`;
      setTabs(prev => {
        const exists = prev.find(t => t.id === tabId || (t.type === 'page' && t.targetId === pageId));
        if (exists) return prev;
        return [
          ...prev,
          {
            id: tabId,
            type: 'page',
            targetId: pageId,
            title: target.title || 'Untitled',
            icon: target.icon || '📄'
          }
        ];
      });
      setActiveTabId(tabId);
    }
  }, [pages]);

  const navigateToDatabase = useCallback((databaseId: string) => {
    const target = databases.find(d => d.id === databaseId);
    if (target) {
      setActiveSpaceId(target.spaceId);
      setActiveDatabaseId(databaseId);
      setActivePageId(null);
      setActiveCanvasId(null);
      setIsLandingPage(false);
      setIsGraphView(false);
      setSelectedRowPageId(null);

      const tabId = `tab-db-${databaseId}`;
      setTabs(prev => {
        const exists = prev.find(t => t.id === tabId || (t.type === 'database' && t.targetId === databaseId));
        if (exists) return prev;
        return [
          ...prev,
          {
            id: tabId,
            type: 'database',
            targetId: databaseId,
            title: target.title || 'Untitled Database',
            icon: target.icon || '🗄️'
          }
        ];
      });
      setActiveTabId(tabId);
    }
  }, [databases]);

  const navigateToCanvas = useCallback((canvasId: string, inSplitPane = false) => {
    const target = canvases.find(c => c.id === canvasId);
    if (target) {
      if (inSplitPane) {
        setSecondaryTab({
          id: `tab-canvas-${canvasId}`,
          type: 'canvas',
          targetId: canvasId,
          title: target.title || 'Untitled Canvas',
          icon: '🎨',
        });
        setIsSplitView(true);
        return;
      }

      setActiveSpaceId(target.spaceId);
      setActiveCanvasId(canvasId);
      setActivePageId(null);
      setActiveDatabaseId(null);
      setIsLandingPage(false);
      setIsGraphView(false);
      setSelectedRowPageId(null);

      const tabId = `tab-canvas-${canvasId}`;
      setTabs(prev => {
        const exists = prev.find(t => t.id === tabId || (t.type === 'canvas' && t.targetId === canvasId));
        if (exists) return prev;
        return [
          ...prev,
          {
            id: tabId,
            type: 'canvas',
            targetId: canvasId,
            title: target.title || 'Untitled Canvas',
            icon: '🎨',
          },
        ];
      });
      setActiveTabId(tabId);
    }
  }, [canvases]);

  const navigateToSpace = useCallback((spaceId: string) => {
    setActiveSpaceId(spaceId);
    setIsGraphView(false);
    // Find first page or db in this space, or stay on landing page
    const spacePages = pages.filter(p => p.spaceId === spaceId && !p.isDatabaseRow);
    if (spacePages.length > 0) {
      navigateToPage(spacePages[0].id);
    } else {
      const spaceDbs = databases.filter(d => d.spaceId === spaceId);
      if (spaceDbs.length > 0) {
        navigateToDatabase(spaceDbs[0].id);
      } else {
        navigateToHome();
      }
    }
  }, [pages, databases, navigateToPage, navigateToDatabase, navigateToHome]);

  // Tab & Split View Handlers
  const selectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setTabs(currentTabs => {
      const tab = currentTabs.find(t => t.id === tabId);
      if (!tab) return currentTabs;

      if (tab.type === 'page' && tab.targetId) {
        const page = pages.find(p => p.id === tab.targetId);
        if (page) setActiveSpaceId(page.spaceId);
        setActivePageId(tab.targetId);
        setActiveDatabaseId(null);
        setIsLandingPage(false);
        setIsGraphView(false);
      } else if (tab.type === 'database' && tab.targetId) {
        const db = databases.find(d => d.id === tab.targetId);
        if (db) setActiveSpaceId(db.spaceId);
        setActiveDatabaseId(tab.targetId);
        setActivePageId(null);
        setActiveCanvasId(null);
        setIsLandingPage(false);
        setIsGraphView(false);
      } else if (tab.type === 'canvas' && tab.targetId) {
        const c = canvases.find(canvas => canvas.id === tab.targetId);
        if (c) setActiveSpaceId(c.spaceId);
        setActiveCanvasId(tab.targetId);
        setActivePageId(null);
        setActiveDatabaseId(null);
        setIsLandingPage(false);
        setIsGraphView(false);
      } else if (tab.type === 'graph') {
        setIsGraphView(true);
        setIsLandingPage(false);
        setActivePageId(null);
        setActiveDatabaseId(null);
        setActiveCanvasId(null);
      } else if (tab.type === 'landing') {
        setIsLandingPage(true);
        setIsGraphView(false);
        setActivePageId(null);
        setActiveDatabaseId(null);
        setActiveCanvasId(null);
      }
      return currentTabs;
    });
    setSelectedRowPageId(null);
  }, [pages, databases, canvases]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabIndex = prev.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prev;
      const nextTabs = prev.filter(t => t.id !== tabId);

      if (activeTabId === tabId) {
        if (nextTabs.length > 0) {
          const nextIndex = Math.min(tabIndex, nextTabs.length - 1);
          const nextTab = nextTabs[nextIndex];
          setActiveTabId(nextTab.id);
          // Sync routes
          if (nextTab.type === 'page' && nextTab.targetId) {
            const page = pages.find(p => p.id === nextTab.targetId);
            if (page) setActiveSpaceId(page.spaceId);
            setActivePageId(nextTab.targetId);
            setActiveDatabaseId(null);
            setActiveCanvasId(null);
            setIsLandingPage(false);
            setIsGraphView(false);
          } else if (nextTab.type === 'database' && nextTab.targetId) {
            const db = databases.find(d => d.id === nextTab.targetId);
            if (db) setActiveSpaceId(db.spaceId);
            setActiveDatabaseId(nextTab.targetId);
            setActivePageId(null);
            setActiveCanvasId(null);
            setIsLandingPage(false);
            setIsGraphView(false);
          } else if (nextTab.type === 'canvas' && nextTab.targetId) {
            const c = canvases.find(canvas => canvas.id === nextTab.targetId);
            if (c) setActiveSpaceId(c.spaceId);
            setActiveCanvasId(nextTab.targetId);
            setActivePageId(null);
            setActiveDatabaseId(null);
            setIsLandingPage(false);
            setIsGraphView(false);
          } else if (nextTab.type === 'graph') {
            setIsGraphView(true);
            setIsLandingPage(false);
            setActivePageId(null);
            setActiveDatabaseId(null);
            setActiveCanvasId(null);
          } else {
            setIsLandingPage(true);
            setIsGraphView(false);
            setActivePageId(null);
            setActiveDatabaseId(null);
            setActiveCanvasId(null);
          }
        } else {
          const fallbackTab: WorkspaceTab = { id: 'tab-landing', type: 'landing', title: 'Dashboard', icon: '🏠' };
          setActiveTabId(fallbackTab.id);
          setIsLandingPage(true);
          setIsGraphView(false);
          setActivePageId(null);
          setActiveDatabaseId(null);
          setActiveCanvasId(null);
          return [fallbackTab];
        }
      }
      return nextTabs;
    });

    if (secondaryTab?.id === tabId) {
      setSecondaryTab(null);
      setIsSplitView(false);
    }
  }, [activeTabId, secondaryTab, pages, databases, canvases]);

  const openTab = useCallback((tabData: Omit<WorkspaceTab, 'id'>, inSplitPane?: boolean) => {
    const generatedId = `tab-${tabData.type}-${tabData.targetId || Date.now()}`;
    const newTab: WorkspaceTab = { ...tabData, id: generatedId };

    if (inSplitPane) {
      setSecondaryTab(newTab);
      setIsSplitView(true);
      return;
    }

    const existing = tabs.find(t =>
      t.type === tabData.type && (tabData.targetId ? t.targetId === tabData.targetId : true)
    );

    if (existing) {
      selectTab(existing.id);
    } else {
      setTabs(prev => [...prev, newTab]);
      selectTab(newTab.id);
    }
  }, [tabs, selectTab]);

  const toggleSplitView = useCallback((targetTab?: WorkspaceTab) => {
    if (isSplitView && !targetTab) {
      setIsSplitView(false);
      setSecondaryTab(null);
      return;
    }

    if (targetTab) {
      setSecondaryTab(targetTab);
      setIsSplitView(true);
      return;
    }

    // Determine secondary tab
    const anotherTab = tabs.find(t => t.id !== activeTabId);
    if (anotherTab) {
      setSecondaryTab(anotherTab);
    } else {
      const otherPage = pages.find(p => p.id !== activePageId && !p.isDatabaseRow);
      if (otherPage) {
        setSecondaryTab({
          id: `tab-page-${otherPage.id}`,
          type: 'page',
          targetId: otherPage.id,
          title: otherPage.title || 'Untitled',
          icon: otherPage.icon || '📄'
        });
      } else {
        const currentTab = tabs.find(t => t.id === activeTabId) || {
          id: 'tab-landing',
          type: 'landing' as TabType,
          title: 'Dashboard',
          icon: '🏠'
        };
        setSecondaryTab({
          ...currentTab,
          id: `tab-secondary-${currentTab.id}`
        });
      }
    }
    setIsSplitView(true);
  }, [isSplitView, tabs, activeTabId, pages, activePageId]);

  const closeSplitView = useCallback(() => {
    setIsSplitView(false);
    setSecondaryTab(null);
  }, []);

  const openWikiLink = useCallback(async (targetTitle: string) => {
    if (!targetTitle) return;
    const lower = targetTitle.toLowerCase().trim();

    // Check if it's a page title
    const matchingPage = pages.find(p => p.title.toLowerCase().trim() === lower);
    if (matchingPage) {
      navigateToPage(matchingPage.id);
      return;
    }

    // Check if it's a database title
    const matchingDb = databases.find(d => d.title.toLowerCase().trim() === lower);
    if (matchingDb) {
      navigateToDatabase(matchingDb.id);
      return;
    }

    // If not found, create a new page in active space or first space!
    const targetSpaceId = activeSpaceId || (spaces[0] ? spaces[0].id : 'default');
    const newPageId = `page-${Date.now()}`;
    const newPage: Page = {
      id: newPageId,
      spaceId: targetSpaceId,
      parentId: null,
      title: targetTitle,
      icon: 'FileText',
      content: `# ${targetTitle}\n\nCreated via wiki link from another page.`,
      tags: [],
      order: 99,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.savePage(newPage);
    setPages(prev => [...prev, newPage]);
    navigateToPage(newPageId);
  }, [pages, databases, activeSpaceId, spaces, navigateToPage, navigateToDatabase]);

  const openRowModal = useCallback((rowId: string | null) => {
    setSelectedRowPageId(rowId);
  }, []);

  // Space Operations
  const createSpace = useCallback(async (name: string, icon = 'Folder'): Promise<string> => {
    const newId = `space-${Date.now()}`;
    const newSpace: Space = {
      id: newId,
      name,
      icon,
      order: spaces.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storage.saveSpace(newSpace);
    setSpaces(prev => [...prev, newSpace]);
    setActiveSpaceId(newId);
    return newId;
  }, [spaces.length]);

  const renameSpace = useCallback(async (id: string, name: string) => {
    const space = spaces.find(s => s.id === id);
    if (!space) return;
    const updated = { ...space, name, updatedAt: Date.now() };
    await storage.saveSpace(updated);
    setSpaces(prev => prev.map(s => (s.id === id ? updated : s)));
  }, [spaces]);

  const deleteSpace = useCallback(async (id: string) => {
    await storage.deleteSpace(id);
    setSpaces(prev => prev.filter(s => s.id !== id));
    setPages(prev => prev.filter(p => p.spaceId !== id));
    setDatabases(prev => prev.filter(d => d.spaceId !== id));
    if (activeSpaceId === id) {
      navigateToHome();
    }
  }, [activeSpaceId, navigateToHome]);

  const reorderSpaces = useCallback(async (spaceIds: string[]) => {
    await storage.reorderSpaces(spaceIds);
    setSpaces(prev => {
      const copy = [...prev];
      copy.sort((a, b) => spaceIds.indexOf(a.id) - spaceIds.indexOf(b.id));
      return copy;
    });
  }, []);

  // Page Operations
  const createPage = useCallback(async (
    spaceId: string,
    parentId: string | null = null,
    title = 'Untitled Page',
    content = ''
  ): Promise<string> => {
    const newId = `page-${Date.now()}`;
    const defaultMarkdown = content !== '' ? content : (title ? `# ${title}\n\n` : '');
    const newPage: Page = {
      id: newId,
      spaceId,
      parentId,
      title,
      icon: 'FileText',
      content: defaultMarkdown,
      tags: [],
      order: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.savePage(newPage);
    setPages(prev => [...prev, newPage]);
    navigateToPage(newId);
    return newId;
  }, [navigateToPage]);

  const updatePage = useCallback(async (updates: Partial<Page> & { id: string }) => {
    setSaveStatus('saving');

    // Optimistically update memory state
    setPages(prev =>
      prev.map(p => {
        if (p.id === updates.id) {
          return { ...p, ...updates, updatedAt: Date.now() };
        }
        return p;
      })
    );

    if (updates.title !== undefined || updates.icon !== undefined) {
      setTabs(prev =>
        prev.map(t => {
          if (t.type === 'page' && t.targetId === updates.id) {
            return {
              ...t,
              title: updates.title !== undefined ? (updates.title || 'Untitled') : t.title,
              icon: updates.icon !== undefined ? updates.icon : t.icon,
            };
          }
          return t;
        })
      );
      setSecondaryTab(prev => {
        if (prev && prev.type === 'page' && prev.targetId === updates.id) {
          return {
            ...prev,
            title: updates.title !== undefined ? (updates.title || 'Untitled') : prev.title,
            icon: updates.icon !== undefined ? updates.icon : prev.icon,
          };
        }
        return prev;
      });
    }

    // Debounce IndexedDB save to prevent excessive disk writes
    if (saveTimeoutRef.current[updates.id]) {
      clearTimeout(saveTimeoutRef.current[updates.id]);
    }

    saveTimeoutRef.current[updates.id] = setTimeout(async () => {
      try {
        const fullPage = await storage.getPage(updates.id);
        if (fullPage) {
          const merged: Page = {
            ...fullPage,
            ...updates,
            updatedAt: Date.now()
          };
          await storage.savePage(merged);

          // Revision snapshot check
          const lastTime = lastRevisionTimeRef.current[updates.id] || 0;
          const lastContent = lastRevisionContentRef.current[updates.id] || '';
          const currentContent = merged.content || '';
          const timeSinceLastRev = Date.now() - lastTime;
          const charDiff = Math.abs(currentContent.length - lastContent.length);

          if ((timeSinceLastRev > 5 * 60 * 1000 || charDiff >= 50 || lastTime === 0) && currentContent.trim().length > 0) {
            lastRevisionTimeRef.current[updates.id] = Date.now();
            lastRevisionContentRef.current[updates.id] = currentContent;
            await storage.saveRevision({
              id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              pageId: merged.id,
              title: merged.title || 'Untitled',
              content: currentContent,
              timestamp: Date.now(),
              wordCount: currentContent.trim().split(/\s+/).filter(Boolean).length,
            });
          }
        }
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
      } catch (err) {
        console.error('Error auto-saving page:', err);
        setSaveStatus('error');
      }
    }, 400);
  }, []);

  const deletePage = useCallback(async (id: string, soft = true) => {
    await storage.deletePage(id, soft);
    if (soft) {
      setPages(prev =>
        prev.map(p =>
          p.id === id || p.parentId === id
            ? { ...p, isDeleted: true, deletedAt: Date.now() }
            : p
        )
      );
    } else {
      setPages(prev => prev.filter(p => p.id !== id && p.parentId !== id));
    }
    setTabs(prev => prev.filter(t => !(t.type === 'page' && t.targetId === id)));
    setSecondaryTab(prev => {
      if (prev && prev.type === 'page' && prev.targetId === id) {
        setIsSplitView(false);
        return null;
      }
      return prev;
    });
    if (activePageId === id) {
      navigateToHome();
    }
  }, [activePageId, navigateToHome]);

  const restorePage = useCallback(async (id: string) => {
    await storage.restorePage(id);
    setPages(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, isDeleted: false, deletedAt: undefined }
          : p
      )
    );
  }, []);

  const permanentlyDeletePage = useCallback(async (id: string) => {
    await storage.permanentlyDeletePage(id);
    setPages(prev => prev.filter(p => p.id !== id));
  }, []);

  const duplicatePage = useCallback(async (id: string): Promise<string> => {
    const original = pages.find(p => p.id === id);
    if (!original) throw new Error("Page not found");

    const newId = `page-${Date.now()}`;
    const copy: Page = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.savePage(copy);
    setPages(prev => [...prev, copy]);
    navigateToPage(newId);
    return newId;
  }, [pages, navigateToPage]);

  const movePage = useCallback(async (
    pageId: string,
    newParentId: string | null,
    targetSpaceId?: string,
    newOrder?: number
  ) => {
    await storage.movePage(pageId, newParentId, targetSpaceId, newOrder);
    setPages(prev =>
      prev.map(p => {
        if (p.id === pageId) {
          return {
            ...p,
            parentId: newParentId,
            spaceId: targetSpaceId || p.spaceId,
            order: newOrder !== undefined ? newOrder : p.order,
            updatedAt: Date.now(),
          };
        }
        return p;
      })
    );
  }, []);

  // Database Operations
  const createDatabase = useCallback(async (
    spaceId: string,
    title: string,
    template: 'tasks' | 'assignments' | 'reading' | 'projects' | 'blank' = 'blank'
  ): Promise<string> => {
    const newDbId = `db-${Date.now()}`;
    let columns: DatabaseColumn[] = [
      { id: 'col-name', name: 'Name', type: 'text', width: 260 },
      {
        id: 'col-status',
        name: 'Status',
        type: 'status',
        width: 140,
        options: [
          { id: 'st-todo', label: 'To Do', color: 'slate' },
          { id: 'st-prog', label: 'In Progress', color: 'blue' },
          { id: 'st-done', label: 'Done', color: 'emerald' },
        ]
      },
      { id: 'col-date', name: 'Date', type: 'date', width: 140 },
    ];

    if (template === 'tasks') {
      columns = [
        { id: 'col-task', name: 'Task', type: 'text', width: 280 },
        {
          id: 'col-status',
          name: 'Status',
          type: 'status',
          width: 140,
          options: [
            { id: 't-backlog', label: 'Backlog', color: 'slate' },
            { id: 't-doing', label: 'In Progress', color: 'blue' },
            { id: 't-done', label: 'Done', color: 'emerald' },
          ]
        },
        {
          id: 'col-priority',
          name: 'Priority',
          type: 'select',
          width: 130,
          options: [
            { id: 'p-urgent', label: 'Urgent', color: 'rose' },
            { id: 'p-high', label: 'High', color: 'amber' },
            { id: 'p-med', label: 'Medium', color: 'blue' },
            { id: 'p-low', label: 'Low', color: 'slate' },
          ]
        },
        { id: 'col-due', name: 'Due Date', type: 'date', width: 140 },
        { id: 'col-done', name: 'Done', type: 'checkbox', width: 90 },
      ];
    } else if (template === 'assignments') {
      columns = [
        { id: 'col-deliv', name: 'Deliverable', type: 'text', width: 260 },
        {
          id: 'col-course',
          name: 'Course',
          type: 'select',
          width: 150,
          options: [
            { id: 'c-1', label: 'Course 1', color: 'blue' },
            { id: 'c-2', label: 'Course 2', color: 'emerald' },
          ]
        },
        { id: 'col-due', name: 'Due Date', type: 'date', width: 140 },
        {
          id: 'col-status',
          name: 'Status',
          type: 'status',
          width: 140,
          options: [
            { id: 's-not', label: 'Not Started', color: 'slate' },
            { id: 's-prog', label: 'In Progress', color: 'blue' },
            { id: 's-done', label: 'Submitted', color: 'emerald' },
          ]
        },
        { id: 'col-grade', name: 'Grade / Pts', type: 'text', width: 110 }
      ];
    } else if (template === 'reading') {
      columns = [
        { id: 'col-book', name: 'Title', type: 'text', width: 260 },
        { id: 'col-author', name: 'Author', type: 'text', width: 160 },
        {
          id: 'col-status',
          name: 'Status',
          type: 'status',
          width: 140,
          options: [
            { id: 'r-want', label: 'Want to Read', color: 'slate' },
            { id: 'r-now', label: 'Reading', color: 'blue' },
            { id: 'r-fin', label: 'Finished', color: 'emerald' },
          ]
        },
        { id: 'col-rating', name: 'Rating (1-5)', type: 'number', width: 120 },
      ];
    } else if (template === 'projects') {
      columns = [
        { id: 'col-project', name: 'Project / Initiative', type: 'text', width: 260 },
        {
          id: 'col-status',
          name: 'Status',
          type: 'status',
          width: 140,
          options: [
            { id: 'st-plan', label: 'Planning', color: 'slate' },
            { id: 'st-active', label: 'In Execution', color: 'blue' },
            { id: 'st-review', label: 'Review', color: 'amber' },
            { id: 'st-comp', label: 'Completed', color: 'emerald' },
          ]
        },
        {
          id: 'col-priority',
          name: 'Priority',
          type: 'select',
          width: 130,
          options: [
            { id: 'p-p0', label: 'P0 - Blocker', color: 'rose' },
            { id: 'p-p1', label: 'P1 - High', color: 'amber' },
            { id: 'p-p2', label: 'P2 - Medium', color: 'blue' },
            { id: 'p-p3', label: 'P3 - Low', color: 'slate' },
          ]
        },
        { id: 'col-owner', name: 'Lead / Owner', type: 'text', width: 140 },
        { id: 'col-target', name: 'Target Date', type: 'date', width: 140 },
        { id: 'col-milestone', name: 'Milestone Met', type: 'checkbox', width: 110 },
      ];
    }

    const defaultView = {
      id: `view-default-${Date.now()}`,
      name: 'Default Table',
      type: 'table' as const,
      visibleColumnIds: columns.map(c => c.id),
    };

    const newDb: Database = {
      id: newDbId,
      spaceId,
      title,
      icon: 'Database',
      columns,
      views: [
        defaultView,
        {
          id: `view-board-${Date.now()}`,
          name: 'Board',
          type: 'board' as const,
          groupByColumnId: 'col-status',
          visibleColumnIds: columns.map(c => c.id)
        }
      ],
      defaultViewId: defaultView.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.saveDatabase(newDb);
    setDatabases(prev => [...prev, newDb]);
    navigateToDatabase(newDbId);
    return newDbId;
  }, [navigateToDatabase]);

  const updateDatabase = useCallback(async (updates: Partial<Database> & { id: string }) => {
    const current = databases.find(d => d.id === updates.id);
    if (!current) return;
    const merged: Database = { ...current, ...updates, updatedAt: Date.now() };
    await storage.saveDatabase(merged);
    setDatabases(prev => prev.map(d => (d.id === updates.id ? merged : d)));

    if (updates.title !== undefined || updates.icon !== undefined) {
      setTabs(prev =>
        prev.map(t => {
          if (t.type === 'database' && t.targetId === updates.id) {
            return {
              ...t,
              title: updates.title !== undefined ? (updates.title || 'Untitled Database') : t.title,
              icon: updates.icon !== undefined ? updates.icon : t.icon,
            };
          }
          return t;
        })
      );
      setSecondaryTab(prev => {
        if (prev && prev.type === 'database' && prev.targetId === updates.id) {
          return {
            ...prev,
            title: updates.title !== undefined ? (updates.title || 'Untitled Database') : prev.title,
            icon: updates.icon !== undefined ? updates.icon : prev.icon,
          };
        }
        return prev;
      });
    }
  }, [databases]);

  const deleteDatabase = useCallback(async (id: string, soft = true) => {
    await storage.deleteDatabase(id, soft);
    if (soft) {
      setDatabases(prev =>
        prev.map(d => (d.id === id ? { ...d, isDeleted: true, deletedAt: Date.now() } : d))
      );
      setPages(prev =>
        prev.map(p => (p.databaseId === id ? { ...p, isDeleted: true, deletedAt: Date.now() } : p))
      );
    } else {
      setDatabases(prev => prev.filter(d => d.id !== id));
      setPages(prev => prev.filter(p => p.databaseId !== id));
    }
    setTabs(prev => prev.filter(t => !(t.type === 'database' && t.targetId === id)));
    setSecondaryTab(prev => {
      if (prev && prev.type === 'database' && prev.targetId === id) {
        setIsSplitView(false);
        return null;
      }
      return prev;
    });
    if (activeDatabaseId === id) {
      navigateToHome();
    }
  }, [activeDatabaseId, navigateToHome]);

  const restoreDatabase = useCallback(async (id: string) => {
    await storage.restoreDatabase(id);
    setDatabases(prev =>
      prev.map(d => (d.id === id ? { ...d, isDeleted: false, deletedAt: undefined } : d))
    );
    setPages(prev =>
      prev.map(p => (p.databaseId === id ? { ...p, isDeleted: false, deletedAt: undefined } : p))
    );
  }, []);

  const permanentlyDeleteDatabase = useCallback(async (id: string) => {
    await storage.permanentlyDeleteDatabase(id);
    setDatabases(prev => prev.filter(d => d.id !== id));
    setPages(prev => prev.filter(p => p.databaseId !== id));
  }, []);

  const emptyTrash = useCallback(async () => {
    await storage.emptyTrash();
    setPages(prev => prev.filter(p => !p.isDeleted));
    setDatabases(prev => prev.filter(d => !d.isDeleted));
  }, []);

  const toggleFavorite = useCallback(async (id: string, type: 'page' | 'database' | 'canvas' = 'page') => {
    if (type === 'page') {
      const p = pages.find(item => item.id === id);
      if (!p) return;
      const updated: Page = { ...p, isFavorite: !p.isFavorite, updatedAt: Date.now() };
      await storage.savePage(updated);
      setPages(prev => prev.map(item => item.id === id ? updated : item));
    } else if (type === 'canvas') {
      const c = canvases.find(item => item.id === id);
      if (!c) return;
      const updated: Canvas = { ...c, isFavorite: !c.isFavorite, updatedAt: Date.now() };
      await storage.saveCanvas(updated);
      setCanvases(prev => prev.map(item => item.id === id ? updated : item));
    } else {
      const d = databases.find(item => item.id === id);
      if (!d) return;
      const updated: Database = { ...d, isFavorite: !d.isFavorite, updatedAt: Date.now() };
      await storage.saveDatabase(updated);
      setDatabases(prev => prev.map(item => item.id === id ? updated : item));
    }
  }, [pages, databases, canvases]);

  // Actions - Canvases
  const createCanvas = useCallback(async (spaceId: string, title = 'Untitled Canvas'): Promise<string> => {
    const newCanvasId = `canvas-${Date.now()}`;
    const newCanvas: Canvas = {
      id: newCanvasId,
      spaceId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: {
        nodes: [
          {
            id: `cnode-${Date.now()}-1`,
            type: 'text',
            x: 80,
            y: 80,
            width: 280,
            height: 160,
            color: 'blue',
            title: 'Welcome to Canvas',
            text: 'Drag cards, add markdown notes, embed workspace documents, or connect nodes with directional arrows.',
          },
        ],
        edges: [],
      },
    };
    await storage.saveCanvas(newCanvas);
    setCanvases(prev => [newCanvas, ...prev]);
    navigateToCanvas(newCanvasId);
    return newCanvasId;
  }, [navigateToCanvas]);

  const updateCanvas = useCallback(async (updates: Partial<Canvas> & { id: string }) => {
    const current = canvases.find(c => c.id === updates.id);
    if (!current) return;
    const merged: Canvas = { ...current, ...updates, updatedAt: Date.now() };
    await storage.saveCanvas(merged);
    setCanvases(prev => prev.map(c => (c.id === updates.id ? merged : c)));

    if (updates.title !== undefined) {
      setTabs(prev =>
        prev.map(t => {
          if (t.type === 'canvas' && t.targetId === updates.id) {
            return {
              ...t,
              title: updates.title || 'Untitled Canvas',
            };
          }
          return t;
        })
      );
      setSecondaryTab(prev => {
        if (prev && prev.type === 'canvas' && prev.targetId === updates.id) {
          return {
            ...prev,
            title: updates.title || 'Untitled Canvas',
          };
        }
        return prev;
      });
    }
  }, [canvases]);

  const deleteCanvas = useCallback(async (id: string, soft = true) => {
    await storage.deleteCanvas(id, soft);
    if (soft) {
      setCanvases(prev =>
        prev.map(c => (c.id === id ? { ...c, isDeleted: true, deletedAt: Date.now() } : c))
      );
    } else {
      setCanvases(prev => prev.filter(c => c.id !== id));
    }
    setTabs(prev => prev.filter(t => !(t.type === 'canvas' && t.targetId === id)));
    setSecondaryTab(prev => {
      if (prev && prev.type === 'canvas' && prev.targetId === id) {
        setIsSplitView(false);
        return null;
      }
      return prev;
    });
    if (activeCanvasId === id) {
      navigateToHome();
    }
  }, [activeCanvasId, navigateToHome]);

  // Database Row Operations (Rows are Pages with isDatabaseRow: true)
  const createDatabaseRow = useCallback(async (
    databaseId: string,
    title = 'New Item',
    initialProps: Record<string, any> = {}
  ): Promise<string> => {
    const db = databases.find(d => d.id === databaseId);
    if (!db) throw new Error("Database not found");

    const newRowId = `row-${Date.now()}`;
    const firstCol = db.columns[0];
    const properties = { ...initialProps };
    if (firstCol && !properties[firstCol.id]) {
      properties[firstCol.id] = title;
    }

    const newRowPage: Page = {
      id: newRowId,
      spaceId: db.spaceId,
      databaseId,
      isDatabaseRow: true,
      title,
      properties,
      content: `# ${title}\n\nAdd details, notes, sub-tasks, or research for this record.`,
      tags: [],
      order: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.savePage(newRowPage);
    setPages(prev => [...prev, newRowPage]);
    return newRowId;
  }, [databases]);

  const updateDatabaseRow = useCallback(async (
    rowId: string,
    properties: Record<string, any>,
    title?: string
  ) => {
    const existing = pages.find(p => p.id === rowId);
    if (!existing) return;

    const updatedTitle = title !== undefined ? title : (properties[Object.keys(properties)[0]] || existing.title);
    const updatedPage: Page = {
      ...existing,
      title: updatedTitle,
      properties: { ...existing.properties, ...properties },
      updatedAt: Date.now(),
    };

    await storage.savePage(updatedPage);
    setPages(prev => prev.map(p => (p.id === rowId ? updatedPage : p)));
  }, [pages]);

  const deleteDatabaseRow = useCallback(async (rowId: string) => {
    await storage.deletePage(rowId);
    setPages(prev => prev.filter(p => p.id !== rowId));
    if (selectedRowPageId === rowId) {
      setSelectedRowPageId(null);
    }
  }, [selectedRowPageId]);

  // Daily Notes & Quick Capture
  const openDailyNote = useCallback(async (date: Date = new Date()): Promise<string> => {
    const { title, dateKey } = formatDailyNoteDate(date);

    // Check if daily note already exists for this date
    const existing = pages.find(
      p =>
        p.title.toLowerCase() === title.toLowerCase() ||
        p.tags?.includes(`daily-${dateKey}`) ||
        (p.tags?.includes('daily-notes') && p.title.includes(dateKey))
    );

    if (existing) {
      navigateToPage(existing.id);
      return existing.id;
    }

    // Determine target space: look for space named 'Personal', 'Journal', 'Daily', or first space
    const targetSpace =
      spaces.find(s => /personal|journal|daily|notes/i.test(s.name)) ||
      spaces[0];

    let targetSpaceId = targetSpace?.id;
    if (!targetSpaceId) {
      targetSpaceId = await createSpace('Personal', 'Compass');
    }

    // Pull tasks due today from all databases
    const dueTasks = getDueTasksForDate(dateKey, databases, pages);

    // Generate markdown template
    const content = generateDailyNoteContent(date, dueTasks);

    // Create the page with daily tags
    const newPageId = await createPage(targetSpaceId, null, title, content);

    await updatePage({
      id: newPageId,
      tags: ['daily-notes', `daily-${dateKey}`],
    });

    navigateToPage(newPageId);
    return newPageId;
  }, [pages, spaces, databases, createPage, updatePage, navigateToPage, createSpace]);

  const quickCapture = useCallback(
    async (
      text: string,
      target: 'daily' | 'database' | 'page',
      meta?: { databaseId?: string; spaceId?: string; title?: string }
    ) => {
      if (target === 'daily') {
        const { title, dateKey } = formatDailyNoteDate(new Date());
        let dailyPage = pages.find(
          p =>
            p.title.toLowerCase() === title.toLowerCase() ||
            p.tags?.includes(`daily-${dateKey}`)
        );

        let targetPageId = dailyPage?.id;
        if (!dailyPage) {
          targetPageId = await openDailyNote();
          dailyPage = pages.find(p => p.id === targetPageId);
        }

        if (targetPageId) {
          const isTodo = text.startsWith('- [ ] ') || text.startsWith('[] ');
          const formattedEntry = isTodo ? text : `- [ ] ${text}`;
          const currentContent = dailyPage?.content || '';

          let updatedContent = '';
          if (currentContent.includes('## 📋 Daily Priorities')) {
            updatedContent = currentContent.replace(
              '## 📋 Daily Priorities',
              `## 📋 Daily Priorities\n${formattedEntry}`
            );
          } else {
            updatedContent = `${currentContent}\n\n## ⚡ Quick Capture\n${formattedEntry}`;
          }

          await updatePage({ id: targetPageId, content: updatedContent });
        }
      } else if (target === 'database' && meta?.databaseId) {
        await createDatabaseRow(meta.databaseId, text);
      } else if (target === 'page') {
        const targetSpaceId = meta?.spaceId || spaces[0]?.id;
        if (targetSpaceId) {
          const pageTitle = meta?.title?.trim() || text.split('\n')[0].substring(0, 40) || 'Quick Note';
          await createPage(targetSpaceId, null, pageTitle, text);
        }
      }
    },
    [pages, spaces, openDailyNote, updatePage, createDatabaseRow, createPage]
  );

  // Backlinks calculation
  const getBacklinksForPage = useCallback((pageId: string): BacklinkInfo[] => {
    const targetPage = pages.find(p => p.id === pageId);
    if (!targetPage) return [];
    return findBacklinks(targetPage.title, pages.filter(p => !p.isDeleted), pageId);
  }, [pages]);

  // Export / Import
  const exportWorkspaceJSON = useCallback(async () => {
    const backup = await storage.exportWorkspace();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `harbor-vault-${new Date().toISOString().split('T')[0]}.harbor.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, []);

  const importWorkspaceJSON = useCallback(async (jsonData: string, mode: 'replace' | 'merge' = 'replace') => {
    const backup: WorkspaceBackup = JSON.parse(jsonData);
    await storage.importWorkspace(backup, mode);
    await loadWorkspaceData();
    navigateToHome();
  }, [loadWorkspaceData, navigateToHome]);

  const exportPageMarkdown = useCallback((pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    const blob = new Blob([page.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title.replace(/[^\w\s-]/g, '') || 'page'}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [pages]);

  const exportDatabaseCSV = useCallback((databaseId: string) => {
    const db = databases.find(d => d.id === databaseId);
    if (!db) return;
    const rows = pages.filter(p => p.databaseId === databaseId);

    const headers = db.columns.map(c => `"${c.name.replace(/"/g, '""')}"`);
    const csvLines = [headers.join(',')];

    for (const row of rows) {
      const line = db.columns.map(col => {
        const val = row.properties?.[col.id] ?? '';
        let displayVal = val;
        if (col.type === 'select' || col.type === 'status') {
          const opt = col.options?.find(o => o.id === val);
          if (opt) displayVal = opt.label;
        } else if (col.type === 'checkbox') {
          displayVal = val ? 'TRUE' : 'FALSE';
        }
        return `"${String(displayVal).replace(/"/g, '""')}"`;
      });
      csvLines.push(line.join(','));
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${db.title.replace(/[^\w\s-]/g, '') || 'database'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [databases, pages]);

  const importMarkdownFile = useCallback(async (
    spaceId: string,
    filename: string,
    markdownContent: string
  ): Promise<string> => {
    const cleanTitle = filename.replace(/\.md$/i, '') || 'Imported Note';
    return await createPage(spaceId, null, cleanTitle, markdownContent);
  }, [createPage]);

  // Local Directory Mirror / Sync (Obsidian Vault Sync)
  const connectLocalDirectory = useCallback(async () => {
    const handle = await pickLocalDirectory();
    if (handle) {
      setConnectedDirectoryHandle(handle);
      return true;
    }
    return false;
  }, []);

  const syncSpaceToLocalDirectory = useCallback(async (spaceId: string) => {
    let handle = connectedDirectoryHandle;
    if (!handle) {
      handle = await pickLocalDirectory();
      if (!handle) throw new Error("No folder selected");
      setConnectedDirectoryHandle(handle);
    }
    const space = spaces.find(s => s.id === spaceId);
    const spacePages = pages.filter(p => p.spaceId === spaceId && !p.isDatabaseRow);
    return await syncSpaceToLocalFolder(handle, space?.name || 'Workspace', spacePages);
  }, [connectedDirectoryHandle, spaces, pages]);

  const importPagesFromLocalDirectory = useCallback(async (spaceId: string) => {
    let handle = connectedDirectoryHandle;
    if (!handle) {
      handle = await pickLocalDirectory();
      if (!handle) throw new Error("No folder selected");
      setConnectedDirectoryHandle(handle);
    }
    return await importPagesFromLocalFolder(handle, spaceId, async (newPage) => {
      await storage.savePage(newPage);
      setPages(prev => [...prev.filter(p => p.id !== newPage.id), newPage]);
    });
  }, [connectedDirectoryHandle]);

  const resetToSampleData = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('harbor_vault_initialized');
    }
    await storage.clearWorkspace();
    await seedInitialDataIfNeeded(storage);
    await loadWorkspaceData();
    navigateToHome();
  }, [loadWorkspaceData, navigateToHome]);

  return (
    <WorkspaceContext.Provider
      value={{
        activeSpaceId,
        activePageId,
        activeDatabaseId,
        activeCanvasId,
        isLandingPage,
        isGraphView,
        selectedRowPageId,
        spaces,
        pages,
        databases,
        canvases,
        isLoading,
        theme,
        toggleTheme,
        typography,
        setTypography,
        editorMode,
        setEditorMode,
        isSidebarOpen,
        setSidebarOpen,
        isInspectorOpen,
        setIsInspectorOpen,
        toggleInspector,
        toggleFavorite,
        isZenMode,
        setIsZenMode,
        toggleZenMode,
        isTypewriterMode,
        toggleTypewriterMode,
        isParagraphFocusMode,
        toggleParagraphFocusMode,
        saveStatus,
        lastSavedAt,
        navigateToHome,
        navigateToGraph,
        navigateToPage,
        navigateToDatabase,
        navigateToCanvas,
        navigateToSpace,
        openWikiLink,
        openRowModal,
        createSpace,
        renameSpace,
        deleteSpace,
        reorderSpaces,
        createPage,
        updatePage,
        deletePage,
        restorePage,
        permanentlyDeletePage,
        duplicatePage,
        movePage,
        createDatabase,
        updateDatabase,
        deleteDatabase,
        restoreDatabase,
        permanentlyDeleteDatabase,
        createCanvas,
        updateCanvas,
        deleteCanvas,
        storageAdapter: storage,
        isTrashOpen,
        setIsTrashOpen,
        trashCount,
        emptyTrash,
        createDatabaseRow,
        updateDatabaseRow,
        deleteDatabaseRow,
        getBacklinksForPage,
        isSearchOpen,
        setIsSearchOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        toggleCommandPalette,
        openDailyNote,
        isQuickCaptureOpen,
        setIsQuickCaptureOpen,
        quickCapture,
        tabs,
        activeTabId,
        isSplitView,
        secondaryTab,
        openTab,
        closeTab,
        selectTab,
        toggleSplitView,
        closeSplitView,
        setSecondaryTab,
        exportWorkspaceJSON,
        importWorkspaceJSON,
        exportPageMarkdown,
        exportDatabaseCSV,
        importMarkdownFile,
        connectedDirectoryHandle,
        connectLocalDirectory,
        syncSpaceToLocalDirectory,
        importPagesFromLocalDirectory,
        resetToSampleData,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
