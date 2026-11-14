import React, { useState, useEffect } from 'react';
import {
  Anchor,
  Compass,
  FileText,
  Database as DbIcon,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  Link as LinkIcon,
  RotateCw
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PLATITUDES, getRandomPlatitude } from '../../lib/platitudes';

interface LandingPageProps {
  onOpenNewSpaceModal: () => void;
  onOpenNewDbModal: (spaceId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenNewSpaceModal,
  onOpenNewDbModal,
}) => {
  const {
    spaces,
    pages,
    databases,
    navigateToPage,
    navigateToDatabase,
    navigateToSpace,
    createPage,
    openRowModal,
  } = useWorkspace();

  // Platitude rotation with gentle fade
  const [currentPlatitude, setCurrentPlatitude] = useState(() => getRandomPlatitude());
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  // Rotate platitude every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setCurrentPlatitude(prev => getRandomPlatitude(prev));
        setFadeState('in');
      }, 400); // 400ms crossfade
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  const manualRotate = () => {
    setFadeState('out');
    setTimeout(() => {
      setCurrentPlatitude(prev => getRandomPlatitude(prev));
      setFadeState('in');
    }, 200);
  };

  // Getting started checklist state
  const hasContent = pages.length > 5 || spaces.length > 2;
  const [gettingStartedOpen, setGettingStartedOpen] = useState(!hasContent);

  // Recent Pages (sorted by updatedAt)
  const recentPages = [...pages]
    .filter(p => !p.isDatabaseRow)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  // Tasks due soon pulled from all databases that have a date column
  interface DueTask {
    row: (typeof pages)[0];
    databaseTitle: string;
    dueDate: string;
    isCompleted: boolean;
  }

  const tasksDueSoon: DueTask[] = [];
  for (const db of databases) {
    const dateCol = db.columns.find(c => c.type === 'date');
    const checkCol = db.columns.find(c => c.type === 'checkbox');
    const statusCol = db.columns.find(c => c.type === 'status');

    if (dateCol) {
      const dbRows = pages.filter(p => p.databaseId === db.id);
      for (const row of dbRows) {
        const dueDate = row.properties?.[dateCol.id];
        const isCheckDone = checkCol ? Boolean(row.properties?.[checkCol.id]) : false;
        const statusVal = statusCol ? row.properties?.[statusCol.id] : '';
        const isStatusDone = String(statusVal).includes('done') || String(statusVal).includes('submitted');

        if (dueDate && !isCheckDone && !isStatusDone) {
          tasksDueSoon.push({
            row,
            databaseTitle: db.title,
            dueDate,
            isCompleted: false,
          });
        }
      }
    }
  }

  // Sort tasks due soon chronologically
  tasksDueSoon.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10 bg-[#f4f7fa] dark:bg-[#070b14] select-none">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Large Centered Rotating Platitude */}
        <section className="text-center py-10 px-4 min-h-[160px] flex flex-col items-center justify-center relative">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
            <Anchor className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Harbor Workspace</span>
          </div>

          <h1
            className={`text-2xl sm:text-3xl md:text-4xl font-serif font-normal text-slate-800 dark:text-slate-100 max-w-2xl leading-relaxed tracking-tight transition-opacity duration-300 ${
              fadeState === 'in' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            "{currentPlatitude}"
          </h1>

          <button
            onClick={manualRotate}
            className="mt-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors opacity-60 hover:opacity-100"
            title="Next thought"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </section>

        {/* Getting Started Section */}
        <section className="paper-sheet p-5 bg-white dark:bg-[#0b111e] rounded-none">
          <div
            onClick={() => setGettingStartedOpen(!gettingStartedOpen)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0284c7]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Getting Started with Harbor
              </h2>
            </div>
            <button className="text-slate-400 p-0.5">
              {gettingStartedOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {gettingStartedOpen && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div
                onClick={onOpenNewSpaceModal}
                className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                  <span>1. Create a Space</span>
                  <ArrowRight className="w-3 h-3 text-[#0284c7]" />
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Group projects, semesters, or personal vaults into distinct containers.
                </p>
              </div>

              <div
                onClick={() => {
                  const targetSpaceId = spaces[0]?.id;
                  if (targetSpaceId) createPage(targetSpaceId, null, 'New Page');
                }}
                className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                  <span>2. Add a Page</span>
                  <ArrowRight className="w-3 h-3 text-[#0284c7]" />
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Rich formatting, slash commands (/), callouts, and task checkboxes.
                </p>
              </div>

              <div
                onClick={() => {
                  const targetSpaceId = spaces[0]?.id;
                  if (targetSpaceId) onOpenNewDbModal(targetSpaceId);
                }}
                className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                  <span>3. Add a Database</span>
                  <ArrowRight className="w-3 h-3 text-[#0284c7]" />
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Tables, Kanban boards, and lists with typed columns and full-page rows.
                </p>
              </div>

              <div
                onClick={() => {
                  if (recentPages[0]) navigateToPage(recentPages[0].id);
                }}
                className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                  <span>4. Try [[Wiki Links]]</span>
                  <ArrowRight className="w-3 h-3 text-[#0284c7]" />
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Type [[ anywhere to link pages together and populate backlinks automatically.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Two-Column Overview: Tasks Due Soon & Spaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks Due Soon */}
          <section className="paper-sheet p-5 bg-white dark:bg-[#0b111e] rounded-none flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0284c7]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Tasks & Deliverables Due Soon
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {tasksDueSoon.length} pending
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-64">
              {tasksDueSoon.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No upcoming deadlines detected. Enjoy the clear horizon!
                </div>
              ) : (
                tasksDueSoon.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => openRowModal(item.row.id)}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.row.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.databaseTitle}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#0284c7] dark:text-[#38bdf8] flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.dueDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Spaces Overview */}
          <section className="paper-sheet p-5 bg-white dark:bg-[#0b111e] rounded-none flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#0284c7]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Spaces Overview
                </h2>
              </div>
              <button
                onClick={onOpenNewSpaceModal}
                className="text-xs text-[#0284c7] hover:underline"
              >
                + New Space
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-64">
              {spaces.map(sp => {
                const spacePagesCount = pages.filter(p => p.spaceId === sp.id && !p.isDatabaseRow).length;
                const spaceDbsCount = databases.filter(d => d.spaceId === sp.id).length;

                return (
                  <div
                    key={sp.id}
                    onClick={() => navigateToSpace(sp.id)}
                    className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {sp.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {spacePagesCount} {spacePagesCount === 1 ? 'page' : 'pages'} • {spaceDbsCount} {spaceDbsCount === 1 ? 'database' : 'databases'}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Recent Pages Section */}
        <section className="paper-sheet p-5 bg-white dark:bg-[#0b111e] rounded-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0284c7]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Recent Pages
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentPages.map(p => {
              const sp = spaces.find(s => s.id === p.spaceId);
              return (
                <div
                  key={p.id}
                  onClick={() => navigateToPage(p.id)}
                  className="p-3 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] bg-slate-50/40 dark:bg-slate-900/40 cursor-pointer transition-colors flex flex-col justify-between h-24"
                >
                  <div className="font-medium text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                    {p.title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="truncate">{sp?.name || 'Workspace'}</span>
                    <span className="font-mono">
                      {new Date(p.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
