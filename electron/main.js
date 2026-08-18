const { app, BrowserWindow, Menu, dialog, shell } = require('electron')
const path = require('path')

const APP_VERSION = '1.0.0'
const APP_NAME = 'Swasthya-Clinic'
const PROJECT_URL = 'https://github.com/sagarxettri000/clinic'
const PROD_URL = 'https://clinic-oalxk3jsa-lakd.vercel.app'

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'normal',
  })

  win.loadURL(PROD_URL)
}

function showAbout() {
  dialog.showMessageBox({
    title: `About ${APP_NAME}`,
    type: 'info',
    message: `${APP_NAME} v${APP_VERSION}`,
    detail: [
      'Swasthya-Clinic',
      'Manage Health, Care Better',
      '',
      'Source code:',
      PROJECT_URL,
      '',
      'Powered by',
      '- Next.js 16 · React 19',
      '- PostgreSQL (Supabase)',
      '- Prisma ORM',
      '- Tailwind CSS',
    ].join('\n'),
    buttons: ['OK', 'View Project'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 1) {
      shell.openExternal(PROJECT_URL)
    }
  })
}

const template = [
  {
    label: 'Swasthya-Clinic',
    submenu: [
      { label: 'About Swasthya-Clinic', click: showAbout },
      { type: 'separator' },
      { role: 'reload', accelerator: 'CmdOrCtrl+R' },
      { role: 'forceReload' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'toggleDevTools' },
      { role: 'togglefullscreen' },
    ],
  },
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
