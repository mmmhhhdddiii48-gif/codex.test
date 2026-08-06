'use strict';
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;
const ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
const REG_PATH = 'HKCU\\Software\\NukhbaERP\\DistributionTrialV1';
const SECRET_PARTS = ['Nkh', 'ba26', 'Dist', 'Trial', 'PC'];
let trialStatus = null;
let mainWindow = null;

function secret() { return SECRET_PARTS.join('|'); }
function deviceKey() {
  return crypto.createHash('sha256').update([os.hostname(), os.userInfo().username, process.arch, process.platform].join('|')).digest('hex');
}
function macFor(start, last) {
  return crypto.createHmac('sha256', secret()).update(`${start}|${last}|${deviceKey()}`).digest('hex');
}
function stateFile() { return path.join(app.getPath('userData'), '.nukhba-distribution-trial-v1.dat'); }
function validState(s) {
  return s && Number.isFinite(Number(s.start)) && Number.isFinite(Number(s.last)) && s.mac === macFor(Number(s.start), Number(s.last));
}
function readFileState() {
  try { const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8')); return validState(s) ? s : null; } catch { return null; }
}
function writeFileState(s) {
  try { fs.mkdirSync(path.dirname(stateFile()), { recursive: true }); fs.writeFileSync(stateFile(), JSON.stringify(s), { encoding: 'utf8', mode: 0o600 }); } catch {}
}
function readRegistryState() {
  if (process.platform !== 'win32') return null;
  try {
    const out = execFileSync('reg.exe', ['query', REG_PATH], { encoding: 'utf8', windowsHide: true });
    const pick = (name) => { const m = out.match(new RegExp(`${name}\\s+REG_SZ\\s+([^\\r\\n]+)`, 'i')); return m ? m[1].trim() : ''; };
    const s = { start: Number(pick('TrialStart')), last: Number(pick('TrialLast')), mac: pick('TrialMac') };
    return validState(s) ? s : null;
  } catch { return null; }
}
function writeRegistryState(s) {
  if (process.platform !== 'win32') return;
  try {
    execFileSync('reg.exe', ['add', REG_PATH, '/v', 'TrialStart', '/t', 'REG_SZ', '/d', String(s.start), '/f'], { windowsHide: true });
    execFileSync('reg.exe', ['add', REG_PATH, '/v', 'TrialLast', '/t', 'REG_SZ', '/d', String(s.last), '/f'], { windowsHide: true });
    execFileSync('reg.exe', ['add', REG_PATH, '/v', 'TrialMac', '/t', 'REG_SZ', '/d', s.mac, '/f'], { windowsHide: true });
  } catch {}
}
function saveState(start, last) {
  const s = { start, last, mac: macFor(start, last) };
  writeFileState(s); writeRegistryState(s); return s;
}
function evaluateTrial(updateLast = true) {
  const now = Date.now();
  const a = readFileState();
  const b = readRegistryState();
  let tampered = false;
  let start;
  let last;
  if (!a && !b) {
    start = now; last = now;
  } else {
    const candidates = [a, b].filter(Boolean);
    start = Math.min(...candidates.map(s => Number(s.start)));
    last = Math.max(...candidates.map(s => Number(s.last)));
    if ((a && !b) || (!a && b)) tampered = false;
    if (a && b && (Math.abs(a.start - b.start) > ROLLBACK_TOLERANCE_MS || Math.abs(a.last - b.last) > ROLLBACK_TOLERANCE_MS)) tampered = true;
    if (now + ROLLBACK_TOLERANCE_MS < last) tampered = true;
  }
  const expiresAt = start + TRIAL_MS;
  const expired = tampered || now >= expiresAt;
  const safeLast = Math.max(last || now, now);
  if (updateLast) saveState(start, safeLast);
  return {
    start,
    now,
    expiresAt,
    remainingMs: Math.max(0, expiresAt - now),
    expired,
    tampered,
    days: 3,
    edition: 'تجريبية محمية'
  };
}
function createWindow() {
  trialStatus = evaluateTrial(true);
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#f4f2ed',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => { mainWindow.maximize(); mainWindow.show(); });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
}

ipcMain.handle('trial:get', () => { trialStatus = evaluateTrial(true); return trialStatus; });
ipcMain.handle('app:close', () => app.quit());
ipcMain.handle('app:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.handle('app:maximize', () => { if (!mainWindow) return; mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { try { evaluateTrial(true); } catch {} });
