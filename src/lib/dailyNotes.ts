import { getRandomPlatitude } from './platitudes';
import { Database, Page } from '../types';

export interface DailyNoteDateInfo {
  dateKey: string;     // YYYY-MM-DD
  title: string;       // e.g. Thursday, November 12, 2026
  shortDate: string;   // e.g. Nov 12
  weekday: string;     // e.g. Thursday
}

export function formatDailyNoteDate(d: Date = new Date()): DailyNoteDateInfo {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const title = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const shortDate = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return { dateKey, title, shortDate, weekday };
}

export function getAdjacentDailyDates(d: Date = new Date()) {
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);

  const next = new Date(d);
  next.setDate(next.getDate() + 1);

  return {
    prev: formatDailyNoteDate(prev),
    next: formatDailyNoteDate(next),
  };
}

/**
 * Searches across all databases with date columns to find deliverables due on or before today
 */
export function getDueTasksForDate(dateKey: string, databases: Database[], pages: Page[]): string[] {
  const tasks: string[] = [];

  databases.forEach(db => {
    const dateCols = db.columns.filter(c => c.type === 'date');
    if (dateCols.length === 0) return;

    const rows = pages.filter(p => p.isDatabaseRow && p.databaseId === db.id);
    rows.forEach(r => {
      dateCols.forEach(col => {
        const val = r.properties?.[col.id];
        if (!val) return;

        const rowDate = typeof val === 'string' ? val.split('T')[0] : '';
        const isDone =
          r.properties?.['col-status'] === 'done' ||
          r.properties?.['col-status'] === 'status-graded' ||
          r.properties?.['col-done-check'] === true;

        if (rowDate === dateKey && !isDone) {
          tasks.push(`- [ ] [[${r.title}]] (${db.title} · Due Today)`);
        } else if (rowDate && rowDate < dateKey && !isDone) {
          tasks.push(`- [ ] [[${r.title}]] (${db.title} · Overdue: ${rowDate})`);
        }
      });
    });
  });

  return tasks;
}

/**
 * Generates an Obsidian-grade Daily Journal template with live deadlines and calm reflection prompts
 */
export function generateDailyNoteContent(
  date: Date = new Date(),
  dueTasks: string[] = []
): string {
  const { title, shortDate } = formatDailyNoteDate(date);
  const { prev, next } = getAdjacentDailyDates(date);
  const platitude = getRandomPlatitude();

  const dueSection =
    dueTasks.length > 0
      ? dueTasks.join('\n')
      : '- [ ] No urgent database deadlines today. Focus on core objectives.';

  return `> [!NOTE]
> *${platitude}*

[[${prev.title}|← ${prev.shortDate}]] | **${shortDate}** | [[${next.title}|${next.shortDate} →]]

## 🎯 Today's Focus & Deadlines
${dueSection}

## 📋 Daily Priorities
- [ ] Morning review & calendar alignment
- [ ] Deep work session (90 mins)
- [ ] 

## 📝 Meeting & Class Logs
- **10:00 AM** — 
- **02:00 PM** — 

## 💡 Evening Reflection
- Key wins today: 
- Carryover for tomorrow: 
`;
}
