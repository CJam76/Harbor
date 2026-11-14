import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),
  readFolder: (folderPath: string): Promise<{ name: string; isDirectory: boolean }[]> =>
    ipcRenderer.invoke('fs:readFolder', folderPath),
  readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  showItemInFolder: (fullPath: string): Promise<void> =>
    ipcRenderer.invoke('shell:showItemInFolder', fullPath),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  onQuickCapture: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('quick-capture:open', handler);
    return () => {
      ipcRenderer.removeListener('quick-capture:open', handler);
    };
  },
});
