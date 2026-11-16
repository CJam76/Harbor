export type ColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'relation';

export interface SelectOption {
  id: string;
  label: string;
  color: string; // Hex or tailwind badge color
}

export interface DatabaseColumn {
  id: string;
  name: string;
  type: ColumnType;
  options?: SelectOption[];
  relationDatabaseId?: string; // If relation, target database
  width?: number;
}

export type ViewType = 'table' | 'board' | 'list' | 'calendar' | 'gallery';

export interface FilterRule {
  columnId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty' | 'before' | 'after';
  value: any;
}

export interface SortRule {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DatabaseView {
  id: string;
  name: string;
  type: ViewType;
  filter?: FilterRule[];
  sort?: SortRule[];
  groupByColumnId?: string;
  visibleColumnIds: string[];
}

export interface Database {
  id: string;
  spaceId: string;
  title: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  columns: DatabaseColumn[];
  views: DatabaseView[];
  defaultViewId: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
  isFavorite?: boolean;
}

export interface Page {
  id: string;
  spaceId: string;
  parentId?: string | null; // For unlimited nested pages
  title: string;
  icon?: string;
  coverImage?: string;
  content: string; // Markdown / document text
  isDatabaseRow?: boolean;
  databaseId?: string;
  properties?: Record<string, any>; // For database rows, mapped by columnId
  tags?: string[];
  order?: number;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
  isFavorite?: boolean;
}

export interface PageRevision {
  id: string;
  pageId: string;
  title: string;
  content: string;
  timestamp: number;
  wordCount: number;
}

export interface Space {
  id: string;
  name: string;
  icon?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface BacklinkInfo {
  sourcePageId: string;
  sourcePageTitle: string;
  sourceSpaceName?: string;
  snippet: string;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface WorkspaceBackup {
  version: number;
  exportedAt: string;
  spaces: Space[];
  pages: Page[];
  databases: Database[];
  canvases?: Canvas[];
}

export type CanvasNodeType = 'text' | 'file' | 'image' | 'group';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // Graphic realism accent color (e.g. blue, emerald, amber, rose, purple, slate)
  title?: string;
  text?: string;
  fileId?: string; // target page id if type === 'file'
  url?: string; // image or link url
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  toNode: string;
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  color?: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface Canvas {
  id: string;
  spaceId: string;
  title: string;
  description?: string;
  data: CanvasData;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
  isFavorite?: boolean;
}

export type TabType = 'page' | 'database' | 'graph' | 'landing' | 'canvas';

export interface WorkspaceTab {
  id: string;
  type: TabType;
  targetId?: string; // pageId, databaseId, or canvasId
  title: string;
  icon?: string;
}
