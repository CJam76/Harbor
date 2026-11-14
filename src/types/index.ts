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
  columns: DatabaseColumn[];
  views: DatabaseView[];
  defaultViewId: string;
  createdAt: number;
  updatedAt: number;
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
}

export type TabType = 'page' | 'database' | 'graph' | 'landing';

export interface WorkspaceTab {
  id: string;
  type: TabType;
  targetId?: string; // pageId or databaseId
  title: string;
  icon?: string;
}
