import Dexie, { Table } from 'dexie';
import { Database, Page, Space, WorkspaceBackup, DatabaseColumn, DatabaseView, PageRevision, Canvas } from '../../types';

export class HarborDexieDB extends Dexie {
  spaces!: Table<Space, string>;
  pages!: Table<Page, string>;
  databases!: Table<Database, string>;
  revisions!: Table<PageRevision, string>;
  canvases!: Table<Canvas, string>;

  constructor() {
    super('harbor_workspace_db');
    this.version(1).stores({
      spaces: 'id, name, order, createdAt',
      pages: 'id, spaceId, parentId, title, isDatabaseRow, databaseId, order, updatedAt',
      databases: 'id, spaceId, title, createdAt',
    });
    this.version(2).stores({
      spaces: 'id, name, order, createdAt',
      pages: 'id, spaceId, parentId, title, isDatabaseRow, databaseId, order, updatedAt, isDeleted, deletedAt',
      databases: 'id, spaceId, title, createdAt, isDeleted, deletedAt',
      revisions: 'id, pageId, timestamp',
    });
    this.version(3).stores({
      spaces: 'id, name, order, createdAt',
      pages: 'id, spaceId, parentId, title, isDatabaseRow, databaseId, order, updatedAt, isDeleted, deletedAt',
      databases: 'id, spaceId, title, createdAt, isDeleted, deletedAt',
      revisions: 'id, pageId, timestamp',
      canvases: 'id, spaceId, title, createdAt, updatedAt, isDeleted, deletedAt',
    });
  }
}

export interface IStorageAdapter {
  getSpaces(): Promise<Space[]>;
  saveSpace(space: Space): Promise<void>;
  deleteSpace(id: string): Promise<void>;
  reorderSpaces(spaceIds: string[]): Promise<void>;

  getPages(spaceId?: string): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  savePage(page: Page): Promise<void>;
  deletePage(id: string, soft?: boolean): Promise<void>;
  restorePage(id: string): Promise<void>;
  permanentlyDeletePage(id: string): Promise<void>;
  movePage(pageId: string, newParentId: string | null, targetSpaceId?: string, newOrder?: number): Promise<void>;

  getDatabases(spaceId?: string): Promise<Database[]>;
  getDatabase(id: string): Promise<Database | undefined>;
  saveDatabase(database: Database): Promise<void>;
  deleteDatabase(id: string, soft?: boolean): Promise<void>;
  restoreDatabase(id: string): Promise<void>;
  permanentlyDeleteDatabase(id: string): Promise<void>;

  // Canvas
  getCanvases(spaceId?: string): Promise<Canvas[]>;
  getCanvas(id: string): Promise<Canvas | undefined>;
  saveCanvas(canvas: Canvas): Promise<void>;
  deleteCanvas(id: string, soft?: boolean): Promise<void>;

  // Revision History
  saveRevision(revision: PageRevision): Promise<void>;
  getRevisions(pageId: string): Promise<PageRevision[]>;
  deleteRevisions(pageId: string): Promise<void>;

  // Trash
  emptyTrash(): Promise<void>;

  exportWorkspace(): Promise<WorkspaceBackup>;
  importWorkspace(backup: WorkspaceBackup, mode?: 'replace' | 'merge'): Promise<void>;
  clearWorkspace(): Promise<void>;
}

class DexieStorageAdapter implements IStorageAdapter {
  private db = new HarborDexieDB();

  async getSpaces(): Promise<Space[]> {
    return (await this.db.spaces.toArray()).sort((a, b) => a.order - b.order);
  }

  async saveSpace(space: Space): Promise<void> {
    await this.db.spaces.put(space);
  }

