import React, { useState } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, Upload, Sparkles } from 'lucide-react';

interface CoverPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCover: (coverUrlOrGradient: string) => void;
  onRemoveCover?: () => void;
  currentCover?: string;
}

export const PRESET_COVERS = [
  {
    id: 'cov-deep-harbor',
    label: 'Deep Harbor',
    value: 'linear-gradient(135deg, #070b14 0%, #1e293b 60%, #0b1120 100%)',
    preview: 'linear-gradient(135deg, #070b14 0%, #1e293b 60%, #0b1120 100%)',
  },
  {
    id: 'cov-blueprint',
    label: 'Architectural Blueprint',
    value: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)',
    preview: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)',
  },
  {
    id: 'cov-emerald',
    label: 'Alpine Emerald',
    value: 'linear-gradient(135deg, #022c22 0%, #065f46 60%, #042f2e 100%)',
    preview: 'linear-gradient(135deg, #022c22 0%, #065f46 60%, #042f2e 100%)',
  },
  {
    id: 'cov-bronze',
    label: 'Obsidian Bronze',
    value: 'linear-gradient(135deg, #292524 0%, #78350f 70%, #1c1917 100%)',
    preview: 'linear-gradient(135deg, #292524 0%, #78350f 70%, #1c1917 100%)',
  },
  {
    id: 'cov-twilight',
    label: 'Twilight Sky',
    value: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #0f172a 100%)',
    preview: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #0f172a 100%)',
  },
  {
    id: 'cov-slate',
    label: 'Graphite Noir',
    value: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)',
    preview: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)',
  },
  {
    id: 'cov-arch-1',
    label: 'Brutalist Concrete',
    value: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
    preview: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'cov-arch-2',
    label: 'Minimalist Architecture',
    value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    preview: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'cov-nature-1',
    label: 'Misty Mountains',
    value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
    preview: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
  },
];

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCover,
  onRemoveCover,
  currentCover,
}) => {
  const [tab, setTab] = useState<'gallery' | 'link' | 'upload'>('gallery');
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectCover(customUrl.trim());
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          onSelectCover(dataUrl);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none p-4">
      <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg flex flex-col rounded-none overflow-hidden text-xs">
        {/* Header */}
        <div className="h-10 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
            <ImageIcon className="w-4 h-4 text-[#0284c7]" />
            <span>Select Cover Banner</span>
          </div>
          <div className="flex items-center gap-2">
            {currentCover && onRemoveCover && (
              <button
                type="button"
                onClick={() => {
                  onRemoveCover();
                  onClose();
                }}
                className="px-2 py-0.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors"
              >
                Remove
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            onClick={() => setTab('gallery')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              tab === 'gallery'
                ? 'border-[#0284c7] text-[#0284c7]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Gallery
          </button>
          <button
            onClick={() => setTab('link')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              tab === 'link'
                ? 'border-[#0284c7] text-[#0284c7]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Image Link
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              tab === 'upload'
                ? 'border-[#0284c7] text-[#0284c7]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Upload
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {tab === 'gallery' && (
            <div className="grid grid-cols-3 gap-2.5">
              {PRESET_COVERS.map(preset => {
                const isSelected = currentCover === preset.value;
                const isImage = preset.value.startsWith('http');
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectCover(preset.value);
                      onClose();
                    }}
                    className={`h-20 rounded-none border text-left relative overflow-hidden transition-all group ${
                      isSelected
                        ? 'border-[#0284c7] ring-2 ring-[#0284c7]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-[#0284c7]'
                    }`}
                  >
                    {isImage ? (
                      <img
                        src={preset.preview}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div
                        style={{ background: preset.preview }}
                        className="w-full h-full"
                      />
                    )}
                    <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-medium text-white truncate drop-shadow-sm bg-black/40 px-1 py-0.2">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'link' && (
            <form onSubmit={handleCustomUrlSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Paste image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 outline-none focus:border-[#0284c7]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0284c7] text-white font-medium hover:bg-sky-600 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Works with any direct image link from Unsplash, Imgur, or direct CDN URL.
              </p>
            </form>
          )}

          {tab === 'upload' && (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center space-y-2 text-center">
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="font-medium text-slate-700 dark:text-slate-300">
                Upload image from computer
              </div>
              <p className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 5MB</p>
              <label className="cursor-pointer px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:bg-slate-800 transition-colors mt-2">
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
