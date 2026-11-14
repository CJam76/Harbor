import React, { useState } from 'react';
import { X, Database as DbIcon, CheckSquare, BookOpen, Layers, Check } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface NewDatabaseModalProps {
  isOpen: boolean;
  spaceId: string | null;
  onClose: () => void;
}

export const NewDatabaseModal: React.FC<NewDatabaseModalProps> = ({
  isOpen,
  spaceId,
  onClose,
}) => {
  const { createDatabase, spaces } = useWorkspace();
  const [title, setTitle] = useState('');
  const [targetSpaceId, setTargetSpaceId] = useState<string>(spaceId || spaces[0]?.id || '');
  const [template, setTemplate] = useState<'tasks' | 'assignments' | 'reading' | 'projects' | 'blank'>('tasks');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetSpaceId) return;
    await createDatabase(targetSpaceId, title.trim(), template);
    setTitle('');
    onClose();
  };

  const TEMPLATES = [
    {
      id: 'tasks' as const,
      title: 'Tasks & Sprints',
      desc: 'Task, Status, Priority, Due Date, and Verified Checkbox',
      icon: CheckSquare,
    },
    {
      id: 'assignments' as const,
      title: 'Course Assignments',
      desc: 'Deliverable, Course, Due Date, Status, Grade',
      icon: Layers,
    },
    {
      id: 'reading' as const,
      title: 'Reading List',
      desc: 'Title, Author, Status, Rating (1-5), Format',
      icon: BookOpen,
    },
    {
      id: 'blank' as const,
      title: 'Blank Database',
      desc: 'Start clean with default Name, Status, Date columns',
      icon: DbIcon,
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100 select-none"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#0b111e] border border-slate-200 dark:border-slate-800 shadow-glass rounded-none p-6 text-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DbIcon className="w-4 h-4 text-[#0284c7]" />
            <span>Create New Database</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-slate-500 font-medium">Database Name</label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Sprint 4 Deliverables, Research Papers"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 outline-none focus:border-[#0284c7] text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500 font-medium">Space</label>
            <select
              value={targetSpaceId}
              onChange={e => setTargetSpaceId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 outline-none focus:border-[#0284c7] text-slate-900 dark:text-slate-100"
            >
              {spaces.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-slate-500 font-medium">Starter Template</label>
            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map(t => {
                const Icon = t.icon;
                const isSelected = template === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTemplate(t.id);
                      if (!title) setTitle(t.title);
                    }}
                    className={`p-2.5 border cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'border-[#0284c7] bg-sky-50/50 dark:bg-sky-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-[#0284c7] flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {t.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#0284c7] flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !targetSpaceId}
              className="px-4 py-1.5 bg-[#080c14] dark:bg-white text-white dark:text-[#080c14] font-medium disabled:opacity-50"
            >
              Create Database
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
