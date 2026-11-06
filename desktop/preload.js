// Saytga faqat kerakli funksiyalar ochiladi (va faqat dasturning o'z sahifasida)
const { contextBridge, ipcRenderer } = require('electron');

if (/^https:\/\/[^/]+\.github\.io$/.test(location.origin) || location.protocol === 'file:' || location.hostname === '127.0.0.1') {
  contextBridge.exposeInMainWorld('desktop', {
    edoYigish: (bor, maxFayl, toliqTarix) => ipcRenderer.invoke('edo-yigish', bor, maxFayl, toliqTarix),
    edoOch: () => ipcRenderer.invoke('edo-och'),
    versiya: () => ipcRenderer.invoke('versiya'),
    avtostart: yoq => ipcRenderer.invoke('avtostart', yoq)
  });
}
