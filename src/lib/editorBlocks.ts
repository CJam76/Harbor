export type BlockType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'todo'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'callout'
  | 'code'
  | 'math'
  | 'mermaid'
  | 'divider'
  | 'table'
  | 'toggle'
  | 'image'
  | 'bookmark';

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  calloutType?: 'note' | 'tip' | 'warning' | 'important' | 'caution';
  language?: string;
  summary?: string;
  collapsed?: boolean;
  url?: string;
  caption?: string;
}

export function generateBlockId(): string {
  return 'b_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export function createNewBlock(type: BlockType = 'p', content = ''): EditorBlock {
  return {
    id: generateBlockId(),
    type,
    content,
    checked: false,
    language: type === 'code' ? 'typescript' : undefined,
    calloutType: type === 'callout' ? 'note' : undefined,
    summary: type === 'toggle' ? 'Toggle title' : undefined,
    collapsed: type === 'toggle' ? false : undefined,
    url: type === 'image' || type === 'bookmark' ? '' : undefined,
    caption: type === 'image' ? '' : undefined,
  };
}

/**
 * Parses markdown into an array of interactive Notion-style blocks.
 */
export function parseMarkdownToBlocks(markdown: string): EditorBlock[] {
  if (!markdown || markdown.trim() === '') {
    return [createNewBlock('p', '')];
  }

  const lines = markdown.split(/\r?\n/);
  const blocks: EditorBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Mermaid Diagram Block
    if (trimmed.startsWith('```mermaid')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({
        id: generateBlockId(),
        type: 'mermaid',
        content: codeLines.join('\n').trim(),
      });
      continue;
    }

    // 2. Generic Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({
        id: generateBlockId(),
        type: 'code',
        language: lang || 'plaintext',
        content: codeLines.join('\n'),
      });
      continue;
    }

    // 3. LaTeX Math Block ($$ ... $$)
    if (trimmed.startsWith('$$')) {
      if (trimmed.endsWith('$$') && trimmed.length > 4) {
        // Single line $$formula$$
        const mathContent = trimmed.slice(2, -2).trim();
        blocks.push({
          id: generateBlockId(),
          type: 'math',
          content: mathContent,
        });
        i++;
        continue;
      }
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().endsWith('$$')) {
        const lastLineContent = lines[i].trim().replace(/\$\$$/, '').trim();
        if (lastLineContent) mathLines.push(lastLineContent);
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: 'math',
        content: mathLines.join('\n').trim(),
      });
      continue;
    }

    // 4. Callout Box (> [!NOTE], > [!TIP], etc.)
    const calloutMatch = line.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i);
    if (calloutMatch) {
      const type = calloutMatch[1].toLowerCase() as EditorBlock['calloutType'];
      const calloutLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith('>')) {
        calloutLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: 'callout',
        calloutType: type,
        content: calloutLines.join('\n').trim(),
      });
      continue;
    }

    // 5. Standard Blockquote (> text)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: 'quote',
        content: quoteLines.join('\n').trim(),
      });
      continue;
    }

    // 6. Markdown Table (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: 'table',
        content: tableLines.join('\n'),
      });
      continue;
    }

    // 7. Divider (--- or ***)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({
        id: generateBlockId(),
        type: 'divider',
        content: '',
      });
      i++;
      continue;
    }

    // 8. Collapsible Toggle Block (<details><summary>...</summary>...</details>)
    if (trimmed.startsWith('<details')) {
      const isCollapsed = !trimmed.includes('open');
      let summary = 'Toggle List';
      const innerLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('</details>')) {
        const l = lines[i];
        const summaryMatch = l.match(/<summary>(.*?)<\/summary>/i);
        if (summaryMatch) {
          summary = summaryMatch[1];
        } else {
          innerLines.push(l);
        }
        i++;
      }
      i++; // Skip closing </details>
      blocks.push({
        id: generateBlockId(),
        type: 'toggle',
        summary,
        collapsed: isCollapsed,
        content: innerLines.join('\n').trim(),
      });
      continue;
    }

    // 9. Image Block (![alt](url))
    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'image',
        caption: imageMatch[1] || '',
        url: imageMatch[2],
        content: imageMatch[1] || 'Image',
      });
      i++;
      continue;
    }

    // 10. Bookmark Block ([🔖 Title](url) or [Bookmark: Title](url))
    const bookmarkMatch = trimmed.match(/^\[(?:🔖|Bookmark:)\s*(.*?)\]\((https?:\/\/.*?)\)$/i);
    if (bookmarkMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'bookmark',
        content: bookmarkMatch[1],
        url: bookmarkMatch[2],
      });
      i++;
      continue;
    }

    // 8. Headings (#, ##, ###)
    if (/^#\s+/.test(line)) {
      blocks.push({
        id: generateBlockId(),
        type: 'h1',
        content: line.replace(/^#\s+/, ''),
      });
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push({
        id: generateBlockId(),
        type: 'h2',
        content: line.replace(/^##\s+/, ''),
      });
      i++;
      continue;
    }
    if (/^###\s+/.test(line)) {
      blocks.push({
        id: generateBlockId(),
        type: 'h3',
        content: line.replace(/^###\s+/, ''),
      });
      i++;
      continue;
    }

    // 9. To-Do Items (- [ ] or - [x])
    const todoMatch = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'todo',
        checked: todoMatch[1].toLowerCase() === 'x',
        content: todoMatch[2],
      });
      i++;
      continue;
    }

    // 10. Bulleted List (- or *)
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'bullet',
        content: bulletMatch[1],
      });
      i++;
      continue;
    }

    // 11. Numbered List (1. )
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'number',
        content: numberMatch[1],
      });
      i++;
      continue;
    }

    // 12. Skip leading/consecutive empty lines if previous is empty
    if (trimmed === '') {
      if (blocks.length > 0 && blocks[blocks.length - 1].type === 'p' && blocks[blocks.length - 1].content === '') {
        i++;
        continue;
      }
      // Single empty line between paragraphs is natural spacing
      i++;
      continue;
    }

    // 13. Regular Paragraph / Plain text
    blocks.push({
      id: generateBlockId(),
      type: 'p',
      content: line,
    });
    i++;
  }

  if (blocks.length === 0) {
    blocks.push(createNewBlock('p', ''));
  }

  return blocks;
}

