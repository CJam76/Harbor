import { HeadingItem, BacklinkInfo, Page } from '../types';
import katex from 'katex';

/**
 * Extracts headings from markdown content for the Outline / Table of Contents
 */
export function extractHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ id, text, level });
    }
  }

  return headings;
}

/**
 * Extracts [[wiki links]] from markdown content
 */
export function extractWikiLinks(markdown: string): string[] {
  const links: string[] = [];
  const regex = /\[\[(.*?)\]\]/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const linkText = match[1].trim();
    if (linkText && !links.includes(linkText)) {
      links.push(linkText);
    }
  }
  return links;
}

/**
 * Word count and reading time estimate
 */
export function getReadingStats(markdown: string): { words: number; readingTimeMinutes: number } {
  const clean = markdown
    .replace(/[#*`_~\[\]()>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = clean ? clean.split(' ').length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
  return { words, readingTimeMinutes };
}

/**
 * Finds all backlinks for a target page
 */
export function findBacklinks(targetTitle: string, allPages: Page[], currentPageId: string): BacklinkInfo[] {
  if (!targetTitle) return [];
  const backlinks: BacklinkInfo[] = [];
  const regex = new RegExp(`\\[\\[${escapeRegex(targetTitle)}\\]\\]`, 'i');

  for (const page of allPages) {
    if (page.id === currentPageId) continue;
    if (regex.test(page.content)) {
      // Extract a snippet around the match
      const lines = page.content.split('\n');
      let snippet = '';
      for (const line of lines) {
        if (regex.test(line)) {
          snippet = line.replace(/\[\[(.*?)\]\]/g, '$1').trim();
          break;
        }
      }
      backlinks.push({
        sourcePageId: page.id,
        sourcePageTitle: page.title,
        snippet: snippet || page.title,
      });
    }
  }

  return backlinks;
}

function escapeRegex(string: string): string {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Renders markdown text to HTML with support for:
 * - KaTeX block and inline math ($...$ and $$...$$)
 * - Mermaid diagrams (```mermaid ... ```)
 * - Headings with ids
 * - Task checkboxes
 * - Callouts (> [!NOTE], > [!TIP], etc.)
 * - Code blocks
 * - Tables
 * - Wiki links [[Page Name]]
 * - Blockquotes
 * - Lists
 * - Bold, italic, code, links
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // 1. Mermaid code blocks: ```mermaid ... ```
  html = html.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
    return `<div class="mermaid my-4 p-4 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-x-auto flex justify-center text-xs font-mono text-slate-700 dark:text-slate-300 rounded-none">${code.trim()}</div>`;
  });

  // 2. KaTeX Math Equations
  // Block Math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      return `<div class="katex-display my-4 p-3 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 overflow-x-auto text-center">${rendered}</div>`;
    } catch (e) {
      return `<pre class="text-rose-500 font-mono text-xs">$$${math}$$</pre>`;
    }
  });

  // Inline Math: $...$
  html = html.replace(/\$([^\$\n]+)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch (e) {
      return `<code class="text-rose-500 font-mono text-xs">$${math}$</code>`;
    }
  });

  // Escape remaining angle brackets for non-math prose
  html = html
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')
    .replace(/<(?!\/?(?:div|span|p|h1|h2|h3|code|pre|table|thead|tbody|tr|th|td|li|blockquote|a|strong|em|del|input))/g, '&lt;');

  // Callouts: &gt; [!NOTE] or > [!NOTE] etc
  html = html.replace(
    /(?:^|\n)(?:>|&gt;)\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:(?:>|&gt;).*(?:\n|$))*)/gi,
    (_, type, body) => {
      const cleanBody = body
        .split('\n')
        .map((l: string) => l.replace(/^(?:>|&gt;)\s?/, ''))
        .join('<br>');
      const typeLower = type.toLowerCase();
      const badgeClasses: Record<string, string> = {
        note: 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200',
        tip: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
        important: 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200',
        warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
        caution: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200',
      };
      const cls = badgeClasses[typeLower] || badgeClasses.note;
      return `<div class="p-3 my-3 border rounded-none ${cls} text-sm">
        <div class="font-semibold uppercase tracking-wider text-xs mb-1">${type}</div>
        <div>${cleanBody}</div>
      </div>`;
    }
  );

  // Standard blockquotes: > text
  html = html.replace(/(?:^|\n)(?:>|&gt;)\s?(.*)/g, '\n<blockquote class="border-l-2 border-[#0284c7] pl-3 my-2 italic text-slate-600 dark:text-slate-400">$1</blockquote>');

  // Code blocks: ```ts ... ```
  html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<div class="my-4 border border-slate-200 dark:border-slate-800 rounded-none bg-slate-900 text-slate-100 overflow-x-auto text-xs font-mono">
      <div class="px-3 py-1 bg-slate-950 text-slate-400 border-b border-slate-800 flex justify-between">
        <span>${lang || 'code'}</span>
      </div>
      <pre class="p-3"><code>${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 font-mono text-xs bg-slate-100 dark:bg-slate-800 text-[#0284c7] border border-slate-200 dark:border-slate-700 rounded-none">$1</code>');

  // Tables: | A | B |
  html = html.replace(/(?:(?:^|\n)\|.+)+\|/g, (tableText) => {
    const lines = tableText.trim().split('\n');
    if (lines.length < 2) return tableText;

    const parseRow = (line: string, isHeader: boolean) => {
      const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
      const tag = isHeader ? 'th' : 'td';
      const cellHtml = cells
        .map(c => `<${tag} class="border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-left text-xs ${isHeader ? 'font-semibold bg-slate-100 dark:bg-slate-800' : ''}">${c.trim()}</${tag}>`)
        .join('');
      return `<tr>${cellHtml}</tr>`;
    };

    let tableHtml = '<div class="my-4 overflow-x-auto"><table class="w-full border-collapse border border-slate-200 dark:border-slate-700 text-xs">';
    tableHtml += '<thead>' + parseRow(lines[0], true) + '</thead>';
    tableHtml += '<tbody>';
    for (let i = 2; i < lines.length; i++) {
      tableHtml += parseRow(lines[i], false);
    }
    tableHtml += '</tbody></table></div>';
    return tableHtml;
  });

  // Task checkboxes: - [ ] or - [x]
  html = html.replace(/^- \[(x|X)\]\s+(.*)$/gm, '<li class="flex items-center gap-2 list-none my-1"><input type="checkbox" checked disabled class="accent-[#0284c7] cursor-pointer" /><span class="line-through text-slate-400 dark:text-slate-500">$2</span></li>');
  html = html.replace(/^- \[ \]\s+(.*)$/gm, '<li class="flex items-center gap-2 list-none my-1"><input type="checkbox" disabled class="accent-[#0284c7] cursor-pointer" /><span>$1</span></li>');

  // Wiki links: [[Target Page]]
  html = html.replace(/\[\[(.*?)\]\]/g, (_, title) => {
    return `<a href="#wiki" data-wiki-target="${title.trim()}" class="wiki-link inline-flex items-center font-medium text-[#0284c7] dark:text-[#38bdf8] underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 hover:bg-[#0284c7]/10 px-1 py-0.5 rounded-none cursor-pointer transition-colors">[[${title.trim()}]]</a>`;
  });

  // Headings
  html = html.replace(/^### (.*$)/gm, (_, text) => {
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    return `<h3 id="${id}" class="text-lg font-semibold tracking-tight mt-6 mb-2 text-slate-900 dark:text-slate-100">${text}</h3>`;
  });
  html = html.replace(/^## (.*$)/gm, (_, text) => {
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    return `<h2 id="${id}" class="text-xl font-semibold tracking-tight mt-8 mb-3 pb-1 border-b border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-slate-100">${text}</h2>`;
  });
  html = html.replace(/^# (.*$)/gm, (_, text) => {
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    return `<h1 id="${id}" class="text-2xl font-bold tracking-tight mt-6 mb-4 text-slate-900 dark:text-slate-100">${text}</h1>`;
  });

  // Unordered lists: - item
  html = html.replace(/^\- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // External Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0284c7] hover:underline">$1</a>');

  // Paragraphs
  const paragraphs = html.split('\n\n');
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h1') ||
        trimmed.startsWith('<h2') ||
        trimmed.startsWith('<h3') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<li')
      ) {
        return trimmed;
      }
      return `<p class="my-2 text-sm leading-relaxed">${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}
