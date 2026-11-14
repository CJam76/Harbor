import { Page, Space } from '../types';

/**
 * Checks if running inside the Electron desktop app
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

/**
 * Checks if local disk access is supported (either via Electron IPC or Web File System Access API)
 */
export function isFileSystemAccessSupported(): boolean {
  if (isElectron()) return true;
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Prompt user to select a local folder (Native dialog in Electron, or showDirectoryPicker in web)
 */
export async function pickLocalDirectory(): Promise<any> {
  // If running in Electron desktop app
  if (isElectron() && window.electronAPI) {
    const folderPath = await window.electronAPI.selectFolder();
    return folderPath;
  }

  // Fallback to browser File System Access API
  if (isFileSystemAccessSupported()) {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      return handle;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }

  return null;
}

/**
 * Export all pages in a space directly to markdown files in a local directory
 */
export async function syncSpaceToLocalFolder(
  dirTarget: any,
  spaceName: string,
  pages: Page[]
): Promise<{ written: number; errors: string[] }> {
  let written = 0;
  const errors: string[] = [];
  const safeSpaceName = spaceName.replace(/[<>:"/\\|?*]+/g, '-').trim() || 'Workspace';

  // Format page content with frontmatter
  const buildPageFile = (page: Page) => {
    const frontmatter = [
      '---',
      `title: "${page.title.replace(/"/g, '\\"')}"`,
      `date: ${new Date(page.updatedAt).toISOString()}`,
      page.tags && page.tags.length > 0 ? `tags: [${page.tags.map(t => `"${t}"`).join(', ')}]` : null,
      page.parentId ? `parent: "${page.parentId}"` : null,
      '---',
      '',
      ''
    ].filter(Boolean).join('\n');
    return frontmatter + page.content;
  };

  // Branch 1: Electron Native Filesystem
  if (isElectron() && window.electronAPI && typeof dirTarget === 'string') {
    for (const page of pages) {
      try {
        const safeTitle = (page.title || 'Untitled').replace(/[<>:"/\\|?*]+/g, '-').trim();
        const fullPath = `${dirTarget}/${safeSpaceName}/${safeTitle}.md`;
        const content = buildPageFile(page);
        await window.electronAPI.writeFile(fullPath, content);
        written++;
      } catch (err: any) {
        errors.push(`Failed to write "${page.title}": ${err.message}`);
      }
    }
    return { written, errors };
  }

  // Branch 2: Web FileSystemDirectoryHandle
  let targetDir = dirTarget;
  try {
    targetDir = await dirTarget.getDirectoryHandle(safeSpaceName, { create: true });
  } catch (err) {
    targetDir = dirTarget;
  }

  for (const page of pages) {
    try {
      const safeTitle = (page.title || 'Untitled').replace(/[<>:"/\\|?*]+/g, '-').trim();
      const fileName = `${safeTitle}.md`;

      const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      const fullContent = buildPageFile(page);
      await writable.write(fullContent);
      await writable.close();
      written++;
    } catch (err: any) {
      errors.push(`Failed to write "${page.title}": ${err.message}`);
    }
  }

  return { written, errors };
}

/**
 * Read markdown files from a local directory and import them into a space
 */
export async function importPagesFromLocalFolder(
  dirTarget: any,
  targetSpaceId: string,
  savePageFn: (page: Page) => Promise<void>
): Promise<{ imported: number; fileNames: string[] }> {
  let imported = 0;
  const fileNames: string[] = [];

  const parseMarkdownFile = (fileName: string, text: string, lastModified: number): Page => {
    let cleanContent = text;
    let pageTitle = fileName.replace(/\.md$/i, '');
    let tags: string[] = [];

    if (text.startsWith('---')) {
      const secondDash = text.indexOf('\n---', 3);
      if (secondDash !== -1) {
        const fmMatter = text.substring(3, secondDash);
        cleanContent = text.substring(secondDash + 4).trim();

        const titleMatch = fmMatter.match(/title:\s*["']?([^"'\n]+)["']?/);
        if (titleMatch) pageTitle = titleMatch[1];

        const tagsMatch = fmMatter.match(/tags:\s*\[(.*?)\]/);
        if (tagsMatch) {
          tags = tagsMatch[1].split(',').map((s: string) => s.trim().replace(/["']/g, '')).filter(Boolean);
        }
      }
    }

    return {
      id: `page-import-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      spaceId: targetSpaceId,
      parentId: null,
      title: pageTitle,
      icon: 'FileText',
      content: cleanContent || `# ${pageTitle}\n\n`,
      tags,
      order: Date.now(),
      createdAt: lastModified || Date.now(),
      updatedAt: lastModified || Date.now(),
    };
  };

  // Branch 1: Electron Native Filesystem
  if (isElectron() && window.electronAPI && typeof dirTarget === 'string') {
    const entries = await window.electronAPI.readFolder(dirTarget);
    for (const entry of entries) {
      if (!entry.isDirectory && entry.name.toLowerCase().endsWith('.md')) {
        try {
          const filePath = `${dirTarget}/${entry.name}`;
          const text = await window.electronAPI.readFile(filePath);
          const newPage = parseMarkdownFile(entry.name, text, Date.now());
          await savePageFn(newPage);
          imported++;
          fileNames.push(entry.name);
        } catch (err) {
          console.error(`Error importing file ${entry.name}:`, err);
        }
      }
    }
    return { imported, fileNames };
  }

  // Branch 2: Web FileSystemDirectoryHandle
  for await (const [name, handle] of (dirTarget as any).entries()) {
    if (handle.kind === 'file' && name.toLowerCase().endsWith('.md')) {
      try {
        const file = await handle.getFile();
        const text = await file.text();
        const newPage = parseMarkdownFile(name, text, file.lastModified || Date.now());
        await savePageFn(newPage);
        imported++;
        fileNames.push(name);
      } catch (err) {
        console.error(`Error importing file ${name}:`, err);
      }
    }
  }

  return { imported, fileNames };
}