  async deleteSpace(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.spaces, this.db.pages, this.db.databases, this.db.canvases], async () => {
      await this.db.spaces.delete(id);
      await this.db.pages.where('spaceId').equals(id).delete();
      await this.db.databases.where('spaceId').equals(id).delete();
      await this.db.canvases.where('spaceId').equals(id).delete();
    });
  }

  async reorderSpaces(spaceIds: string[]): Promise<void> {
    await this.db.transaction('rw', this.db.spaces, async () => {
      for (let i = 0; i < spaceIds.length; i++) {
        const space = await this.db.spaces.get(spaceIds[i]);
        if (space) {
          space.order = i;
          await this.db.spaces.put(space);
        }
      }
    });
  }

  async getPages(spaceId?: string): Promise<Page[]> {
    if (spaceId) {
      return (await this.db.pages.where('spaceId').equals(spaceId).toArray())
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return (await this.db.pages.toArray()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async getPage(id: string): Promise<Page | undefined> {
    return await this.db.pages.get(id);
  }

  async savePage(page: Page): Promise<void> {
    await this.db.pages.put({
      ...page,
      updatedAt: Date.now()
    });
  }

  async deletePage(id: string, soft = true): Promise<void> {
    const allPages = await this.db.pages.toArray();
    const toAffect = new Set<string>([id]);
    
    let added = true;
    while (added) {
      added = false;
      for (const p of allPages) {
        if (p.parentId && toAffect.has(p.parentId) && !toAffect.has(p.id)) {
          toAffect.add(p.id);
          added = true;
        }
      }
    }

    if (!soft) {
      await this.db.pages.bulkDelete(Array.from(toAffect));
      for (const pId of toAffect) {
        await this.db.revisions.where('pageId').equals(pId).delete();
      }
      return;
    }

    // Soft delete
    const now = Date.now();
    for (const pId of toAffect) {
      const p = await this.db.pages.get(pId);
      if (p) {
        p.isDeleted = true;
        p.deletedAt = now;
        await this.db.pages.put(p);
      }
    }
  }

  async restorePage(id: string): Promise<void> {
    const p = await this.db.pages.get(id);
    if (p) {
      p.isDeleted = false;
      p.deletedAt = undefined;
      await this.db.pages.put(p);
    }
  }

  async permanentlyDeletePage(id: string): Promise<void> {
    await this.deletePage(id, false);
  }

  async movePage(pageId: string, newParentId: string | null, targetSpaceId?: string, newOrder?: number): Promise<void> {
    const page = await this.db.pages.get(pageId);
    if (!page) return;
    
    page.parentId = newParentId;
    if (targetSpaceId) {
      page.spaceId = targetSpaceId;
    }
    if (newOrder !== undefined) {
      page.order = newOrder;
    }
    page.updatedAt = Date.now();
    await this.db.pages.put(page);
  }

  async getDatabases(spaceId?: string): Promise<Database[]> {
    if (spaceId) {
      return await this.db.databases.where('spaceId').equals(spaceId).toArray();
    }
    return await this.db.databases.toArray();
  }

  async getDatabase(id: string): Promise<Database | undefined> {
    return await this.db.databases.get(id);
  }

  async saveDatabase(database: Database): Promise<void> {
    await this.db.databases.put({
      ...database,
      updatedAt: Date.now()
    });
  }

  async deleteDatabase(id: string, soft = true): Promise<void> {
    if (!soft) {
      await this.db.transaction('rw', [this.db.databases, this.db.pages], async () => {
        await this.db.databases.delete(id);
        await this.db.pages.where('databaseId').equals(id).delete();
      });
      return;
    }

    const db = await this.db.databases.get(id);
    if (db) {
      db.isDeleted = true;
      db.deletedAt = Date.now();
      await this.db.databases.put(db);
    }
  }

  async restoreDatabase(id: string): Promise<void> {
    const db = await this.db.databases.get(id);
    if (db) {
      db.isDeleted = false;
      db.deletedAt = undefined;
      await this.db.databases.put(db);
    }
  }

  async permanentlyDeleteDatabase(id: string): Promise<void> {
    await this.deleteDatabase(id, false);
  }

  async getCanvases(spaceId?: string): Promise<Canvas[]> {
    const list = await this.db.canvases.toArray();
    const filtered = spaceId ? list.filter(c => c.spaceId === spaceId) : list;
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getCanvas(id: string): Promise<Canvas | undefined> {
    return await this.db.canvases.get(id);
  }

  async saveCanvas(canvas: Canvas): Promise<void> {
    await this.db.canvases.put(canvas);
  }

  async deleteCanvas(id: string, soft = true): Promise<void> {
    if (soft) {
      const c = await this.db.canvases.get(id);
      if (c) {
        c.isDeleted = true;
        c.deletedAt = Date.now();
        await this.db.canvases.put(c);
      }
    } else {
      await this.db.canvases.delete(id);
    }
  }

  async saveRevision(revision: PageRevision): Promise<void> {
    await this.db.revisions.put(revision);
    const count = await this.db.revisions.where('pageId').equals(revision.pageId).count();
    if (count > 50) {
      const oldest = await this.db.revisions
        .where('pageId')
        .equals(revision.pageId)
        .sortBy('timestamp');
      const toRemove = oldest.slice(0, count - 50);
      for (const r of toRemove) {
        await this.db.revisions.delete(r.id);
      }
    }
  }

  async getRevisions(pageId: string): Promise<PageRevision[]> {
    return (await this.db.revisions.where('pageId').equals(pageId).toArray())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteRevisions(pageId: string): Promise<void> {
    await this.db.revisions.where('pageId').equals(pageId).delete();
  }

  async emptyTrash(): Promise<void> {
    const allPages = await this.db.pages.toArray();
    const deletedPages = allPages.filter(p => p.isDeleted);
    for (const p of deletedPages) {
      await this.db.pages.delete(p.id);
      await this.db.revisions.where('pageId').equals(p.id).delete();
    }
    const allDbs = await this.db.databases.toArray();
    const deletedDbs = allDbs.filter(d => d.isDeleted);
    for (const d of deletedDbs) {
      await this.db.databases.delete(d.id);
      await this.db.pages.where('databaseId').equals(d.id).delete();
    }
  }

  async exportWorkspace(): Promise<WorkspaceBackup> {
    const spaces = await this.getSpaces();
    const pages = await this.db.pages.toArray();
    const databases = await this.db.databases.toArray();
    const canvases = await this.db.canvases.toArray();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      spaces,
      pages,
      databases,
      canvases,
    };
  }

  async importWorkspace(backup: WorkspaceBackup, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
    if (!backup.version || !Array.isArray(backup.spaces) || !Array.isArray(backup.pages)) {
      throw new Error("Invalid workspace backup file structure");
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('harbor_vault_initialized', 'true');
    }

    await this.db.transaction('rw', [this.db.spaces, this.db.pages, this.db.databases, this.db.canvases], async () => {
      if (mode === 'replace') {
        await this.db.spaces.clear();
        await this.db.pages.clear();
        await this.db.databases.clear();
        await this.db.canvases.clear();
      }

      await this.db.spaces.bulkPut(backup.spaces);
      await this.db.pages.bulkPut(backup.pages);
      if (backup.databases?.length) {
        await this.db.databases.bulkPut(backup.databases);
      }
      if (backup.canvases?.length) {
        await this.db.canvases.bulkPut(backup.canvases);
      }
    });
  }

  async clearWorkspace(): Promise<void> {
    await this.db.transaction('rw', [this.db.spaces, this.db.pages, this.db.databases, this.db.canvases], async () => {
      await this.db.spaces.clear();
      await this.db.pages.clear();
      await this.db.databases.clear();
      await this.db.canvases.clear();
    });
  }
}

export const storage: IStorageAdapter = new DexieStorageAdapter();
