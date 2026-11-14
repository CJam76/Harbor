import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckSquare,
  Type,
  Hash,
  List,
  ExternalLink,
  Trash2,
  Maximize2,
  FileText
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Database, Page, DatabaseColumn } from '../../types';
import { renderMarkdownToHtml } from '../../lib/markdown';

interface RecordModalProps {
  rowId: string;
  database: Database;
  onClose: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  rowId,
  database,
  onClose,
}) => {
  const { pages, updatePage, navigateToPage, updateDatabaseRow, deleteDatabaseRow, typography } = useWorkspace();
  const rowPage = pages.find(p => p.id === rowId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'both' | 'markdown' | 'properties'>('both');

  useEffect(() => {
    if (rowPage) {
      setTitle(rowPage.title);
      setContent(rowPage.content || '');
      setProperties(rowPage.properties || {});
    }
  }, [rowPage?.id]);

  if (!rowPage) return null;

  const handlePropertyChange = (colId: string, value: any) => {
    const updated = { ...properties, [colId]: value };
    setProperties(updated);
    updateDatabaseRow(rowId, updated);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    updateDatabaseRow(rowId, properties, newTitle);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    updatePage({ id: rowId, content: newContent });
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete record "${title}"?`)) {
      await deleteDatabaseRow(rowId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0b111e] border-l border-slate-200 dark:border-slate-800 shadow-glass flex flex-col h-full overflow-hidden">
        {/* Header Bar */}
        <div className="h-12 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{database.title}</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
              {title || 'Untitled Record'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigateToPage(rowId);
              }}
              className="p-1.5 text-slate-400 hover:text-[#0284c7] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
              title="Open as full page in editor"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
              title="Delete Record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Record Title */}
          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Record Name..."
            className="w-full text-2xl font-bold tracking-tight bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
          />

          {/* Structured Properties Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-none bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Properties
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {database.columns.map(col => {
                const val = properties[col.id];

                return (
                  <div key={col.id} className="flex items-center text-xs">
                    <div className="w-36 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {col.type === 'text' && <Type className="w-3.5 h-3.5" />}
                      {col.type === 'number' && <Hash className="w-3.5 h-3.5" />}
                      {col.type === 'date' && <Calendar className="w-3.5 h-3.5" />}
                      {col.type === 'checkbox' && <CheckSquare className="w-3.5 h-3.5" />}
                      {(col.type === 'select' || col.type === 'status') && <List className="w-3.5 h-3.5" />}
                      {col.type === 'url' && <ExternalLink className="w-3.5 h-3.5" />}
                      <span className="truncate">{col.name}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Text */}
                      {col.type === 'text' && (
                        <input
                          type="text"
                          value={val ?? ''}
                          onChange={e => handlePropertyChange(col.id, e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs outline-none focus:border-[#0284c7]"
                        />
                      )}

                      {/* Number */}
                      {col.type === 'number' && (
                        <input
                          type="number"
                          value={val ?? ''}
                          onChange={e => handlePropertyChange(col.id, e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs outline-none focus:border-[#0284c7]"
                        />
                      )}

                      {/* Date */}
                      {col.type === 'date' && (
                        <input
                          type="date"
                          value={val ?? ''}
                          onChange={e => handlePropertyChange(col.id, e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs outline-none focus:border-[#0284c7]"
                        />
                      )}

                      {/* Checkbox */}
                      {col.type === 'checkbox' && (
                        <input
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={e => handlePropertyChange(col.id, e.target.checked)}
                          className="w-4 h-4 accent-[#0284c7] cursor-pointer"
                        />
                      )}

                      {/* Select / Status */}
                      {(col.type === 'select' || col.type === 'status') && (
                        <select
                          value={val ?? ''}
                          onChange={e => handlePropertyChange(col.id, e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs outline-none focus:border-[#0284c7]"
                        >
                          <option value="">Select an option...</option>
                          {col.options?.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* URL */}
                      {col.type === 'url' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="url"
                            value={val ?? ''}
                            onChange={e => handlePropertyChange(col.id, e.target.value)}
                            placeholder="https://"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs outline-none focus:border-[#0284c7]"
                          />
                          {val && (
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:text-[#0284c7]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Page Body Markdown Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Page Notes & Details</span>
              <span className="font-mono lowercase text-slate-400">markdown</span>
            </div>

            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              rows={12}
              placeholder="Write detailed notes, attachments, or action items for this record..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-xs font-sans rounded-none outline-none focus:border-[#0284c7] transition-all resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
