import React, { useState } from 'react';
import {
  Table as TableIcon,
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  ArrowUpDown,
  Columns,
  Download,
  MoreVertical,
  Check,
  Trash2,
  Edit2,
  Image as ImageIcon
} from 'lucide-react';
import { Database, Page, DatabaseColumn, ViewType, ColumnType } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TableView } from './views/TableView';
import { BoardView } from './views/BoardView';
import { ListView } from './views/ListView';
import { CalendarView } from './views/CalendarView';
import { GalleryView } from './views/GalleryView';
import { RecordModal } from './RecordModal';

export interface DatabaseViewContainerProps {
  databaseId?: string;
}

export const DatabaseViewContainer: React.FC<DatabaseViewContainerProps> = ({ databaseId }) => {
  const {
    activeDatabaseId: contextActiveDbId,
    databases,
    pages,
    updateDatabase,
    createDatabaseRow,
    exportDatabaseCSV,
    selectedRowPageId,
    openRowModal,
  } = useWorkspace();

  const effectiveDatabaseId = databaseId || contextActiveDbId;
  const database = databases.find(d => d.id === effectiveDatabaseId);
  const rows = pages.filter(p => p.databaseId === effectiveDatabaseId);

  // Active view state
  const [activeViewId, setActiveViewId] = useState<string>(() => {
    return database?.defaultViewId || (database?.views[0]?.id ?? 'default');
  });

  // Modal / Dropdown states
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);

  // Filter / Sort state
  const [filterColumnId, setFilterColumnId] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortColumnId, setSortColumnId] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // New column form state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');

  if (!database) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Select a database from the sidebar.
      </div>
    );
  }

  const currentView = database.views.find(v => v.id === activeViewId) || database.views[0];

  // Apply filtering
  let filteredRows = [...rows];
  if (filterQuery.trim()) {
    const q = filterQuery.toLowerCase();
    filteredRows = filteredRows.filter(r => {
      if (filterColumnId === 'all') {
        if (r.title.toLowerCase().includes(q)) return true;
        return Object.values(r.properties || {}).some(val =>
          String(val).toLowerCase().includes(q)
        );
      } else {
        const val = r.properties?.[filterColumnId];
        return String(val ?? '').toLowerCase().includes(q);
      }
    });
  }

  // Apply sorting
  if (sortColumnId) {
    filteredRows.sort((a, b) => {
      const valA = a.properties?.[sortColumnId] ?? (sortColumnId === database.columns[0]?.id ? a.title : '');
      const valB = b.properties?.[sortColumnId] ?? (sortColumnId === database.columns[0]?.id ? b.title : '');
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const visibleColumns = database.columns.filter(c =>
    currentView.visibleColumnIds ? currentView.visibleColumnIds.includes(c.id) : true
  );

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    const newColId = `col-${Date.now()}`;
    const newColumn: DatabaseColumn = {
      id: newColId,
      name: newColName.trim(),
      type: newColType,
      width: 150,
      options:
        newColType === 'status' || newColType === 'select'
          ? [
              { id: 'opt-1', label: 'Option 1', color: 'blue' },
              { id: 'opt-2', label: 'Option 2', color: 'emerald' },
            ]
          : undefined,
    };

    const updatedCols = [...database.columns, newColumn];
    const updatedViews = database.views.map(v => ({
      ...v,
      visibleColumnIds: [...v.visibleColumnIds, newColId],
    }));

    await updateDatabase({
      id: database.id,
      columns: updatedCols,
      views: updatedViews,
    });

    setNewColName('');
    setAddColumnModalOpen(false);
  };

  const handleToggleColumnVisibility = async (colId: string) => {
    const isVisible = currentView.visibleColumnIds.includes(colId);
    let next: string[];
    if (isVisible) {
      if (currentView.visibleColumnIds.length <= 1) return; // keep at least 1
      next = currentView.visibleColumnIds.filter(id => id !== colId);
    } else {
      next = [...currentView.visibleColumnIds, colId];
    }

    const updatedViews = database.views.map(v =>
      v.id === currentView.id ? { ...v, visibleColumnIds: next } : v
    );
    await updateDatabase({ id: database.id, views: updatedViews });
  };

  const handleCreateView = async (type: ViewType) => {
    const newViewId = `view-${Date.now()}`;
    const newView = {
      id: newViewId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} View`,
      type,
      visibleColumnIds: database.columns.map(c => c.id),
      groupByColumnId: database.columns.find(c => c.type === 'status' || c.type === 'select')?.id,
    };

    await updateDatabase({
      id: database.id,
      views: [...database.views, newView],
    });
    setActiveViewId(newViewId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f7fa] dark:bg-[#070b14] select-none">
      {/* Database Title & Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="max-w-6xl mx-auto">
          <input
            type="text"
            value={database.title}
            onChange={e => updateDatabase({ id: database.id, title: e.target.value })}
            className="text-2xl sm:text-3xl font-bold tracking-tight bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            placeholder="Database Title..."
          />
          {database.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {database.description}
            </p>
          )}
        </div>
      </div>

      {/* View Switcher Tabs & Database Toolbar */}
      <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#0b111e]/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 py-1">
          {/* View Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {database.views.map(view => {
              const isActive = view.id === currentView.id;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveViewId(view.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-all rounded-none ${
                    isActive
                      ? 'border-[#0284c7] text-[#0284c7] dark:text-[#38bdf8] bg-sky-50/50 dark:bg-sky-950/20'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {view.type === 'table' && <TableIcon className="w-3.5 h-3.5" />}
                  {view.type === 'board' && <LayoutGrid className="w-3.5 h-3.5" />}
                  {view.type === 'list' && <ListIcon className="w-3.5 h-3.5" />}
                  {view.type === 'calendar' && <CalendarIcon className="w-3.5 h-3.5" />}
                  {view.type === 'gallery' && <ImageIcon className="w-3.5 h-3.5" />}
                  <span>{view.name}</span>
                </button>
              );
            })}

            {/* + Add View dropdown trigger */}
            <div className="relative group/addview">
              <button
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Add View"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <div className="hidden group-hover/addview:block absolute left-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass py-1 w-32 z-30 text-xs">
                <button
                  onClick={() => handleCreateView('table')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => handleCreateView('board')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Board</span>
                </button>
                <button
                  onClick={() => handleCreateView('gallery')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Gallery</span>
                </button>
                <button
                  onClick={() => handleCreateView('list')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  onClick={() => handleCreateView('calendar')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Toolbar: Filter, Sort, Columns, CSV Export, + New */}
          <div className="flex items-center gap-1.5">
            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs border rounded-none transition-colors ${
                  filterQuery
                    ? 'border-[#0284c7] text-[#0284c7] bg-sky-50 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>Filter</span>
              </button>

              {filterMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass p-3 w-64 z-30 text-xs space-y-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Filter Records</div>
                  <input
                    type="text"
                    placeholder="Search value..."
                    value={filterQuery}
                    onChange={e => setFilterQuery(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs outline-none"
                  />
                  {filterQuery && (
                    <button
                      onClick={() => setFilterQuery('')}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs border rounded-none transition-colors ${
                  sortColumnId
                    ? 'border-[#0284c7] text-[#0284c7] bg-sky-50 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>Sort</span>
              </button>

              {sortMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass p-3 w-64 z-30 text-xs space-y-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Sort by Column</div>
                  <select
                    value={sortColumnId}
                    onChange={e => setSortColumnId(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs outline-none"
                  >
                    <option value="">None</option>
                    {database.columns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {sortColumnId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSortDirection('asc')}
                        className={`flex-1 py-1 text-center border text-[11px] ${sortDirection === 'asc' ? 'border-[#0284c7] bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        Ascending
                      </button>
                      <button
                        onClick={() => setSortDirection('desc')}
                        className={`flex-1 py-1 text-center border text-[11px] ${sortDirection === 'desc' ? 'border-[#0284c7] bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        Descending
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
                title="Toggle column visibility"
              >
                <Columns className="w-3 h-3" />
                <span className="hidden sm:inline">Columns</span>
              </button>

              {columnMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass p-2 w-48 z-30 text-xs space-y-1">
                  <div className="px-2 py-1 font-semibold uppercase tracking-wider text-[10px] text-slate-400">
                    Visible Columns
                  </div>
                  {database.columns.map(col => {
                    const isVisible = currentView.visibleColumnIds.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleToggleColumnVisibility(col.id)}
                        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none"
                      >
                        <span className="truncate">{col.name}</span>
                        {isVisible && <Check className="w-3.5 h-3.5 text-[#0284c7]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Export CSV */}
            <button
              onClick={() => exportDatabaseCSV(database.id)}
              className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
              title="Export database as CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* + New Record Button */}
            <button
              onClick={async () => {
                const newId = await createDatabaseRow(database.id, 'New Record');
                openRowModal(newId);
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-[#080c14] dark:bg-white text-white dark:text-[#080c14] hover:bg-slate-800 dark:hover:bg-slate-200 rounded-none transition-colors shadow-tactile"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {currentView.type === 'table' && (
            <TableView
              database={database}
              rows={filteredRows}
              visibleColumns={visibleColumns}
              onOpenRow={openRowModal}
              onAddColumn={() => setAddColumnModalOpen(true)}
            />
          )}

          {currentView.type === 'board' && (
            <BoardView
              database={database}
              rows={filteredRows}
              groupByColumnId={currentView.groupByColumnId}
              onOpenRow={openRowModal}
            />
          )}

          {currentView.type === 'list' && (
            <ListView
              database={database}
              rows={filteredRows}
              visibleColumns={visibleColumns}
              onOpenRow={openRowModal}
            />
          )}

          {currentView.type === 'calendar' && (
            <CalendarView
              database={database}
              rows={filteredRows}
              onOpenRow={openRowModal}
            />
          )}

          {currentView.type === 'gallery' && (
            <GalleryView
              database={database}
              rows={filteredRows}
              visibleColumns={visibleColumns}
              onOpenRow={openRowModal}
            />
          )}
        </div>
      </div>

      {/* Record Slide-over Modal */}
      {selectedRowPageId && (
        <RecordModal
          rowId={selectedRowPageId}
          database={database}
          onClose={() => openRowModal(null)}
        />
      )}

      {/* Add Column Dialog */}
      {addColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0b111e] border border-slate-200 dark:border-slate-800 shadow-glass p-6 w-full max-w-sm rounded-none text-xs space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Add New Column
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-medium">Column Name</label>
              <input
                type="text"
                autoFocus
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="e.g. Priority, Est. Hours"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 outline-none focus:border-[#0284c7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-medium">Column Type</label>
              <select
                value={newColType}
                onChange={e => setNewColType(e.target.value as ColumnType)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 outline-none focus:border-[#0284c7]"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="status">Status</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="url">URL</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAddColumnModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColName.trim()}
                className="px-4 py-1.5 bg-[#080c14] dark:bg-white text-white dark:text-[#080c14] font-medium disabled:opacity-50"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