/**
 * Serializes an array of Notion-style blocks into clean, standard Markdown.
 */
export function serializeBlocksToMarkdown(blocks: EditorBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  const chunks: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prev = blocks[i - 1];

    let serialized = '';

    switch (block.type) {
      case 'h1':
        serialized = `# ${block.content}`;
        break;
      case 'h2':
        serialized = `## ${block.content}`;
        break;
      case 'h3':
        serialized = `### ${block.content}`;
        break;
      case 'todo':
        serialized = `- [${block.checked ? 'x' : ' '}] ${block.content}`;
        break;
      case 'bullet':
        serialized = `- ${block.content}`;
        break;
      case 'number':
        serialized = `1. ${block.content}`;
        break;
      case 'quote':
        serialized = block.content
          .split('\n')
          .map(l => `> ${l}`)
          .join('\n');
        break;
      case 'callout': {
        const type = (block.calloutType || 'NOTE').toUpperCase();
        const body = block.content
          .split('\n')
          .map(l => `> ${l}`)
          .join('\n');
        serialized = `> [!${type}]\n${body}`;
        break;
      }
      case 'code':
        serialized = `\`\`\`${block.language || ''}\n${block.content}\n\`\`\``;
        break;
      case 'math':
        serialized = `$$\n${block.content}\n$$`;
        break;
      case 'mermaid':
        serialized = `\`\`\`mermaid\n${block.content}\n\`\`\``;
        break;
      case 'divider':
        serialized = '---';
        break;
      case 'table':
        serialized = block.content;
        break;
      case 'toggle': {
        const openAttr = block.collapsed ? '' : ' open';
        serialized = `<details${openAttr}>\n<summary>${block.summary || 'Toggle'}</summary>\n${block.content || ''}\n</details>`;
        break;
      }
      case 'image':
        serialized = `![${block.caption || block.content || ''}](${block.url || ''})`;
        break;
      case 'bookmark':
        serialized = `[🔖 ${block.content || block.url}](${block.url || ''})`;
        break;
      case 'p':
      default:
        serialized = block.content;
        break;
    }

    // Determine spacing: list items and todos group with single newlines
    const isListOrTodo = block.type === 'todo' || block.type === 'bullet' || block.type === 'number';
    const prevIsSameList = prev && prev.type === block.type;

    if (i > 0) {
      if (isListOrTodo && prevIsSameList) {
        chunks.push('\n');
      } else {
        chunks.push('\n\n');
      }
    }

    chunks.push(serialized);
  }

  return chunks.join('');
}
