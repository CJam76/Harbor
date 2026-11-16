import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  AlertCircle,
  Table as TableIcon,
  Code,
  Link,
  Bold,
  Italic,
  Strikethrough,
  Sparkles,
  AlignLeft,
  Clock,
  History,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Info,
  Lightbulb,
  AlertTriangle,
  Minus,
  Share2,
  Workflow,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Check,
  Type,
  CornerDownLeft,
  Eye,
  Edit3,
  Maximize2,
  Minimize2,
  AlignCenter,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Image as ImageIcon,
  Bookmark,
  Globe,
  UploadCloud,
  ExternalLink,
  PanelRight,
  PanelRightClose,
  Star
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  extractHeadings,
  extractWikiLinks,
  getReadingStats,
} from '../../lib/markdown';
import {
  EditorBlock,
  BlockType,
  parseMarkdownToBlocks,
  serializeBlocksToMarkdown,
  createNewBlock,
  generateBlockId,
} from '../../lib/editorBlocks';
import katex from 'katex';
import { RevisionHistoryModal } from '../modals/RevisionHistoryModal';
import { CoverPickerModal } from '../modals/CoverPickerModal';
import { LocalGraphMini } from '../graph/LocalGraphMini';

export interface EditorProps {
  pageId?: string;
  isSecondaryPane?: boolean;
}

