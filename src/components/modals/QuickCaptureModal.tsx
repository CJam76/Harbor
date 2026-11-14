import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  X,
  Calendar,
  Database as DbIcon,
  FileText,
  CheckCircle2,
  CornerDownLeft,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose }) => {
  const {
    spaces,
    databases,
    quickCapture,
    openDailyNote,
  } = useWorkspace();

  const [text, setText] = useState('');
  const [targetType, setTargetType] = useState<'daily' | 'database' | 'page'>('daily');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set defaults when opening
  useEffect(() => {
    if (isOpen) {
      setText('');
      setTitle('');
      setToastMessage(null);
      setIsSubmitting(false);

      if (databases.length > 0) {
        setSelectedDatabaseId(databases[0].id);
      }
      if (spaces.length > 0) {
        setSelectedSpaceId(spaces[0].id);
      }

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, databases, spaces]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await quickCapture(text.trim(), targetType, {
        databaseId: selectedDatabaseId,
        spaceId: selectedSpaceId,
        title: title.trim(),
      });

      setToastMessage(
        targetType === 'daily'
          ? "Captured to Today's Daily Note!"
          : targetType === 'database'
          ? 'Added to Database!'
          : 'Created New Note Page!'
      );

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error('Quick capture failed:', err);
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#0b111e] border border-slate-200 dark:border-slate-800 shadow-glass rounded-none overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between select-none bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-200">
            <div className="w-5 h-5 bg-[#0284c7] text-white flex items-center justify-center rounded-none shadow-xs">
              <Zap className="w-3 h-3 fill-current" />
            </div>
            <span>Quick Capture</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded-none ml-1">
              Ctrl+Alt+N
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Destination Selector Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 text-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 mr-1 select-none">Target:</span>
            <button
              type="button"
              onClick={() => setTargetType('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-xs font-medium transition-all ${
                targetType === 'daily'
                  ? 'border-[#0284c7] bg-sky-50 dark:bg-sky-950/40 text-[#0284c7]'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today's Daily Note</span>
            </button>

            {databases.length > 0 && (
              <button
                type="button"
                onClick={() => setTargetType('database')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-xs font-medium transition-all ${
                  targetType === 'database'
                    ? 'border-[#0284c7] bg-sky-50 dark:bg-sky-950/40 text-[#0284c7]'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <DbIcon className="w-3.5 h-3.5" />
                <span>Database Row</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setTargetType('page')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-xs font-medium transition-all ${
                targetType === 'page'
                  ? 'border-[#0284c7] bg-sky-50 dark:bg-sky-950/40 text-[#0284c7]'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>New Note</span>
            </button>
          </div>

          {/* Conditional target configuration */}
          {targetType === 'database' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Choose Database:</label>
              <select
                value={selectedDatabaseId}
                onChange={e => setSelectedDatabaseId(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs outline-none focus:border-[#0284c7]"
              >
                {databases.map(db => (
                  <option key={db.id} value={db.id}>
                    {db.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'page' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Target Space:</label>
                <select
                  value={selectedSpaceId}
                  onChange={e => setSelectedSpaceId(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs outline-none focus:border-[#0284c7]"
                >
                  {spaces.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Page Title (optional)"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs outline-none focus:border-[#0284c7]"
              />
            </div>
          )}

          {/* Fast Content Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
            placeholder={
              targetType === 'daily'
                ? "Jot down a thought, task, or note... (will append to Today's Note)"
                : targetType === 'database'
                ? "Deliverable or task title..."
                : "Write notes, links, or ideas..."
            }
            className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 text-xs sm:text-sm font-sans rounded-none outline-none focus:border-[#0284c7] transition-all resize-none leading-relaxed"
          />

          {/* Toast Message or Guidance */}
          {toastMessage ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-400 select-none pt-1">
              <span>Supports Markdown and [[wiki links]]</span>
              <span className="flex items-center gap-1 font-mono">
                Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Ctrl+Enter</kbd> to save
              </span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="h-12 px-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!text.trim() || isSubmitting}
            onClick={() => handleSubmit()}
            className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0284c7]/90 text-white font-medium text-xs rounded-none shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <span>Capture</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
