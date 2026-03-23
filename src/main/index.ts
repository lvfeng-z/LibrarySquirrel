import { app, BrowserWindow, Menu, protocol, session, shell } from 'electron'
import path from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerMainIpcHandlers } from './core/MainProcessApi.ts'
import { initializeLogSetting } from './util/LogUtil.ts'
import { initializeByConfig } from './core/InitializeByConfig.ts'
import { SendConfirmToWindow } from './util/MainWindowUtil.js'
import iniConfig from './resources/config/iniConfig.yml?asset'
import { createTaskQueue, getTaskQueue } from './core/taskQueue.ts'
import { createSettings, getSettings } from './core/settings.ts'
import { createIniConfig } from './core/iniConfig.ts'
import { createPluginTaskUrlListenerManager } from './core/pluginTaskUrlListener.ts'
import { setMainWindow } from './core/mainWindow.ts'
import { createPluginManager, getPluginManager } from './core/pluginManager.ts'
import { createSiteBrowserManager } from './core/siteBrowserManager.ts'
import { setupCSP } from './setupCsp.ts'
import { registerCustomProtocols } from './protocol.ts'
import { createDbWorker } from './core/dbWorker.ts'
import log from 'electron-log'

function createWindow(): BrowserWindow {
  // 定义一个唯一的 partition 名称
  const mainWindowPartition = 'main-window-strict-csp'

  // 获取该 partition 对应的 Session 实例
  // 如果该 partition 第一次被使用，Electron 会自动创建它
  const mainSession = session.fromPartition(mainWindowPartition)

  // 在这个独立的 Session 上设置 CSP
  const allowUnsafeEval = getSettings().store.pluginSettings?.allowUnsafeEval ?? false
  setupCSP(mainSession, allowUnsafeEval)
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      partition: mainWindowPartition,
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  // 如何响应前面的resource自定义协议的请求
  registerCustomProtocols(mainSession)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', async (event) => {
    // 阻止默认关闭行为
    event.preventDefault()

    try {
      const taskQueue = getTaskQueue()
      if (!taskQueue.isIdle()) {
        await SendConfirmToWindow({
          msg: '有任务正在进行中',
          title: '是否关闭LibrarySquirrel？',
          confirmButtonText: '关闭',
          cancelButtonText: '取消',
          type: 'warning'
        })
      }
      // 关闭任务队列
      await taskQueue.shutdown()
    } finally {
      // 强制销毁窗口
      mainWindow.destroy()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // 创建右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '复制',
      role: 'copy'
    },
    {
      label: '粘贴',
      role: 'paste'
    },
    {
      label: '剪切',
      role: 'cut'
    },
    {
      type: 'separator' // 分隔线
    },
    {
      label: '查看源代码',
      click: () => {
        mainWindow.webContents.openDevTools() // 打开开发者工具
      }
    }
  ])

  // 监听右键点击事件并显示菜单
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mainWindow.webContents.on('context-menu', (_event, _params) => {
    contextMenu.popup() // 弹出右键菜单
  })

  return mainWindow
}

// 在ready之前注册一个自定义协议，用来加载本地文件
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'resource',
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
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  // 为默认会话注册
  registerCustomProtocols(session.defaultSession)

  // 初始化设置
  createSettings()

  // 创建主窗口
  const mainWindow = createWindow()
  setMainWindow(mainWindow)

  // 配置日志
  initializeLogSetting()

  // 初始化INI_CONFIG
  createIniConfig(iniConfig)
  // 初始化设置
  createSettings()

  // 初始化数据库
  createDbWorker()
    .then(async () => {
      // 创建服务层的ipc通信
      registerMainIpcHandlers()
      // 初始化任务队列
      createTaskQueue()
      // 初始化插件任务URL监听器管理器
      createPluginTaskUrlListenerManager()
      // 初始化站点浏览器管理器
      createSiteBrowserManager()
      // 初始化插件管理器
      createPluginManager()
      // 初始化站点和内置插件
      await initializeByConfig()
      // 激活启动时加载的插件
      await getPluginManager().activateStartupPlugins()
    })
    .catch((error) => {
      log.error(error)
      throw error
    })

  app.on('activate', function () {
    // On macOS, it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
