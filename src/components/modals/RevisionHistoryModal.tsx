import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  RotateCcw,
  Clock,
  FileText,
  Check,
  ChevronRight,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { PageRevision, Page } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';
import { computeLineDiff } from '../../lib/diff';

interface RevisionHistoryModalProps {
  isOpen: boolean;
  page: Page;
  onClose: () => void;
}

export const RevisionHistoryModal: React.FC<RevisionHistoryModalProps> = ({
  isOpen,
  page,
  onClose,
}) => {
  const { storageAdapter, updatePage } = useWorkspace();
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diffMode, setDiffMode] = useState<'diff' | 'raw'>('diff');

  // Load revisions on open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchRevisions = async () => {
      setIsLoading(true);
      try {
        const revs = await storageAdapter.getRevisions(page.id);
        if (mounted) {
          setRevisions(revs);
          if (revs.length > 0) {
            setSelectedRevisionId(revs[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load revisions:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchRevisions();
    return () => {
      mounted = false;
    };
  }, [isOpen, page.id, storageAdapter]);

  if (!isOpen) return null;

  const selectedRevision = revisions.find(r => r.id === selectedRevisionId);

  // Compute diff against current document content
  const diffLines = selectedRevision
    ? computeLineDiff(selectedRevision.content, page.content)
    : [];

  const handleRestore = async (revision: PageRevision) => {
    if (!window.confirm(`Restore this revision from ${new Date(revision.timestamp).toLocaleString()}? Your current version will be archived as a prior snapshot.`)) {
      return;
    }

    // Save current version as a revision first
    await storageAdapter.saveRevision({
      id: `rev-${Date.now()}`,
      pageId: page.id,
      title: page.title,
      content: page.content,
      timestamp: Date.now(),
      wordCount: page.content.trim().split(/\s+/).filter(Boolean).length,
    });

    // Restore selected content
    await updatePage({
      id: page.id,
      title: revision.title,
      content: revision.content,
    });

    onClose();
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) {
      return `Today at ${timeStr}`;
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl h-[85vh] max-h-[760px] flex flex-col rounded-none overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="h-12 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#070b14] shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#0284c7]" />
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Revision History
            </span>
            <span className="text-slate-400 font-normal">
              — {page.title || 'Untitled'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setDiffMode('diff')}
                className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  diffMode === 'diff'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Comparison Diff
              </button>
              <button
                type="button"
                onClick={() => setDiffMode('raw')}
                className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  diffMode === 'raw'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Snapshot Text
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left sidebar (list of revisions) + Right main (diff viewer) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Revisions Timeline */}
          <div className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-[#070b14]/50 overflow-hidden shrink-0">
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Saved Snapshots ({revisions.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <div className="p-6 text-center text-slate-400">Loading revisions...</div>
              ) : revisions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic">
                  No previous revisions saved yet. Snapshots are created automatically as you write.
                </div>
              ) : (
                revisions.map((rev, index) => {
                  const isSelected = rev.id === selectedRevisionId;
                  const wordDiff = rev.wordCount - (page.content.trim().split(/\s+/).filter(Boolean).length);

                  return (
                    <div
                      key={rev.id}
                      onClick={() => setSelectedRevisionId(rev.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#0284c7]/10 dark:bg-[#0284c7]/15 border-l-2 border-[#0284c7]'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatTimestamp(rev.timestamp)}
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] font-mono uppercase bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 py-0.2">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>{rev.wordCount} words</span>
                        {wordDiff !== 0 && (
                          <span className={wordDiff > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                            {wordDiff > 0 ? `+${wordDiff}` : wordDiff} words
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Diff / Snapshot Preview */}
          <div className="flex-1 flex flex-col bg-white dark:bg-[#0b1120] overflow-hidden">
            {selectedRevision ? (
              <>
                {/* Diff Sub-header */}
                <div className="h-10 px-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Snapshot from {new Date(selectedRevision.timestamp).toLocaleString()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestore(selectedRevision)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs rounded-none hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore this Version</span>
                  </button>
                </div>

                {/* Diff Viewer Surface */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed space-y-0.5">
                  {diffMode === 'diff' ? (
                    diffLines.map((line, idx) => {
                      if (line.type === 'added') {
                        return (
                          <div
                            key={idx}
                            className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5 whitespace-pre-wrap break-words flex items-start gap-2"
                          >
                            <span className="select-none text-emerald-500 font-bold">+</span>
                            <span>{line.text || ' '}</span>
                          </div>
                        );
                      }
                      if (line.type === 'removed') {
                        return (
                          <div
                            key={idx}
                            className="bg-rose-500/10 text-rose-800 dark:text-rose-300 border-l-2 border-rose-500 px-2 py-0.5 line-through opacity-75 whitespace-pre-wrap break-words flex items-start gap-2"
                          >
                            <span className="select-none text-rose-500 font-bold">-</span>
                            <span>{line.text || ' '}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className="text-slate-700 dark:text-slate-300 px-2 py-0.5 whitespace-pre-wrap break-words flex items-start gap-2"
                        >
                          <span className="select-none text-slate-400 opacity-40"> </span>
                          <span>{line.text || ' '}</span>
                        </div>
                      );
                    })
                  ) : (
                    /* Raw Snapshot Text View */
                    <div className="whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
                      {selectedRevision.content}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 italic">
                Select a revision snapshot on the left to inspect diffs and rollback.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