export const Editor: React.FC<EditorProps> = ({ pageId, isSecondaryPane }) => {
  const {
    activePageId: contextActivePageId,
    pages,
    updatePage,
    editorMode,
    typography,
    theme,
    getBacklinksForPage,
    openWikiLink,
    navigateToPage,
    navigateToGraph,
    isZenMode,
    toggleZenMode,
    isTypewriterMode,
    toggleTypewriterMode,
    isParagraphFocusMode,
    toggleParagraphFocusMode,
    isInspectorOpen,
    toggleInspector,
    toggleFavorite,
  } = useWorkspace();

  const effectivePageId = pageId || contextActivePageId;
  const currentPage = pages.find(p => p.id === effectivePageId);

  // Focus sprint timer state for Zen Mode
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => (s > 0 ? s - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Slash commands state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  // Wiki link autocomplete state
  const [wikiMenuOpen, setWikiMenuOpen] = useState(false);
  const [wikiBlockId, setWikiBlockId] = useState<string | null>(null);
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiIndex, setWikiIndex] = useState(0);

  // Block options menu state
  const [blockMenuOpenId, setBlockMenuOpenId] = useState<string | null>(null);

  // Floating selection formatting toolbar
  const [floatingToolbarOpen, setFloatingToolbarOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Copied code feedback
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  // Dynamic card full-width state
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  // Outline / Backlinks / Connections panels collapse state
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isBacklinksOpen, setIsBacklinksOpen] = useState(true);
  const [isLocalGraphOpen, setIsLocalGraphOpen] = useState(true);

  // Textarea refs map for auto-resizing and focus
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mermaidContainersRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Focus pending block helper
  const pendingFocusRef = useRef<{ id: string; cursor: number } | null>(null);

  // Sync state when active page changes
  useEffect(() => {
    if (currentPage) {
      setTitle(currentPage.title);
      setContent(currentPage.content);
      const parsed = parseMarkdownToBlocks(currentPage.content);
      setBlocks(parsed);
      setActiveBlockId(parsed[0]?.id || null);
    }
  }, [currentPage?.id]);

  // If editorMode switches back to rich from raw, re-parse blocks from content
  useEffect(() => {
    if (editorMode === 'rich' && currentPage) {
      setBlocks(parseMarkdownToBlocks(currentPage.content));
    }
  }, [editorMode]);

  // Adjust textarea heights automatically whenever blocks change or window resizes
  useEffect(() => {
    blocks.forEach(b => {
      const el = textareaRefs.current.get(b.id);
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    });

    if (pendingFocusRef.current) {
      const { id, cursor } = pendingFocusRef.current;
      const el = textareaRefs.current.get(id);
      if (el) {
        el.focus();
        const pos = Math.min(cursor, el.value.length);
        el.setSelectionRange(pos, pos);
      }
      pendingFocusRef.current = null;
    }
  }, [blocks]);

  // Typewriter scrolling effect: keep active block centered in viewport
  useEffect(() => {
    if (!isTypewriterMode || !activeBlockId) return;
    const el = textareaRefs.current.get(activeBlockId) || document.getElementById(`block-${activeBlockId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeBlockId, isTypewriterMode, content]);

  // Drag and drop image/media attachment state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const newImgBlock: EditorBlock = {
            id: generateBlockId(),
            type: 'image',
            content: file.name,
            url: dataUrl,
            caption: file.name,
          };
          setBlocks(prev => {
            const next = [...prev, newImgBlock];
            syncBlocks(next);
            return next;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              const newImgBlock: EditorBlock = {
                id: generateBlockId(),
                type: 'image',
                content: file.name || 'Pasted Image',
                url: dataUrl,
                caption: 'Pasted Image',
              };
              setBlocks(prev => {
                const idx = prev.findIndex(b => b.id === activeBlockId);
                const next = [...prev];
                if (idx !== -1) {
                  next.splice(idx + 1, 0, newImgBlock);
                } else {
                  next.push(newImgBlock);
                }
                syncBlocks(next);
                return next;
              });
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  // Load and render Mermaid diagrams
  useEffect(() => {
    const mermaidBlocks = blocks.filter(b => b.type === 'mermaid');
    if (mermaidBlocks.length > 0) {
      const runDiagrams = () => {
        if ((window as any).mermaid) {
          try {
            (window as any).mermaid.initialize({
              startOnLoad: false,
              theme: theme === 'dark' ? 'dark' : 'neutral',
              securityLevel: 'loose',
            });
            mermaidBlocks.forEach(b => {
              const el = mermaidContainersRef.current.get(b.id);
              if (el && b.content.trim()) {
                (window as any).mermaid
                  .render(`mermaid-${b.id}`, b.content.trim())
                  .then((res: any) => {
                    el.innerHTML = res.svg;
                  })
                  .catch(() => {
                    el.innerHTML = `<div class="text-rose-500 font-mono text-xs">Syntax error in Mermaid diagram</div>`;
                  });
              }
            });
          } catch (err) {}
        }
      };

      if ((window as any).mermaid) {
        runDiagrams();
      } else {
        const existing = document.getElementById('harbor-mermaid-cdn');
        if (!existing) {
          const script = document.createElement('script');
          script.id = 'harbor-mermaid-cdn';
          script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
          script.onload = () => runDiagrams();
          document.head.appendChild(script);
        }
      }
    }
  }, [blocks, theme]);

  // Autosave title edit
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (currentPage) {
      updatePage({ id: currentPage.id, title: newTitle });
    }
  };

  // Autosave raw markdown edit
  const handleRawContentChange = (newRaw: string) => {
    setContent(newRaw);
    if (currentPage) {
      updatePage({ id: currentPage.id, content: newRaw });
    }
  };

  // Synchronize blocks to markdown and update workspace
  const syncBlocks = useCallback(
    (newBlocks: EditorBlock[]) => {
      setBlocks(newBlocks);
      const markdown = serializeBlocksToMarkdown(newBlocks);
      setContent(markdown);
      if (currentPage) {
        updatePage({ id: currentPage.id, content: markdown });
      }
    },
    [currentPage, updatePage]
  );

  // Handle direct text changes inside a block, with live Markdown shortcuts!
  const handleBlockTextChange = (id: string, newText: string) => {
    const blockIndex = blocks.findIndex(b => b.id === id);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];

    // Live Markdown shortcut detection on plain text paragraphs:
    if (block.type === 'p') {
      if (newText.startsWith('# ')) {
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'h1', content: newText.slice(2) };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (newText.startsWith('## ')) {
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'h2', content: newText.slice(3) };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (newText.startsWith('### ')) {
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'h3', content: newText.slice(4) };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (newText.startsWith('- [ ] ') || newText.startsWith('[] ') || newText.startsWith('- [x] ')) {
        const isChecked = newText.startsWith('- [x] ');
        const cleaned = newText.replace(/^(- \[[ xX]\]|\[\])\s*/, '');
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'todo', checked: isChecked, content: cleaned };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (newText.startsWith('- ') || newText.startsWith('* ')) {
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'bullet', content: newText.slice(2) };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (/^\d+\.\s/.test(newText)) {
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'number', content: newText.replace(/^\d+\.\s/, '') };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (newText.startsWith('> ')) {
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'quote', content: newText.slice(2) };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (newText === '---' || newText === '***') {
        const newP = createNewBlock('p', '');
        const updated = [...blocks];
        updated.splice(blockIndex, 1, { ...block, type: 'divider', content: '' }, newP);
        syncBlocks(updated);
        pendingFocusRef.current = { id: newP.id, cursor: 0 };
        return;
      }
      if (newText.startsWith('```')) {
        const lang = newText.slice(3).trim();
        const updated = [...blocks];
        updated[blockIndex] = {
          ...block,
          type: 'code',
          language: lang || 'typescript',
          content: '',
        };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
      if (newText.startsWith('$$')) {
        const updated = [...blocks];
        updated[blockIndex] = {
          ...block,
          type: 'math',
          content: '',
        };
        syncBlocks(updated);
        pendingFocusRef.current = { id, cursor: 0 };
        return;
      }
    }

    // Standard text update
    const updated = [...blocks];
    updated[blockIndex] = { ...block, content: newText };
    syncBlocks(updated);
  };

  // Toggle todo item
  const handleToggleTodo = (id: string) => {
    const updated = blocks.map(b => (b.id === id ? { ...b, checked: !b.checked } : b));
    syncBlocks(updated);
  };

  // Convert block type
  const handleConvertBlockType = (id: string, type: BlockType, extra?: Partial<EditorBlock>) => {
    const updated = blocks.map(b => (b.id === id ? { ...b, type, ...extra } : b));
    syncBlocks(updated);
    setBlockMenuOpenId(null);
    setSlashMenuOpen(false);
    pendingFocusRef.current = { id, cursor: 0 };
  };

  // Insert a new block below target block
  const handleInsertBlockBelow = (targetId: string, type: BlockType = 'p') => {
    const index = blocks.findIndex(b => b.id === targetId);
    const newBlock = createNewBlock(type);
    const updated = [...blocks];
    if (index === -1) {
      updated.push(newBlock);
    } else {
      updated.splice(index + 1, 0, newBlock);
    }
    syncBlocks(updated);
    pendingFocusRef.current = { id: newBlock.id, cursor: 0 };
  };

  // Delete a block
  const handleDeleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      // Keep at least one empty block
      const empty = createNewBlock('p', '');
      syncBlocks([empty]);
      pendingFocusRef.current = { id: empty.id, cursor: 0 };
      return;
    }
    const index = blocks.findIndex(b => b.id === id);
    const prevBlock = blocks[index - 1] || blocks[index + 1];
    const updated = blocks.filter(b => b.id !== id);
    syncBlocks(updated);
    if (prevBlock) {
      pendingFocusRef.current = { id: prevBlock.id, cursor: prevBlock.content.length };
    }
  };

  // Duplicate a block
  const handleDuplicateBlock = (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    const original = blocks[index];
    const clone = { ...original, id: generateBlockId() };
    const updated = [...blocks];
    updated.splice(index + 1, 0, clone);
    syncBlocks(updated);
    setBlockMenuOpenId(null);
  };

  // Move block up or down
  const handleMoveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    syncBlocks(updated);
    setBlockMenuOpenId(null);
  };

  // Keyboard navigation & behavior (Enter, Backspace, Arrow keys)
  const handleBlockKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, block: EditorBlock) => {
    const textarea = e.currentTarget;
    const cursor = textarea.selectionStart;
    const blockIndex = blocks.findIndex(b => b.id === block.id);

    // Slash menu navigation
    if (slashMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(prev => (prev + 1) % Math.max(1, filteredSlashCommands.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(prev => (prev - 1 + filteredSlashCommands.length) % Math.max(1, filteredSlashCommands.length));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredSlashCommands[slashIndex]) {
          filteredSlashCommands[slashIndex].action(block.id);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenuOpen(false);
        return;
      }
    }

    // Wiki menu navigation
    if (wikiMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setWikiIndex(prev => (prev + 1) % Math.max(1, matchingWikiPages.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setWikiIndex(prev => (prev - 1 + matchingWikiPages.length) % Math.max(1, matchingWikiPages.length));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (matchingWikiPages[wikiIndex]) {
          insertWikiLink(block.id, matchingWikiPages[wikiIndex].title);
        } else if (wikiQuery.trim()) {
          insertWikiLink(block.id, wikiQuery.trim());
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setWikiMenuOpen(false);
        return;
      }
    }

    // ENTER: create new block or continue list
    if (e.key === 'Enter' && !e.shiftKey) {
      // In code or math or mermaid, allow multiline with Enter
      if (block.type === 'code' || block.type === 'math' || block.type === 'mermaid') {
        return; // default newline
      }

      e.preventDefault();

      // Empty list / todo item -> convert back to paragraph (Notion standard)
      if ((block.type === 'todo' || block.type === 'bullet' || block.type === 'number') && block.content.trim() === '') {
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'p', content: '' };
        syncBlocks(updated);
        return;
      }

      // If in list / todo, continue same list type
      const nextType: BlockType =
        block.type === 'todo' ? 'todo' : block.type === 'bullet' ? 'bullet' : block.type === 'number' ? 'number' : 'p';

      const textBefore = block.content.substring(0, cursor);
      const textAfter = block.content.substring(cursor);

      const updated = [...blocks];
      updated[blockIndex] = { ...block, content: textBefore };
      const newBlock = createNewBlock(nextType, textAfter);
      updated.splice(blockIndex + 1, 0, newBlock);
      syncBlocks(updated);
      pendingFocusRef.current = { id: newBlock.id, cursor: 0 };
      return;
    }

    // BACKSPACE: delete empty block or convert back to paragraph
    if (e.key === 'Backspace' && cursor === 0 && textarea.selectionEnd === 0) {
      if (block.type !== 'p') {
        // Convert heading, list, or quote back to paragraph without deleting content
        e.preventDefault();
        const updated = [...blocks];
        updated[blockIndex] = { ...block, type: 'p' };
        syncBlocks(updated);
        return;
      }

      if (blockIndex > 0) {
        e.preventDefault();
        const prevBlock = blocks[blockIndex - 1];
        const prevLen = prevBlock.content.length;
        const updated = [...blocks];
        updated[blockIndex - 1] = {
          ...prevBlock,
          content: prevBlock.content + block.content,
        };
        updated.splice(blockIndex, 1);
        syncBlocks(updated);
        pendingFocusRef.current = { id: prevBlock.id, cursor: prevLen };
        return;
      }
    }

    // Arrow navigation between blocks
    if (e.key === 'ArrowUp' && cursor === 0 && blockIndex > 0) {
      e.preventDefault();
      const prev = blocks[blockIndex - 1];
      const prevEl = textareaRefs.current.get(prev.id);
      if (prevEl) {
        prevEl.focus();
        prevEl.setSelectionRange(prev.content.length, prev.content.length);
      }
    }
    if (e.key === 'ArrowDown' && cursor === block.content.length && blockIndex < blocks.length - 1) {
      e.preventDefault();
      const next = blocks[blockIndex + 1];
      const nextEl = textareaRefs.current.get(next.id);
      if (nextEl) {
        nextEl.focus();
        nextEl.setSelectionRange(0, 0);
      }
    }
  };

  // KeyUp watcher for `/` command menu and `[[` wiki link menu
  const handleBlockKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>, block: EditorBlock) => {
    const textarea = e.currentTarget;
    const cursor = textarea.selectionStart;
    const textBefore = block.content.substring(0, cursor);

    // Check for `/` trigger
    const lineBefore = textBefore.substring(textBefore.lastIndexOf('\n') + 1);
    const slashMatch = lineBefore.match(/\/([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      setSlashMenuOpen(true);
      setSlashBlockId(block.id);
      setSlashQuery(slashMatch[1]);
      setSlashIndex(0);
      setWikiMenuOpen(false);
    } else {
      setSlashMenuOpen(false);
    }

    // Check for `[[` trigger
    const wikiMatch = lineBefore.match(/\[\[([^\]]*)$/);
    if (wikiMatch) {
      setWikiMenuOpen(true);
      setWikiBlockId(block.id);
      setWikiQuery(wikiMatch[1]);
      setWikiIndex(0);
      setSlashMenuOpen(false);
    } else {
      setWikiMenuOpen(false);
    }

    // Floating selection toolbar
    if (textarea.selectionStart !== textarea.selectionEnd) {
      setSelectedText(block.content.substring(textarea.selectionStart, textarea.selectionEnd));
      setFloatingToolbarOpen(true);
    } else {
      setFloatingToolbarOpen(false);
    }
  };

  // Helper to insert wiki link
  const insertWikiLink = (blockId: string, targetTitle: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const el = textareaRefs.current.get(blockId);
    const start = el ? el.selectionStart : block.content.length;
    const textBefore = block.content.substring(0, start);
    const lastBracket = textBefore.lastIndexOf('[[');

    const replacement = `[[${targetTitle}]]`;
    let newContent = '';
    if (lastBracket !== -1) {
      newContent = block.content.substring(0, lastBracket) + replacement + block.content.substring(start);
    } else {
      newContent = block.content.substring(0, start) + replacement + block.content.substring(start);
    }

    const updated = [...blocks];
    updated[blockIndex] = { ...block, content: newContent };
    syncBlocks(updated);
    setWikiMenuOpen(false);

    const newPos = (lastBracket !== -1 ? lastBracket : start) + replacement.length;
    pendingFocusRef.current = { id: blockId, cursor: newPos };
  };

  // Formatting helpers for floating toolbar
  const applyInlineFormatting = (wrapper: string) => {
    if (!activeBlockId) return;
    const el = textareaRefs.current.get(activeBlockId);
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const blockIndex = blocks.findIndex(b => b.id === activeBlockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const selected = block.content.substring(start, end);
    if (!selected) return;

    const formatted = `${wrapper}${selected}${wrapper}`;
    const newContent = block.content.substring(0, start) + formatted + block.content.substring(end);

    const updated = [...blocks];
    updated[blockIndex] = { ...block, content: newContent };
    syncBlocks(updated);
    setFloatingToolbarOpen(false);

    pendingFocusRef.current = { id: activeBlockId, cursor: end + wrapper.length };
  };

  // Copy code block content
  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlockId(id);
    setTimeout(() => setCopiedBlockId(null), 1500);
  };

  // Outline headings from current content
  const headings = extractHeadings(content);
  const { words, readingTimeMinutes } = getReadingStats(content);
  const backlinks = currentPage ? getBacklinksForPage(currentPage.id) : [];

  // Wiki page matches
  const matchingWikiPages = pages.filter(
    p => p.id !== currentPage?.id && p.title.toLowerCase().includes(wikiQuery.toLowerCase().trim())
  );

  // Slash commands catalog
  const slashCommands = [
    {
      id: 'text',
      title: 'Text',
      desc: 'Just start writing plain text',
      icon: Type,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'p');
      },
    },
    {
      id: 'h1',
      title: 'Heading 1',
      desc: 'Large section heading',
      icon: Heading1,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'h1');
      },
    },
    {
      id: 'h2',
      title: 'Heading 2',
      desc: 'Medium section heading',
      icon: Heading2,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'h2');
      },
    },
    {
      id: 'h3',
      title: 'Heading 3',
      desc: 'Small section heading',
      icon: Heading3,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'h3');
      },
    },
    {
      id: 'todo',
      title: 'To-do List',
      desc: 'Track tasks with an interactive checkbox',
      icon: CheckSquare,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'todo', { checked: false });
      },
    },
    {
      id: 'bullet',
      title: 'Bulleted List',
      desc: 'Create a clean bulleted list',
      icon: List,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'bullet');
      },
    },
    {
      id: 'number',
      title: 'Numbered List',
      desc: 'Create an ordered sequence',
      icon: ListOrdered,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'number');
      },
    },
    {
      id: 'quote',
      title: 'Quote',
      desc: 'Capture a quote or highlight block',
      icon: Quote,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'quote');
      },
    },
    {
      id: 'callout',
      title: 'Callout Box',
      desc: 'Highlight critical notes or insights',
      icon: AlertCircle,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'callout', { calloutType: 'note' });
      },
    },
    {
      id: 'code',
      title: 'Code Block',
      desc: 'Syntax-highlighted code snippet',
      icon: Code,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'code', { language: 'typescript' });
      },
    },
    {
      id: 'math',
      title: 'LaTeX Math Formula',
      desc: 'Display rich mathematical notation',
      icon: Sparkles,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'math', { content: 'c_{\\text{crit}} = \\log_b(a)' });
      },
    },
    {
      id: 'mermaid',
      title: 'Mermaid Diagram',
      desc: 'Flowchart or architecture graph',
      icon: Workflow,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'mermaid', { content: 'graph TD\n  A[Start] --> B[Process]\n  B --> C[Done]' });
      },
    },
    {
      id: 'divider',
      title: 'Divider',
      desc: 'Visually divide sections with a hairline rule',
      icon: Minus,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'divider', { content: '' });
      },
    },
    {
      id: 'wiki',
      title: 'Link to Page',
      desc: 'Reference another page with [[wiki link]]',
      icon: Link,
      action: (id: string) => {
        setSlashMenuOpen(false);
        setWikiMenuOpen(true);
        setWikiBlockId(id);
        setWikiQuery('');
      },
    },
    {
      id: 'toggle',
      title: 'Toggle List / Accordion',
      desc: 'Collapsible section to hide or reveal details',
      icon: ChevronRight,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'toggle', { summary: 'Toggle list', collapsed: false, content: '' });
      },
    },
    {
      id: 'image',
      title: 'Image',
      desc: 'Embed an image with caption or upload from disk',
      icon: ImageIcon,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'image', { url: '', caption: '' });
      },
    },
    {
      id: 'bookmark',
      title: 'Web Bookmark',
      desc: 'Aesthetic link card for any web link',
      icon: Bookmark,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'bookmark', { url: 'https://', content: 'Web Bookmark' });
      },
    },
    {
      id: 'toc',
      title: 'Table of Contents',
      desc: 'Dynamic interactive outline of page headings',
      icon: ListOrdered,
      action: (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block) handleBlockTextChange(id, block.content.replace(/\/([a-zA-Z0-9_-]*)$/, ''));
        handleConvertBlockType(id, 'toc');
      },
    },
  ];

  const filteredSlashCommands = slashCommands.filter(
    cmd =>
      cmd.title.toLowerCase().includes(slashQuery.toLowerCase()) ||
      cmd.id.toLowerCase().includes(slashQuery.toLowerCase())
  );

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Select a page from the sidebar to begin editing.
      </div>
    );
  }

  const hasWideContent = blocks.some(
    b => b.type === 'table' || b.type === 'mermaid' || (b.type === 'code' && b.content.length > 250)
  );

  const cardMaxWidth = isSecondaryPane
    ? 'max-w-full'
    : isFullWidth
    ? 'max-w-6xl xl:max-w-7xl'
    : hasWideContent
    ? 'max-w-4xl xl:max-w-5xl'
    : 'max-w-3xl xl:max-w-4xl';

  return (
    <div className="flex-1 flex overflow-hidden relative" onClick={() => setBlockMenuOpenId(null)}>
      {/* Floating Zen Mode HUD (Shown when Zen Focus Mode is active) */}
      {isZenMode && !isSecondaryPane && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 bg-white/95 dark:bg-[#0b1120]/95 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 opacity-60 hover:opacity-100 transition-opacity duration-200 select-none">
          {/* Focus Sprint Timer */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2.5">
            <Timer className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono font-medium">{formatTimer(timerSeconds)}</span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              title={isTimerRunning ? "Pause Timer" : "Start Focus Timer (25m)"}
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(25 * 60);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              title="Reset Timer (25 min)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Typewriter Mode Toggle Pill */}
          <button
            type="button"
            onClick={toggleTypewriterMode}
            className={`px-2 py-0.5 rounded-none border text-[11px] transition-colors flex items-center gap-1 ${
              isTypewriterMode
                ? 'border-[#0284c7] text-[#0284c7] bg-[#0284c7]/10 font-medium'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Typewriter Scrolling (Ctrl+Shift+T)"
          >
            <AlignCenter className="w-3 h-3" />
            <span>Typewriter: {isTypewriterMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Paragraph Focus Toggle Pill */}
          <button
            type="button"
            onClick={toggleParagraphFocusMode}
            className={`px-2 py-0.5 rounded-none border text-[11px] transition-colors flex items-center gap-1 ${
              isParagraphFocusMode
                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10 font-medium'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Dim surrounding non-active paragraphs"
          >
            <Eye className="w-3 h-3" />
            <span>Focus: {isParagraphFocusMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reading Stats */}
          <span className="hidden md:inline font-mono text-[11px] text-slate-400 pl-1">
            {words}w • {readingTimeMinutes}m
          </span>

          {/* Exit Zen Button */}
          <button
            type="button"
            onClick={toggleZenMode}
            className="ml-1 flex items-center gap-1 px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs rounded-none hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
            title="Exit Zen Focus Mode (Esc or F11)"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Exit (Esc)</span>
          </button>
        </div>
      )}

      {/* Center Writing Surface: Graphic Realism Paper Sheet with Dynamic Auto-Expansion */}
      <main
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={`flex-1 overflow-y-auto ${isSecondaryPane ? 'p-3 sm:p-5' : 'p-6 sm:p-10 lg:p-12'} ${
          isTypewriterMode ? 'pb-[60vh]' : ''
        } flex justify-center items-start relative`}
      >
        {/* Drag & Drop Visual Target Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-4 z-40 border-2 border-dashed border-[#0284c7] bg-[#0284c7]/10 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none text-center">
            <UploadCloud className="w-12 h-12 text-[#0284c7] animate-bounce mb-2" />
            <span className="text-sm font-semibold text-[#0284c7]">
              Drop images to attach directly to note
            </span>
          </div>
        )}

        <div
          className={`w-full ${cardMaxWidth} paper-sheet ${isSecondaryPane ? 'p-5 sm:p-8' : 'p-8 sm:p-12 lg:p-14'} min-h-[calc(100vh-6rem)] h-fit flex flex-col mb-12 transition-all duration-200 shadow-sm relative overflow-hidden`}
        >
          {/* Page Cover Banner */}
          {currentPage.coverImage && (
            <div
              className={`relative w-full h-44 sm:h-56 mb-8 overflow-hidden group/cover select-none border-b border-slate-200 dark:border-slate-800 ${
                isSecondaryPane
                  ? '-mt-5 sm:-mt-8 -mx-5 sm:-mx-8 w-[calc(100%+2.5rem)] sm:w-[calc(100%+4rem)]'
                  : '-mt-8 sm:-mt-12 lg:-mt-14 -mx-8 sm:-mx-12 lg:-mx-14 w-[calc(100%+4rem)] sm:w-[calc(100%+6rem)] lg:w-[calc(100%+7rem)]'
              }`}
            >
              <img
                src={currentPage.coverImage}
                alt="Page cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/cover:opacity-100 transition-opacity" />
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-0 group-hover/cover:opacity-100 transition-opacity z-10">
                <button
                  type="button"
                  onClick={() => setCoverPickerOpen(true)}
                  className="px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-slate-900 text-xs font-medium border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
                >
                  Change cover
                </button>
                <button
                  type="button"
                  onClick={() => updatePage({ id: currentPage.id, coverImage: undefined })}
                  className="px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 text-rose-500 hover:text-rose-600 text-xs font-medium border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Document Title Header */}
          <div className="mb-6 group/title">
            {!currentPage.coverImage && (
              <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 opacity-0 group-hover/title:opacity-100 transition-opacity select-none">
                <button
                  type="button"
                  onClick={() => setCoverPickerOpen(true)}
                  className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Add cover</span>
                </button>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Untitled Page"
                className={`w-full text-3xl sm:text-4xl font-bold tracking-tight bg-transparent border-none outline-none text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-700 ${
                  typography === 'serif' ? 'font-serif' : 'font-sans'
                }`}
              />
              {currentPage && (
                <button
                  type="button"
                  onClick={() => toggleFavorite(currentPage.id, 'page')}
                  className={`p-1.5 transition-colors rounded-none opacity-0 group-hover/title:opacity-100 ${
                    currentPage.isFavorite ? '!opacity-100 text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                  }`}
                  title={currentPage.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Star className={`w-5 h-5 ${currentPage.isFavorite ? 'fill-amber-500' : ''}`} />
                </button>
              )}
            </div>
            {/* Meta Row: Word count & reading time */}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 select-none">
              <span className="flex items-center gap-1">
                <AlignLeft className="w-3.5 h-3.5" />
                {words} {words === 1 ? 'word' : 'words'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {readingTimeMinutes} min read
              </span>
              {currentPage.tags && currentPage.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {currentPage.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded-none font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Right Controls: Typewriter Mode, Zen Focus, Width Toggle */}
              <div className="ml-auto flex items-center gap-1.5">
                {/* Typewriter Toggle */}
                <button
                  type="button"
                  onClick={toggleTypewriterMode}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-none border text-[11px] transition-colors ${
                    isTypewriterMode
                      ? 'border-[#0284c7] text-[#0284c7] bg-[#0284c7]/10 font-medium'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title="Typewriter Scrolling (Ctrl+Shift+T)"
                >
                  <AlignCenter className="w-3 h-3" />
                  <span className="hidden sm:inline">Typewriter</span>
                </button>

                {/* Revision History Toggle */}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-none border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-[11px]"
                  title="Revision History & Backups"
                >
                  <History className="w-3 h-3" />
                  <span className="hidden sm:inline">History</span>
                </button>

                {/* Zen Focus Mode Toggle */}
                <button
                  type="button"
                  onClick={toggleZenMode}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-none border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-[11px]"
                  title="Zen Focus Mode (F11 or Ctrl+Shift+F)"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Zen Focus</span>
                </button>

                {/* Inspector Drawer Toggle */}
                <button
                  type="button"
                  onClick={toggleInspector}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-none border text-[11px] transition-colors ${
                    isInspectorOpen
                      ? 'border-[#0284c7] text-[#0284c7] bg-[#0284c7]/10 font-medium'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title="Document Inspector (Outline & Backlinks) • Ctrl+Shift+O"
                >
                  <PanelRight className="w-3 h-3" />
                  <span className="hidden sm:inline">Inspector</span>
                </button>

                {/* Dynamic Width Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullWidth(!isFullWidth)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-none border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-[11px]"
                  title={isFullWidth ? "Switch to standard width" : "Expand to full width"}
                >
                  {isFullWidth ? (
                    <>
                      <Minimize2 className="w-3 h-3" />
                      <span>Standard Width</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3" />
                      <span>Full Width</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="h-px bg-slate-200/80 dark:bg-slate-800 mt-4" />
          </div>

          {/* Floating Selection Formatting Bar */}
          {floatingToolbarOpen && (
            <div className="fixed z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-glass px-1 py-0.5 flex items-center gap-0.5 rounded-none border border-slate-700 dark:border-slate-300 text-xs animate-in fade-in zoom-in-95 duration-100 top-20 right-28">
              <button
                onClick={() => applyInlineFormatting('**')}
                className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-none"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyInlineFormatting('*')}
                className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-none"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyInlineFormatting('~~')}
                className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-none"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyInlineFormatting('`')}
                className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-none"
                title="Inline Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyInlineFormatting('[[' + ']]')}
                className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-none"
                title="Wiki Link"
              >
                <Link className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mode Switch: Rich Notion-Style Direct Block Canvas vs Raw Markdown */}
          {editorMode === 'rich' ? (
            <div className="flex-1 flex flex-col space-y-1">
              {blocks.map((block, index) => {
                const isFocused = activeBlockId === block.id;
                const isDimmed = isParagraphFocusMode && activeBlockId !== null && !isFocused;

                return (
                  <div
                    key={block.id}
                    id={`block-${block.id}`}
                    className={`group relative flex items-start py-1 transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-none w-full ${
                      isDimmed ? 'opacity-30 hover:opacity-100' : 'opacity-100'
                    }`}
                    onMouseEnter={() => {}}
                  >
                    {/* Notion-style Left Gutter Handle (+ and ⠿) positioned in the margin */}
                    <div className="absolute -left-7 sm:-left-8 top-1.5 flex items-center opacity-0 group-hover:opacity-100 transition-opacity select-none z-10">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleInsertBlockBelow(block.id);
                        }}
                        className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-none transition-colors"
                        title="Add block below"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setBlockMenuOpenId(blockMenuOpenId === block.id ? null : block.id);
                        }}
                        className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-none transition-colors"
                        title="Block options & convert"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Block Options Dropdown */}
                      {blockMenuOpenId === block.id && (
                        <div
                          className="absolute left-10 top-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass w-48 py-1 rounded-none text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Turn into
                          </div>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'p')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Type className="w-3.5 h-3.5" />
                            <span>Text</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'h1')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Heading1 className="w-3.5 h-3.5" />
                            <span>Heading 1</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'h2')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Heading2 className="w-3.5 h-3.5" />
                            <span>Heading 2</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'h3')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Heading3 className="w-3.5 h-3.5" />
                            <span>Heading 3</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'todo', { checked: false })}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>To-do list</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'bullet')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <List className="w-3.5 h-3.5" />
                            <span>Bulleted list</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'number')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>Numbered list</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'quote')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Quote className="w-3.5 h-3.5" />
                            <span>Quote</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'code')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Code className="w-3.5 h-3.5" />
                            <span>Code Block</span>
                          </button>
                          <button
                            onClick={() => handleConvertBlockType(block.id, 'toc')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>Table of Contents</span>
                          </button>

                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                          <button
                            onClick={() => handleDuplicateBlock(block.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={() => handleMoveBlock(block.id, 'up')}
                            disabled={index === 0}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          >
                            <span>Move Up</span>
                          </button>
                          <button
                            onClick={() => handleMoveBlock(block.id, 'down')}
                            disabled={index === blocks.length - 1}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          >
                            <span>Move Down</span>
                          </button>
                          <button
                            onClick={() => handleDeleteBlock(block.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Block Content Renderers */}
                    <div className="w-full flex-1">
                      {/* 1. HEADING 1 */}
                      {block.type === 'h1' && (
                        <textarea
                          ref={el => el && textareaRefs.current.set(block.id, el)}
                          value={block.content}
                          onFocus={() => setActiveBlockId(block.id)}
                          onChange={e => handleBlockTextChange(block.id, e.target.value)}
                          onKeyDown={e => handleBlockKeyDown(e, block)}
                          onKeyUp={e => handleBlockKeyUp(e, block)}
                          rows={1}
                          placeholder="Heading 1"
                          className={`w-full bg-transparent border-none outline-none resize-none text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-snug overflow-hidden break-words whitespace-pre-wrap ${
                            typography === 'serif' ? 'font-serif' : 'font-sans'
                          }`}
                        />
                      )}

                      {/* 2. HEADING 2 */}
                      {block.type === 'h2' && (
                        <textarea
                          ref={el => el && textareaRefs.current.set(block.id, el)}
                          value={block.content}
                          onFocus={() => setActiveBlockId(block.id)}
                          onChange={e => handleBlockTextChange(block.id, e.target.value)}
                          onKeyDown={e => handleBlockKeyDown(e, block)}
                          onKeyUp={e => handleBlockKeyUp(e, block)}
                          rows={1}
                          placeholder="Heading 2"
                          className={`w-full bg-transparent border-none outline-none resize-none text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-snug overflow-hidden break-words whitespace-pre-wrap ${
                            typography === 'serif' ? 'font-serif' : 'font-sans'
                          }`}
                        />
                      )}

                      {/* 3. HEADING 3 */}
                      {block.type === 'h3' && (
                        <textarea
                          ref={el => el && textareaRefs.current.set(block.id, el)}
                          value={block.content}
                          onFocus={() => setActiveBlockId(block.id)}
                          onChange={e => handleBlockTextChange(block.id, e.target.value)}
                          onKeyDown={e => handleBlockKeyDown(e, block)}
                          onKeyUp={e => handleBlockKeyUp(e, block)}
                          rows={1}
                          placeholder="Heading 3"
                          className={`w-full bg-transparent border-none outline-none resize-none text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-snug overflow-hidden break-words whitespace-pre-wrap ${
                            typography === 'serif' ? 'font-serif' : 'font-sans'
                          }`}
                        />
                      )}

                      {/* 4. TO-DO CHECKBOX */}
                      {block.type === 'todo' && (
                        <div className="flex items-start gap-2.5 w-full">
                          <button
                            type="button"
                            onClick={() => handleToggleTodo(block.id)}
                            className={`mt-1 w-4 h-4 flex-shrink-0 flex items-center justify-center border transition-all rounded-none ${
                              block.checked
                                ? 'bg-[#0284c7] border-[#0284c7] text-white shadow-xs'
                                : 'border-slate-300 dark:border-slate-600 hover:border-[#0284c7] bg-white dark:bg-slate-900'
                            }`}
                          >
                            {block.checked && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onKeyUp={e => handleBlockKeyUp(e, block)}
                            rows={1}
                            placeholder="To-do item"
                            className={`w-full bg-transparent border-none outline-none resize-none text-base leading-relaxed overflow-hidden break-words whitespace-pre-wrap transition-all ${
                              block.checked
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-800 dark:text-slate-200'
                            } ${typography === 'serif' ? 'font-serif' : 'font-sans'}`}
                          />
                        </div>
                      )}

                      {/* 5. BULLETED LIST */}
                      {block.type === 'bullet' && (
                        <div className="flex items-start gap-2.5 w-full">
                          <span className="mt-2 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-slate-700 dark:bg-slate-300 select-none" />
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onKeyUp={e => handleBlockKeyUp(e, block)}
                            rows={1}
                            placeholder="List item"
                            className={`w-full bg-transparent border-none outline-none resize-none text-base text-slate-800 dark:text-slate-200 leading-relaxed overflow-hidden break-words whitespace-pre-wrap ${
                              typography === 'serif' ? 'font-serif' : 'font-sans'
                            }`}
                          />
                        </div>
                      )}

                      {/* 6. NUMBERED LIST */}
                      {block.type === 'number' && (
                        <div className="flex items-start gap-2.5 w-full">
                          <span className="font-mono text-xs text-slate-400 select-none mt-1 min-w-[16px]">
                            {index + 1}.
                          </span>
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onKeyUp={e => handleBlockKeyUp(e, block)}
                            rows={1}
                            placeholder="Numbered item"
                            className={`w-full bg-transparent border-none outline-none resize-none text-base text-slate-800 dark:text-slate-200 leading-relaxed overflow-hidden break-words whitespace-pre-wrap ${
                              typography === 'serif' ? 'font-serif' : 'font-sans'
                            }`}
                          />
                        </div>
                      )}

                      {/* 7. QUOTE */}
                      {block.type === 'quote' && (
                        <div className="border-l-2 border-slate-800 dark:border-slate-200 pl-4 py-1 italic bg-slate-50/50 dark:bg-slate-900/30">
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onKeyUp={e => handleBlockKeyUp(e, block)}
                            rows={1}
                            placeholder="Empty quote"
                            className={`w-full bg-transparent border-none outline-none resize-none text-base text-slate-700 dark:text-slate-300 leading-relaxed overflow-hidden break-words whitespace-pre-wrap ${
                              typography === 'serif' ? 'font-serif' : 'font-sans'
                            }`}
                          />
                        </div>
                      )}

                      {/* 8. CALLOUT */}
                      {block.type === 'callout' && (
                        <div className="flex items-start gap-3 p-3.5 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 rounded-none w-full">
                          <Info className="w-4 h-4 text-[#0284c7] flex-shrink-0 mt-0.5" />
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onKeyUp={e => handleBlockKeyUp(e, block)}
                            rows={1}
                            placeholder="Callout text..."
                            className={`w-full bg-transparent border-none outline-none resize-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed overflow-hidden break-words whitespace-pre-wrap ${
                              typography === 'serif' ? 'font-serif' : 'font-sans'
                            }`}
                          />
                        </div>
                      )}

                      {/* 9. CODE BLOCK */}
                      {block.type === 'code' && (
                        <div className="w-full bg-slate-950 border border-slate-800 rounded-none overflow-hidden my-1">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[10px] font-mono text-slate-400 select-none">
                            <span className="uppercase">{block.language || 'Code'}</span>
                            <button
                              onClick={() => handleCopyCode(block.id, block.content)}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              {copiedBlockId === block.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onKeyUp={e => handleBlockKeyUp(e, block)}
                            rows={3}
                            placeholder="// Write code here..."
                            className="w-full bg-transparent border-none outline-none resize-none p-3 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed overflow-hidden"
                          />
                        </div>
                      )}

                      {/* 10. LATEX MATH FORMULA */}
                      {block.type === 'math' && (
                        <div className="w-full p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 my-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase mb-2 select-none">
                            <span>LaTeX Math Equation</span>
                            <span className="lowercase text-slate-400">edit or view live</span>
                          </div>
                          {/* Live Rendered KaTeX */}
                          <div
                            className="py-2 overflow-x-auto text-center font-serif text-slate-900 dark:text-slate-100"
                            dangerouslySetInnerHTML={{
                              __html: (() => {
                                try {
                                  return katex.renderToString(block.content || 'E = mc^2', {
                                    throwOnError: false,
                                    displayMode: true,
                                  });
                                } catch (e) {
                                  return '<span class="text-rose-500 font-mono text-xs">Invalid LaTeX expression</span>';
                                }
                              })(),
                            }}
                          />
                          {/* Inline LaTeX Source Editor */}
                          <input
                            type="text"
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleInsertBlockBelow(block.id);
                              }
                            }}
                            placeholder="Type LaTeX formula (e.g. c_{\text{crit}} = \log_b(a))"
                            className="w-full mt-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0284c7]"
                          />
                        </div>
                      )}

                      {/* 11. MERMAID DIAGRAM */}
                      {block.type === 'mermaid' && (
                        <div className="w-full p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 my-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase mb-2 select-none">
                            <span>Mermaid Diagram</span>
                            <span className="lowercase text-slate-400">live SVG preview</span>
                          </div>
                          {/* Rendered SVG Container */}
                          <div
                            ref={el => el && mermaidContainersRef.current.set(block.id, el)}
                            className="py-2 flex justify-center overflow-x-auto"
                          />
                          {/* Diagram Syntax Editor */}
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            rows={3}
                            placeholder="graph TD; A-->B;"
                            className="w-full mt-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0284c7] resize-y"
                          />
                        </div>
                      )}

                      {/* 12. DIVIDER */}
                      {block.type === 'divider' && (
                        <div className="py-3 cursor-pointer group/div">
                          <hr className="border-t border-slate-200 dark:border-slate-800 group-hover/div:border-[#0284c7] transition-colors" />
                        </div>
                      )}

                      {/* 13. TABLE */}
                      {block.type === 'table' && (
                        <div className="w-full my-2 border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Markdown Table</div>
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            rows={4}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0284c7]"
                          />
                        </div>
                      )}

                      {/* 14. COLLAPSIBLE TOGGLE / ACCORDION */}
                      {block.type === 'toggle' && (
                        <div className="w-full flex flex-col my-1">
                          <div className="flex items-center gap-1.5 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                const next = blocks.map(b => (b.id === block.id ? { ...b, collapsed: !b.collapsed } : b));
                                setBlocks(next);
                                syncBlocks(next);
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                              title={block.collapsed ? "Expand details" : "Collapse details"}
                            >
                              {block.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <input
                              type="text"
                              value={block.summary || ''}
                              onFocus={() => setActiveBlockId(block.id)}
                              onChange={e => {
                                const next = blocks.map(b => (b.id === block.id ? { ...b, summary: e.target.value } : b));
                                setBlocks(next);
                                syncBlocks(next);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleInsertBlockBelow(block.id);
                                }
                              }}
                              placeholder="Toggle title..."
                              className="w-full bg-transparent border-none outline-none font-semibold text-sm text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          {!block.collapsed && (
                            <div className="ml-6 pl-3 border-l-2 border-slate-200 dark:border-slate-800 mt-1">
                              <textarea
                                ref={el => el && textareaRefs.current.set(block.id, el)}
                                value={block.content}
                                onFocus={() => setActiveBlockId(block.id)}
                                onChange={e => handleBlockTextChange(block.id, e.target.value)}
                                onKeyDown={e => handleBlockKeyDown(e, block)}
                                rows={2}
                                placeholder="Hidden details / toggle content..."
                                className={`w-full bg-transparent border-none outline-none resize-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-hidden break-words whitespace-pre-wrap ${
                                  typography === 'serif' ? 'font-serif' : 'font-sans'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 15. IMAGE ATTACHMENT */}
                      {block.type === 'image' && (
                        <div className="w-full my-2 flex flex-col group/img">
                          {block.url ? (
                            <div className="flex flex-col items-center w-full">
                              <div className="relative group/imgpreview border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 overflow-hidden">
                                <img
                                  src={block.url}
                                  alt={block.caption || 'Image'}
                                  className="max-h-[480px] w-auto max-w-full object-contain"
                                />
                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/imgpreview:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = blocks.map(b => (b.id === block.id ? { ...b, url: '' } : b));
                                      setBlocks(next);
                                      syncBlocks(next);
                                    }}
                                    className="px-2 py-1 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-sm text-xs"
                                    title="Replace Image"
                                  >
                                    Replace
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                value={block.caption || ''}
                                onFocus={() => setActiveBlockId(block.id)}
                                onChange={e => {
                                  const next = blocks.map(b => (b.id === block.id ? { ...b, caption: e.target.value, content: e.target.value } : b));
                                  setBlocks(next);
                                  syncBlocks(next);
                                }}
                                placeholder="Add a caption..."
                                className="text-center text-xs text-slate-400 dark:text-slate-500 bg-transparent border-none outline-none mt-1.5 w-full"
                              />
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 text-xs text-slate-400 space-y-2 w-full">
                              <UploadCloud className="w-8 h-8 text-slate-400" />
                              <div className="font-medium text-slate-600 dark:text-slate-300">
                                Drag & drop an image or upload
                              </div>
                              <label className="cursor-pointer px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs hover:bg-slate-800 transition-colors">
                                <span>Choose Image File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = ev => {
                                        const dataUrl = ev.target?.result as string;
                                        if (dataUrl) {
                                          const next = blocks.map(b => (b.id === block.id ? { ...b, url: dataUrl, caption: file.name, content: file.name } : b));
                                          setBlocks(next);
                                          syncBlocks(next);
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-1">
                                <span>or URL:</span>
                                <input
                                  type="url"
                                  placeholder="https://..."
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      const target = e.target as HTMLInputElement;
                                      if (target.value.trim()) {
                                        const next = blocks.map(b => (b.id === block.id ? { ...b, url: target.value.trim(), caption: 'Image', content: 'Image' } : b));
                                        setBlocks(next);
                                        syncBlocks(next);
                                      }
                                    }
                                  }}
                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 16. WEB BOOKMARK */}
                      {block.type === 'bookmark' && (
                        <div className="w-full my-2">
                          <div className="flex flex-col border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] shadow-sm">
                            <a
                              href={block.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="group/bkm flex items-center justify-between p-3.5 hover:border-[#0284c7] transition-all duration-150"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-none bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center shrink-0">
                                  <Globe className="w-4 h-4 text-[#0284c7]" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover/bkm:text-[#0284c7] truncate">
                                    {block.content || block.url || 'Web Bookmark'}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400 truncate">
                                    {block.url}
                                  </span>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-slate-400 group-hover/bkm:text-[#0284c7] shrink-0 ml-3" />
                            </a>
                            <div className="px-3.5 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-2 text-[10px]">
                              <span className="font-mono text-slate-400 uppercase">URL:</span>
                              <input
                                type="text"
                                value={block.url || ''}
                                onFocus={() => setActiveBlockId(block.id)}
                                onChange={e => {
                                  const next = blocks.map(b => (b.id === block.id ? { ...b, url: e.target.value } : b));
                                  setBlocks(next);
                                  syncBlocks(next);
                                }}
                                placeholder="https://example.com"
                                className="w-full bg-transparent border-none outline-none font-mono text-slate-600 dark:text-slate-300"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 16b. TABLE OF CONTENTS EMBEDDABLE BLOCK */}
                      {block.type === 'toc' && (
                        <div className="w-full my-3 p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 select-none">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                              <ListOrdered className="w-3.5 h-3.5 text-[#0284c7]" />
                              Table of Contents
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {blocks.filter(b => b.type === 'h1' || b.type === 'h2' || b.type === 'h3').length} sections
                            </span>
                          </div>
                          {blocks.filter(b => b.type === 'h1' || b.type === 'h2' || b.type === 'h3').length === 0 ? (
                            <div className="text-xs text-slate-400 italic py-1">
                              Add headings (H1, H2, H3) to populate this table of contents.
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {blocks
                                .filter(b => b.type === 'h1' || b.type === 'h2' || b.type === 'h3')
                                .map(h => {
                                  const indentClass =
                                    h.type === 'h1' ? 'pl-0 font-medium' : h.type === 'h2' ? 'pl-4 text-xs' : 'pl-8 text-xs';
                                  return (
                                    <button
                                      key={h.id}
                                      type="button"
                                      onClick={() => {
                                        const el = document.getElementById(`block-${h.id}`);
                                        if (el) {
                                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          const ta = textareaRefs.current.get(h.id);
                                          if (ta) ta.focus();
                                        }
                                      }}
                                      className={`w-full text-left py-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-[#0284c7] transition-colors rounded-none flex items-center gap-1.5 text-slate-600 dark:text-slate-300 ${indentClass}`}
                                    >
                                      <span className="text-slate-400 font-mono text-[10px]">
                                        {h.type === 'h1' ? '•' : h.type === 'h2' ? '–' : '›'}
                                      </span>
                                      <span className="truncate">{h.content || 'Untitled Heading'}</span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 17. STANDARD PARAGRAPH (Plain text / regular writing) */}
                      {block.type === 'p' && (
                        <div className="relative w-full">
                          <textarea
                            ref={el => el && textareaRefs.current.set(block.id, el)}
                            value={block.content}
                            onFocus={() => setActiveBlockId(block.id)}
                            onChange={e => handleBlockTextChange(block.id, e.target.value)}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onKeyUp={e => handleBlockKeyUp(e, block)}
                            rows={1}
                            placeholder={isFocused ? "Type '/' for commands or write in plain text..." : ''}
                            className={`w-full bg-transparent border-none outline-none resize-none text-base text-slate-800 dark:text-slate-200 leading-relaxed overflow-hidden break-words whitespace-pre-wrap placeholder:text-slate-300 dark:placeholder:text-slate-700 ${
                              typography === 'serif' ? 'font-serif' : 'font-sans'
                            }`}
                          />
                          {/* Wiki link chips in paragraph */}
                          {extractWikiLinks(block.content).length > 0 && !isFocused && (
                            <div className="flex flex-wrap gap-1.5 mt-1 select-none">
                              {extractWikiLinks(block.content).map((link, i) => (
                                <button
                                  key={i}
                                  onClick={e => {
                                    e.stopPropagation();
                                    openWikiLink(link);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] text-[#0284c7] font-medium hover:underline"
                                >
                                  <span>[[{link}]]</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Seamless Bottom Click Area to add next paragraph */}
              <div
                onClick={() => {
                  const last = blocks[blocks.length - 1];
                  if (last && last.type === 'p' && last.content.trim() === '') {
                    const el = textareaRefs.current.get(last.id);
                    el?.focus();
                  } else {
                    handleInsertBlockBelow(last?.id || '', 'p');
                  }
                }}
                className="flex-1 min-h-[160px] cursor-text py-8 text-xs text-slate-400 select-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <span>Click here or press Enter to add a new line...</span>
              </div>
            </div>
          ) : (
            /* Raw Markdown Mode */
            <div className="flex-1 flex flex-col">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Raw Markdown Source</span>
                <span>Plain Text Mode</span>
              </div>
              <textarea
                ref={rawTextareaRef}
                value={content}
                onChange={e => handleRawContentChange(e.target.value)}
                placeholder="Write raw markdown here..."
                className="flex-1 w-full font-mono text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-4 outline-none resize-none leading-relaxed text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap"
                rows={24}
              />
            </div>
          )}

          {/* Slash Commands Dropdown Popover */}
          {slashMenuOpen && slashBlockId && (
            <div
              className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass w-64 max-h-72 overflow-y-auto rounded-none text-xs bottom-24 left-1/3"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Insert Element
              </div>
              <div className="py-1">
                {filteredSlashCommands.length === 0 ? (
                  <div className="px-3 py-2 text-slate-400">No matching command</div>
                ) : (
                  filteredSlashCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action(slashBlockId)}
                        onMouseEnter={() => setSlashIndex(idx)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                          idx === slashIndex
                            ? 'bg-[#0284c7] text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{cmd.title}</div>
                          <div
                            className={`text-[10px] truncate ${
                              idx === slashIndex ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
                            {cmd.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Wiki Links Autocomplete Popover */}
          {wikiMenuOpen && wikiBlockId && (
            <div
              className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-glass w-72 max-h-64 overflow-y-auto rounded-none text-xs bottom-24 left-1/3"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Link to Page</span>
                <span className="font-mono text-[9px]">[[wiki]]</span>
              </div>
              <div className="py-1">
                {matchingWikiPages.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => insertWikiLink(wikiBlockId, p.title)}
                    onMouseEnter={() => setWikiIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                      idx === wikiIndex
                        ? 'bg-[#0284c7] text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate font-medium">{p.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
                {wikiQuery.trim() &&
                  !matchingWikiPages.some(p => p.title.toLowerCase() === wikiQuery.toLowerCase()) && (
                    <button
                      onClick={() => insertWikiLink(wikiBlockId, wikiQuery.trim())}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#0284c7] hover:bg-sky-50 dark:hover:bg-sky-950/40 border-t border-slate-100 dark:border-slate-800 font-medium"
                    >
                      <span>Create "[[{wikiQuery.trim()}]]"</span>
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Drawer: Collapsible Table of Contents Outline, Backlinks & Note Connections */}
      {!isZenMode && !isSecondaryPane && isInspectorOpen && (
        <aside className="w-72 border-l border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-[#070b14]/70 backdrop-blur-md flex flex-col text-xs select-none z-10 transition-all duration-200">
          {/* Inspector Header */}
          <div className="h-10 px-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#0b1120]/50">
            <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              Document Inspector
            </span>
            <button
              onClick={toggleInspector}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-none transition-colors"
              title="Close Inspector (Ctrl+Shift+O)"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Outline Section */}
        <div className="border-b border-slate-200/80 dark:border-slate-800">
          <div
            onClick={() => setIsOutlineOpen(!isOutlineOpen)}
            className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span>Document Outline</span>
            {isOutlineOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
          {isOutlineOpen && (
            <div className="px-3 pb-3 space-y-1 max-h-56 overflow-y-auto">
              {headings.length === 0 ? (
                <div className="text-slate-400 text-[11px] italic">No headings yet. Type #, ##, ### to structure.</div>
              ) : (
                headings.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const headingBlock = blocks.find(
                        b => (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') && b.content.trim() === h.text.trim()
                      );
                      if (headingBlock) {
                        const el = document.getElementById(`block-${headingBlock.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        textareaRefs.current.get(headingBlock.id)?.focus();
                      }
                    }}
                    style={{ paddingLeft: `${(h.level - 1) * 10}px` }}
                    className="w-full text-left block text-slate-600 dark:text-slate-400 hover:text-[#0284c7] dark:hover:text-[#38bdf8] truncate py-0.5 transition-colors"
                  >
                    {h.text}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Backlinks Section */}
        <div className="border-b border-slate-200/80 dark:border-slate-800">
          <div
            onClick={() => setIsBacklinksOpen(!isBacklinksOpen)}
            className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span>Backlinks ({backlinks.length})</span>
            {isBacklinksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
          {isBacklinksOpen && (
            <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {backlinks.length === 0 ? (
                <div className="text-slate-400 text-[11px] italic">
                  No other notes link to this page yet. Mention{' '}
                  <span className="font-mono text-[#0284c7]">[[{currentPage.title}]]</span> elsewhere to link.
                </div>
              ) : (
                backlinks.map(b => (
                  <div
                    key={b.sourcePageId}
                    onClick={() => navigateToPage(b.sourcePageId)}
                    className="p-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-[#0284c7] cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span className="truncate">{b.sourcePageTitle}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </div>
                    {b.snippet && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        "...{b.snippet}..."
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Note Connections & Knowledge Graph Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            onClick={() => setIsLocalGraphOpen(!isLocalGraphOpen)}
            className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span>Note Connections</span>
            {isLocalGraphOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
          {isLocalGraphOpen && (
            <div className="px-3 pb-3 space-y-3 flex-1 overflow-y-auto">
              {/* Obsidian Local Graph Mini-Map */}
              <LocalGraphMini pageId={currentPage.id} />

              {/* Outgoing links */}
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Outgoing Links ({extractWikiLinks(content).length})
                </div>
                {extractWikiLinks(content).length === 0 ? (
                  <div className="text-slate-400 text-[11px] italic">No outgoing [[links]] yet.</div>
                ) : (
                  <div className="space-y-1">
                    {extractWikiLinks(content).map((linkText, idx) => (
                      <div
                        key={idx}
                        onClick={() => openWikiLink(linkText)}
                        className="px-2 py-1 border border-slate-200 dark:border-slate-800 hover:border-[#0284c7] cursor-pointer text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors"
                      >
                        <span className="truncate">[[{linkText}]]</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Jump to Full Knowledge Graph Button */}
              <button
                onClick={navigateToGraph}
                className="w-full mt-2 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-[#0284c7] hover:text-white dark:hover:bg-[#0284c7] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 font-medium rounded-none transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Open Knowledge Graph</span>
              </button>
            </div>
          )}
        </div>
      </aside>
      )}

      {/* Revision History Modal */}
      {currentPage && (
        <RevisionHistoryModal
          isOpen={isHistoryOpen}
          page={currentPage}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Page Cover Picker Modal */}
      {currentPage && (
        <CoverPickerModal
          isOpen={coverPickerOpen}
          onClose={() => setCoverPickerOpen(false)}
          onSelectCover={url => updatePage({ id: currentPage.id, coverImage: url })}
          onRemoveCover={() => updatePage({ id: currentPage.id, coverImage: undefined })}
          currentCover={currentPage.coverImage}
        />
      )}
    </div>
  );
};
