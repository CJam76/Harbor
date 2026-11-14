import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface NewSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewSpaceModal: React.FC<NewSpaceModalProps> = ({ isOpen, onClose }) => {
  const { createSpace } = useWorkspace();
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createSpace(name.trim());
    setName('');
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100 select-none"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-[#0b111e] border border-slate-200 dark:border-slate-800 shadow-glass rounded-none p-5 text-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-[#0284c7]" />
            <span>Create New Space</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-slate-500 font-medium">Space Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Fall Semester, Research Lab, Personal"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 outline-none focus:border-[#0284c7] text-slate-900 dark:text-slate-100"
            />
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
              disabled={!name.trim()}
              className="px-4 py-1.5 bg-[#080c14] dark:bg-white text-white dark:text-[#080c14] font-medium disabled:opacity-50"
            >
              Create Space
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
