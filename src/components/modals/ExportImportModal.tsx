import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileCode,
  Table,
  FileText,
  X,
  Check,
  AlertCircle,
  Database as DbIcon,
  FolderSync,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { isFileSystemAccessSupported } from '../../lib/filesystem';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activePageId,
    activeDatabaseId,
    activeSpaceId,
    spaces,
    pages,
    databases,
    exportWorkspaceJSON,
    importWorkspaceJSON,
    exportPageMarkdown,
    exportDatabaseCSV,
    importMarkdownFile,
    syncSpaceToLocalDirectory,
    importPagesFromLocalDirectory,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'vault'>('export');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(
    activeSpaceId || spaces[0]?.id || ''
  );

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        await importWorkspaceJSON(text, importMode);
        setStatusMessage(importMode === 'replace' ? 'Workspace vault replaced from backup!' : 'Vault notes merged into current workspace!');
        setTimeout(() => onClose(), 1200);
      } catch (err: any) {
        setStatusMessage(`Failed to import vault: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleMdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const targetSpace = selectedSpaceId || spaces[0]?.id;
        if (!targetSpace) throw new Error("No space available for import");

        await importMarkdownFile(targetSpace, file.name, content);
        setStatusMessage(`"${file.name}" imported into space!`);
        setTimeout(() => onClose(), 1000);
      } catch (err: any) {
        setStatusMessage(`Failed to import markdown: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSyncToFolder = async () => {
    if (!selectedSpaceId) return;
    try {
      setIsProcessing(true);
      setStatusMessage('Connecting to local folder...');
      const res = await syncSpaceToLocalDirectory(selectedSpaceId);
      setStatusMessage(`Successfully synced ${res.written} markdown note(s) to disk!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatusMessage(`Sync error: ${err.message}`);
      } else {
        setStatusMessage(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportFromFolder = async () => {
    if (!selectedSpaceId) return;
    try {
      setIsProcessing(true);
      setStatusMessage('Reading markdown notes from folder...');
      const res = await importPagesFromLocalDirectory(selectedSpaceId);
      setStatusMessage(`Imported ${res.imported} markdown file(s) into space!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatusMessage(`Import error: ${err.message}`);
      } else {
        setStatusMessage(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPage = pages.find(p => p.id === activePageId);
  const currentDb = databases.find(d => d.id === activeDatabaseId);
  const fsSupported = isFileSystemAccessSupported();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#0b111e] border border-slate-200 dark:border-slate-800 shadow-glass rounded-none overflow-hidden text-xs flex flex-col select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-[#0284c7]" />
            <span>Data Portability & Vault Sync</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-[#0284c7] text-[#0284c7] bg-white dark:bg-[#0b111e]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Export & Backup
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-[#0284c7] text-[#0284c7] bg-white dark:bg-[#0b111e]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Import
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'vault'
                ? 'border-[#0284c7] text-[#0284c7] bg-white dark:bg-[#0b111e]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Obsidian Mirror</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {statusMessage && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* Full Workspace Vault Export */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#0284c7]" />
                    <span>Full Vault Backup (.harbor / JSON)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Portable archive of all {spaces.length} spaces, {pages.length} pages, and {databases.length} databases. Cross-platform compatible with Windows, Linux, and macOS.
                  </div>
                </div>
                <button
                  onClick={exportWorkspaceJSON}
                  className="px-3 py-1.5 bg-[#080c14] dark:bg-white text-white dark:text-[#080c14] font-medium hover:bg-slate-800 dark:hover:bg-slate-200 rounded-none transition-colors"
                >
                  Export Vault
                </button>
              </div>

              {/* Active Page Markdown */}
              {currentPage && (
                <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>Current Page as Markdown (.md)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 truncate max-w-xs">
                      Export "{currentPage.title}" as a portable markdown file.
                    </div>
                  </div>
                  <button
                    onClick={() => exportPageMarkdown(currentPage.id)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-none transition-colors"
                  >
                    Export .md
                  </button>
                </div>
              )}

              {/* Active Database CSV */}
              {currentDb && (
                <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Table className="w-4 h-4 text-purple-500" />
                      <span>Current Database as CSV (.csv)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 truncate max-w-xs">
                      Export table "{currentDb.title}" with all typed row values.
                    </div>
                  </div>
                  <button
                    onClick={() => exportDatabaseCSV(currentDb.id)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-none transition-colors"
                  >
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Restore / Import Vault */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#0284c7]" />
                  <span>Import Vault from Machine Backup</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Load a <code>.harbor</code> or JSON backup file exported from another machine or workspace.
                </p>

                <div className="flex items-center gap-3 py-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-[#0284c7]"
                    />
                    <span>Merge into current vault</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-[#0284c7]"
                    />
                    <span className="text-rose-600 dark:text-rose-400">Replace current vault</span>
                  </label>
                </div>

                <input
                  type="file"
                  accept=".json,.harbor"
                  ref={jsonFileInputRef}
                  onChange={handleJsonUpload}
                  className="hidden"
                />
                <button
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#080c14] dark:bg-white text-white dark:text-[#080c14] font-medium hover:bg-slate-800 dark:hover:bg-slate-200 rounded-none transition-colors"
                >
                  Choose Vault Backup (.harbor / .json)
                </button>
              </div>

              {/* Import Markdown File */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Import Markdown Document</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Destination Space:</label>
                  <select
                    value={selectedSpaceId}
                    onChange={e => setSelectedSpaceId(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1.5 text-xs outline-none"
                  >
                    {spaces.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="file"
                  accept=".md,.markdown,.txt"
                  ref={mdFileInputRef}
                  onChange={handleMdUpload}
                  className="hidden"
                />
                <button
                  onClick={() => mdFileInputRef.current?.click()}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium rounded-none transition-colors"
                >
                  Select Markdown File (.md)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <HardDrive className="w-4 h-4 text-[#0284c7]" />
                  <span>Local Obsidian Vault Mirror</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Use the browser's File System Access API to connect a folder on your computer (such as an existing Obsidian vault). Pages are saved directly as <code>.md</code> files with standard YAML frontmatter and <code>[[wiki links]]</code>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Select Space to Mirror:</label>
                <select
                  value={selectedSpaceId}
                  onChange={e => setSelectedSpaceId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-xs outline-none"
                >
                  {spaces.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({pages.filter(p => p.spaceId === s.id && !p.isDatabaseRow).length} pages)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleSyncToFolder}
                  disabled={isProcessing}
                  className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] bg-white dark:bg-slate-950 text-left space-y-1 group transition-colors"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Export Space to Folder</span>
                    <Upload className="w-3.5 h-3.5 text-[#0284c7]" />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Writes pages into selected folder as individual <code>.md</code> files.
                  </p>
                </button>

                <button
                  onClick={handleImportFromFolder}
                  disabled={isProcessing}
                  className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] bg-white dark:bg-slate-950 text-left space-y-1 group transition-colors"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Import Folder into Space</span>
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Scans folder for <code>.md</code> notes and creates pages with tags.
                  </p>
                </button>
              </div>

              {!fsSupported && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Your browser does not support the File System Access API. Use Chrome, Edge, or Opera for direct disk sync, or use the Export/Import tabs above.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
