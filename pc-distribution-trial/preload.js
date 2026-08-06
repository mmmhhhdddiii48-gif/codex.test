'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nukhbaDesktop', {
  getTrial: () => ipcRenderer.invoke('trial:get'),
  close: () => ipcRenderer.invoke('app:close'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize')
});
