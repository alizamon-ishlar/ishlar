/**
 * Alizamon ishlar — Windows dasturi (Electron).
 *  • Asosiy oyna: sayt (ishlar va EDO hujjatlari)
 *  • EDO oynasi: edo.ijro.uz — foydalanuvchi o'z E-imzosi bilan kiradi; dastur har 10 daqiqada
 *    shu oynadan hujjatlarni oladi (edo-yigish.js) va saytga beradi, sayt esa bazaga yozadi.
 *  • Oyna yopilsa, dastur fonda (soat yonida) ishlashda davom etadi.
 */
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_URL = require('./package.json').appUrl;
const APP_ORIGIN = new URL(APP_URL).origin;
const EDO_URL = 'https://edo.ijro.uz/workflow/inbox/for-execution/search';
const YIGISH = fs.readFileSync(path.join(__dirname, 'edo-yigish.js'), 'utf8');
const IKON = path.join(__dirname, 'build', 'icon.png');

let win = null, edoWin = null, tray = null, chiqilsin = false;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => korsat());
app.setAppUserModelId('uz.alizamon.ishlar');

// E-IMZO dasturi kompyuterning o'zida (127.0.0.1) ishlaydi — uning sertifikatiga ishonamiz
app.on('certificate-error', (e, _wc, url, _err, _cert, cb) => {
  try { if (['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) { e.preventDefault(); return cb(true); } } catch (x) {}
  cb(false);
});

function korsat() {
  if (!win || win.isDestroyed()) return asosiyOyna(true);
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

function tashqiHavola(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'edo.ijro.uz') { edoOyna(true, url); return true; }
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'tel:' || u.protocol === 'mailto:') { shell.openExternal(url); return true; }
  } catch (e) {}
  return false;
}

function asosiyOyna(koringsin) {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 500, show: false,
    title: 'Alizamon ishlar', icon: IKON, autoHideMenuBar: true, backgroundColor: '#1f3a5f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:ishlar', contextIsolation: true, sandbox: true,
      backgroundThrottling: false            // fonda ham EDO tekshiruvi ishlasin
    }
  });
  win.setMenuBarVisibility(false);
  win.loadURL(APP_URL);
  win.once('ready-to-show', () => { if (koringsin) win.show(); });
  // Fayl (PDF) havolalari dastur ichida ochiladi; boshqa saytlar — brauzerda
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || /\.supabase\.co\//.test(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 800, icon: IKON, autoHideMenuBar: true } };
    }
    tashqiHavola(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(APP_ORIGIN)) { e.preventDefault(); tashqiHavola(url); }
  });
  win.on('close', e => {
    if (chiqilsin) return;
    e.preventDefault(); win.hide();
    if (tray && !asosiyOyna.aytildi) {
      asosiyOyna.aytildi = true;
      tray.displayBalloon && tray.displayBalloon({ title: 'Alizamon ishlar', content: 'Dastur fonda ishlashda davom etadi (soat yonidagi belgi).' });
    }
  });
}

function edoOyna(koringsin, url) {
  if (!edoWin || edoWin.isDestroyed()) {
    edoWin = new BrowserWindow({
      width: 1250, height: 860, show: false, title: 'EDO — edo.ijro.uz', icon: IKON, autoHideMenuBar: true,
      webPreferences: { partition: 'persist:edo', contextIsolation: true, backgroundThrottling: false }
    });
    edoWin.setMenuBarVisibility(false);
    edoWin.loadURL(url || EDO_URL);
    edoWin.webContents.setWindowOpenHandler(() => ({ action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } }));
    edoWin.on('close', e => { if (!chiqilsin) { e.preventDefault(); edoWin.hide(); } });
  } else if (url) {
    edoWin.loadURL(url);
  }
  if (koringsin) { edoWin.show(); edoWin.focus(); }
  return edoWin;
}

function yuklanishniKut(wc) {
  if (!wc.isLoading()) return new Promise(r => setTimeout(r, 300));
  return new Promise(r => {
    const t = setTimeout(r, 30000);
    wc.once('did-stop-loading', () => { clearTimeout(t); setTimeout(r, 2500); });
  });
}

// Sayt chaqiradi: EDO dan hujjatlarni yig'ish
ipcMain.handle('edo-yigish', async (_e, bor, maxFayl, toliqTarix) => {
  const w = edoOyna(false);
  await yuklanishniKut(w.webContents);
  const ishga = () => w.webContents.executeJavaScript(
    YIGISH + '\n;edoYigish(' + JSON.stringify(bor || []) + ',' + Number(maxFayl || 15) + ',' + (toliqTarix ? 'true' : 'false') + ');', true);
  let r = await ishga();
  if (r && r.login === false && !w.isVisible()) {           // sessiya eskirgan bo'lishi mumkin — bir marta yangilaymiz
    w.loadURL(EDO_URL); await yuklanishniKut(w.webContents);
    r = await ishga();
  }
  return r;
});
ipcMain.handle('edo-och', () => { edoOyna(true); return true; });
ipcMain.handle('versiya', () => app.getVersion());
ipcMain.handle('avtostart', (_e, yoq) => {
  if (typeof yoq === 'boolean') app.setLoginItemSettings({ openAtLogin: yoq, args: ['--yashirin'] });
  return app.getLoginItemSettings({ args: ['--yashirin'] }).openAtLogin;
});

function trayQur() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')));
  tray.setToolTip('Alizamon ishlar');
  const menyu = () => Menu.buildFromTemplate([
    { label: 'Ochish', click: korsat },
    { label: 'EDO oynasi', click: () => edoOyna(true) },
    { type: 'separator' },
    { label: 'Windows bilan birga ishga tushsin', type: 'checkbox',
      checked: app.getLoginItemSettings({ args: ['--yashirin'] }).openAtLogin,
      click: m => app.setLoginItemSettings({ openAtLogin: m.checked, args: ['--yashirin'] }) },
    { type: 'separator' },
    { label: 'Chiqish', click: () => { chiqilsin = true; app.quit(); } }
  ]);
  tray.setContextMenu(menyu());
  tray.on('click', korsat);
  tray.on('right-click', () => tray.setContextMenu(menyu()));
}

app.whenReady().then(() => {
  const yashirin = process.argv.includes('--yashirin');
  // Birinchi ishga tushishda Windows bilan birga yonishni yoqamiz (keyin trayda o'chirsa bo'ladi)
  const birinchi = path.join(app.getPath('userData'), 'birinchi.txt');
  if (!fs.existsSync(birinchi)) {
    app.setLoginItemSettings({ openAtLogin: true, args: ['--yashirin'] });
    try { fs.writeFileSync(birinchi, new Date().toISOString()); } catch (e) {}
  }
  trayQur();
  asosiyOyna(!yashirin);
  edoOyna(false);                      // EDO sessiyasi tayyor tursin
});
app.on('before-quit', () => { chiqilsin = true; });
app.on('window-all-closed', e => { if (!chiqilsin) e.preventDefault(); });
