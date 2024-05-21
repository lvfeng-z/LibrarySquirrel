import Electron from 'electron'
import Path from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import InitializeDatabase from './database/initialize/InitializeDatabase.ts'
import ServiceExposer from './service/ServiceExposer.ts'
import logUtil from './util/LogUtil.ts'
import fs from 'fs/promises'
import FileSysUtil from './util/FileSysUtil.ts'
import SettingsUtil from './util/SettingsUtil.ts'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new Electron.BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: Path.join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    Electron.shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(Path.join(__dirname, '../renderer/index.html'))
  }
}

// 初始化设置配置
SettingsUtil.initializeSettingsConfig()

// 在ready之前注册一个自定义协议，用来加载本地文件
Electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: 'workdir-resource',
    privileges: {
      secure: true, // 设定此协议为安全协议,在 HTTPS 页面中通过此协议加载的资源不会引发混合内容警告
      supportFetchAPI: true, // 允许此协议通过 Fetch API 被访问
      standard: true, // 指示此协议应遵循Web标准，像HTTP/HTTPS一样工作
      bypassCSP: true, // 允许此协议加载的资源绕过Content Security Policy (CSP) 的限制
      stream: true // 允许通过此协议处理流式数据，应对大文件传输
    }
  }
])

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
Electron.app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  Electron.app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 如何响应前面的自定义协议的请求
  Electron.protocol.handle('workdir-resource', async (request) => {
    const workdir = global.settings.get('workdir') as string
    const decodedUrl = decodeURIComponent(
      Path.join(workdir, request.url.replace(new RegExp(`^workdir-resource://workdir/`, 'i'), ''))
    )

    const fullPath = process.platform === 'win32' ? FileSysUtil.convertPath(decodedUrl) : decodedUrl

    const data = await fs.readFile(fullPath) // 异步读取文件
    return new Response(data) // 返回文件
  })

  // 配置日志设置
  logUtil.initializeLogSetting()

  // IPC test
  Electron.ipcMain.on('ping', () => console.log('pong'))

  // 初始化数据库
  InitializeDatabase.InitializeDB().then(() => {
    ServiceExposer.exposeService()
  })

  createWindow()

  Electron.app.on('activate', function () {
    // On macOS, it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (Electron.BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
Electron.app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    Electron.app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
