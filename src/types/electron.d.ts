export interface ElectronAPI {
  isElectron: boolean;
  selectFolder: () => Promise<string | null>;
  readFolder: (folderPath: string) => Promise<{ name: string; isDirectory: boolean }[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  showItemInFolder: (fullPath: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  onQuickCapture?: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
