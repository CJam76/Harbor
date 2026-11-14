import Dexie, { Table } from 'dexie';
import { Database, Page, Space, WorkspaceBackup, DatabaseColumn, DatabaseView } from '../../types';

export class HarborDexieDB extends Dexie {
  spaces!: Table<Space, string>;
  pages!: Table<Page, string>;
  databases!: Table<Database, string>;

  constructor() {
    super('harbor_workspace_db');
    this.version(1).stores({
      spaces: 'id, name, order, createdAt',
      pages: 'id, spaceId, parentId, title, isDatabaseRow, databaseId, order, updatedAt',
      databases: 'id, spaceId, title, createdAt',
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
  deletePage(id: string): Promise<void>;
  movePage(pageId: string, newParentId: string | null, targetSpaceId?: string, newOrder?: number): Promise<void>;

  getDatabases(spaceId?: string): Promise<Database[]>;
  getDatabase(id: string): Promise<Database | undefined>;
  saveDatabase(database: Database): Promise<void>;
  deleteDatabase(id: string): Promise<void>;

  exportWorkspace(): Promise<WorkspaceBackup>;
  importWorkspace(backup: WorkspaceBackup): Promise<void>;
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
    await this.db.transaction('rw', [this.db.spaces, this.db.pages, this.db.databases], async () => {
      await this.db.spaces.delete(id);
      await this.db.pages.where('spaceId').equals(id).delete();
      await this.db.databases.where('spaceId').equals(id).delete();
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

  async deletePage(id: string): Promise<void> {
    // Delete page and any sub-pages recursively
    const allPages = await this.db.pages.toArray();
    const toDelete = new Set<string>([id]);
    
    let added = true;
    while (added) {
      added = false;
      for (const p of allPages) {
        if (p.parentId && toDelete.has(p.parentId) && !toDelete.has(p.id)) {
          toDelete.add(p.id);
          added = true;
        }
      }
    }

    await this.db.pages.bulkDelete(Array.from(toDelete));
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

  async deleteDatabase(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.databases, this.db.pages], async () => {
      await this.db.databases.delete(id);
      await this.db.pages.where('databaseId').equals(id).delete();
    });
  }

  async exportWorkspace(): Promise<WorkspaceBackup> {
    const spaces = await this.getSpaces();
    const pages = await this.db.pages.toArray();
    const databases = await this.db.databases.toArray();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      spaces,
      pages,
      databases
    };
  }

  async importWorkspace(backup: WorkspaceBackup): Promise<void> {
    if (!backup.version || !Array.isArray(backup.spaces) || !Array.isArray(backup.pages)) {
      throw new Error("Invalid workspace backup file structure");
    }

    await this.db.transaction('rw', [this.db.spaces, this.db.pages, this.db.databases], async () => {
      await this.db.spaces.clear();
      await this.db.pages.clear();
      await this.db.databases.clear();

      await this.db.spaces.bulkPut(backup.spaces);
      await this.db.pages.bulkPut(backup.pages);
      if (backup.databases?.length) {
        await this.db.databases.bulkPut(backup.databases);
      }
    });
  }

  async clearWorkspace(): Promise<void> {
    await this.db.transaction('rw', [this.db.spaces, this.db.pages, this.db.databases], async () => {
      await this.db.spaces.clear();
      await this.db.pages.clear();
      await this.db.databases.clear();
    });
  }
}

export const storage: IStorageAdapter = new DexieStorageAdapter();
