import React, { useState } from 'react';
import {
  Plus,
  ExternalLink,
  Calendar,
  Check,
  Trash2,
  Image as ImageIcon,
  Grid3X3,
  LayoutGrid
} from 'lucide-react';
import { Database, Page, DatabaseColumn } from '../../../types';
import { useWorkspace } from '../../../context/WorkspaceContext';

interface GalleryViewProps {
  database: Database;
  rows: Page[];
  visibleColumns: DatabaseColumn[];
  onOpenRow: (rowId: string) => void;
}

type CardSize = 'small' | 'medium' | 'large';

export const GalleryView: React.FC<GalleryViewProps> = ({
  database,
  rows,
  visibleColumns,
  onOpenRow,
}) => {
  const { createDatabaseRow, updateDatabaseRow, deleteDatabaseRow } = useWorkspace();
  const [cardSize, setCardSize] = useState<CardSize>(() => {
    return (localStorage.getItem(`harbor_gallery_size_${database.id}`) as CardSize) || 'medium';
  });

  const handleSizeChange = (size: CardSize) => {
    setCardSize(size);
    localStorage.setItem(`harbor_gallery_size_${database.id}`, size);
  };

  const handleAddNewRecord = async () => {
    const newId = await createDatabaseRow(database.id, 'New Card');
    onOpenRow(newId);
  };

  const handleToggleCheckbox = (row: Page, colId: string, currentVal: boolean) => {
    const updatedProps = { ...(row.properties || {}), [colId]: !currentVal };
    updateDatabaseRow(row.id, updatedProps);
  };

  // Grid layout class based on card size
  const gridClass =
    cardSize === 'small'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'
      : cardSize === 'large'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

  const coverHeightClass =
    cardSize === 'small' ? 'h-24' : cardSize === 'large' ? 'h-44' : 'h-32';

  // Helper to extract clean text excerpt from markdown content
  const getExcerpt = (markdown?: string) => {
    if (!markdown) return '';
    return markdown
      .replace(/^#+\s+/gm, '') // remove headings
      .replace(/\[\[(.*?)\]\]/g, '$1') // unwrap wiki links
      .replace(/\*\*(.*?)\*\*/g, '$1') // unwrap bold
      .replace(/\*(.*?)\*/g, '$1') // unwrap italic
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // unwrap code
      .trim()
      .slice(0, 180);
  };

  return (
    <div className="w-full flex flex-col space-y-4 select-none pb-12">
      {/* Gallery Header Toolbar: Card Size & Stats */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            {rows.length} {rows.length === 1 ? 'card' : 'cards'}
          </span>
        </div>

        {/* Card Size Selector */}
        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] p-0.5 rounded-none">
          <button
            type="button"
            onClick={() => handleSizeChange('small')}
            className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
              cardSize === 'small'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Small
          </button>
          <button
            type="button"
            onClick={() => handleSizeChange('medium')}
            className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
              cardSize === 'medium'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Medium
          </button>
          <button
            type="button"
            onClick={() => handleSizeChange('large')}
            className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
              cardSize === 'large'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Large
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className={`grid ${gridClass}`}>
        {rows.map(row => {
          const firstCol = database.columns[0];
          const excerpt = getExcerpt(row.content);

          return (
            <div
              key={row.id}
              onClick={() => onOpenRow(row.id)}
              className="group relative flex flex-col bg-white dark:bg-[#0b1120] border border-slate-200/90 dark:border-slate-800/90 hover:border-[#0284c7] dark:hover:border-[#0284c7] transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md overflow-hidden rounded-none"
            >
              {/* Card Cover Banner */}
              <div
                className={`w-full ${coverHeightClass} relative overflow-hidden bg-slate-100 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-start p-3`}
              >
                {row.coverImage ? (
                  <img
                    src={row.coverImage}
                    alt={row.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col justify-between">
                    <p className="text-[11px] font-sans leading-relaxed text-slate-400 dark:text-slate-500 line-clamp-4 select-none">
                      {excerpt || <span className="italic">Empty page content...</span>}
                    </p>
                    <div className="flex items-center gap-1.5 opacity-60">
                      <div className="w-2 h-2 rounded-full bg-[#0284c7]/40" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {database.title}
                      </span>
                    </div>
                  </div>
                )}

                {/* Hover Quick Actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      deleteDatabaseRow(row.id);
                    }}
                    className="p-1 bg-white/90 dark:bg-slate-900/90 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700 shadow-sm"
                    title="Delete card"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onOpenRow(row.id);
                    }}
                    className="p-1 bg-white/90 dark:bg-slate-900/90 text-slate-400 hover:text-[#0284c7] border border-slate-200 dark:border-slate-700 shadow-sm"
                    title="Open card page"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex flex-col flex-1 justify-between space-y-3">
                {/* Title */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8] transition-colors line-clamp-2">
                    {row.title || 'Untitled'}
                  </h4>
                </div>

                {/* Properties Pill Container */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {visibleColumns
                    .filter(c => c.id !== firstCol?.id)
                    .map(col => {
                      const val = row.properties?.[col.id];
                      if (val === undefined || val === null || val === '') return null;

                      // Status or Select
                      if (col.type === 'status' || col.type === 'select') {
                        const opt = col.options?.find(o => o.id === val);
                        return (
                          <span
                            key={col.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                          >
                            {opt?.label || val}
                          </span>
                        );
                      }

                      // Date
                      if (col.type === 'date') {
                        return (
                          <span
                            key={col.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800"
                          >
                            <Calendar className="w-2.5 h-2.5" />
                            {val}
                          </span>
                        );
                      }

                      // Checkbox
                      if (col.type === 'checkbox') {
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleCheckbox(row, col.id, Boolean(val));
                            }}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-mono border transition-colors ${
                              val
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <Check className={`w-2.5 h-2.5 ${val ? 'opacity-100' : 'opacity-30'}`} />
                            <span>{col.name}</span>
                          </button>
                        );
                      }

                      // Number
                      if (col.type === 'number') {
                        return (
                          <span
                            key={col.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                          >
                            {val}
                          </span>
                        );
                      }

                      // URL
                      if (col.type === 'url') {
                        return (
                          <a
                            key={col.id}
                            href={val}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-[#0284c7] hover:underline"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span className="max-w-[120px] truncate">{col.name}</span>
                          </a>
                        );
                      }

                      // Generic text
                      return (
                        <span
                          key={col.id}
                          className="inline-flex items-center text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-1 py-0.5 border border-slate-200/50 dark:border-slate-800/50"
                        >
                          {String(val)}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Quick + Add Card Button */}
        <div
          onClick={handleAddNewRecord}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#0284c7] dark:hover:border-[#0284c7] bg-slate-50/50 dark:bg-slate-900/20 hover:bg-sky-50/30 dark:hover:bg-sky-950/10 cursor-pointer transition-all duration-150 min-h-[160px] group`}
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-none bg-slate-100 dark:bg-slate-800 group-hover:bg-[#0284c7] group-hover:text-white text-slate-400 transition-colors mb-2">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-[#0284c7] transition-colors">
            New Card
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5">
            Click to create
          </span>
        </div>
      </div>
    </div>
  );
};
