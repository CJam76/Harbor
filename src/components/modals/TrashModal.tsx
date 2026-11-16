import React, { useState } from 'react';
import {
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Database as DbIcon,
  Search,
  Clock
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const {
    pages,
    databases,
    restorePage,
    permanentlyDeletePage,
    restoreDatabase,
    permanentlyDeleteDatabase,
    emptyTrash,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const deletedPages = pages.filter(p => p.isDeleted);
  const deletedDatabases = databases.filter(d => d.isDeleted);
  const totalDeleted = deletedPages.length + deletedDatabases.length;

  const filteredPages = deletedPages.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );
  const filteredDatabases = deletedDatabases.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const calculateDaysRemaining = (deletedAt?: number) => {
    if (!deletedAt) return 30;
    const daysPassed = Math.floor((Date.now() - deletedAt) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const handleEmptyTrash = async () => {
    if (window.confirm('Are you sure you want to permanently empty the trash? All items will be purged forever.')) {
      await emptyTrash();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl h-[75vh] max-h-[640px] flex flex-col rounded-none overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="h-12 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#070b14] shrink-0">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Workspace Trash Can
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5">
              {totalDeleted} {totalDeleted === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {totalDeleted > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 font-medium transition-colors"
              >
                Empty Trash
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Retention Policy Banner */}
        <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>
            Items in trash have a 30-day recovery buffer before being permanently purged.
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120]">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search deleted pages and databases..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Trash Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {totalDeleted === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
              <Trash2 className="w-10 h-10 stroke-1 opacity-40" />
              <p className="font-medium text-slate-500">Trash is empty</p>
              <p className="text-[11px]">Deleted notes and database records will appear here.</p>
            </div>
          ) : filteredPages.length === 0 && filteredDatabases.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No deleted items match "{searchQuery}".
            </div>
          ) : (
            <>
              {/* Deleted Pages */}
              {filteredPages.map(page => {
                const daysLeft = calculateDaysRemaining(page.deletedAt);

                return (
                  <div
                    key={page.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {page.title || 'Untitled'}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{daysLeft} days left</span>
                          <span>•</span>
                          <span>{page.isDatabaseRow ? 'Database Record' : 'Page'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => restorePage(page.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Restore page back to workspace"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Permanently delete "${page.title}"? This cannot be undone.`)) {
                            permanentlyDeletePage(page.id);
                          }
                        }}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Deleted Databases */}
              {filteredDatabases.map(db => {
                const daysLeft = calculateDaysRemaining(db.deletedAt);

                return (
                  <div
                    key={db.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DbIcon className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {db.title || 'Untitled Database'}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{daysLeft} days left</span>
                          <span>•</span>
                          <span>Database</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => restoreDatabase(db.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Restore database"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Permanently delete "${db.title}" and its records? This cannot be undone.`)) {
                            permanentlyDeleteDatabase(db.id);
                          }
                        }}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
