import Electron from 'electron'
import path from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { InitializeDB } from './database/InitializeDatabase.ts'
import MainProcessApi from './base/MainProcessApi.js'
import LogUtil from './util/LogUtil.ts'
import { ConvertPath, GetWorksResource } from './util/FileSysUtil.ts'
import { GlobalVar, GlobalVars } from './base/GlobalVar.ts'
import StringUtil from './util/StringUtil.js'
import GotoPageConfig from './model/util/GotoPageConfig.js'
import { PageEnum } from './constant/PageEnum.js'
import { Initialize } from './base/Initialize.js'
import { SendConfirmToWindow } from './util/MainWindowUtil.js'

function createWindow(): Electron.BrowserWindow {
  // Create the browser window.
  const mainWindow = new Electron.BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // 检查有没有设置工作目录，没有设置的话发送提醒
    const settings = GlobalVar.get(GlobalVars.SETTINGS).store
    if (StringUtil.isBlank(settings.workdir)) {
      const gotoPageConfig: GotoPageConfig = {
        page: PageEnum.Settings,
        title: '请设置工作目录',
        content: 'LibrarySquirrel需要工作目录才能正常使用',
        options: {
          confirmButtonText: '去设置',
          cancelButtonText: '取消',
          type: 'warning',
          showClose: false
        }
      }
      mainWindow.webContents.send('goto-page', gotoPageConfig)
    }
  })

  mainWindow.on('close', async (event) => {
    // 阻止默认关闭行为
    event.preventDefault()

    const taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
    if (!taskQueue.isIdle()) {
      await SendConfirmToWindow({
        title: '有任务正在进行中',
        msg: '是否关闭LibrarySquirrel？',
        confirmButtonText: '关闭',
        cancelButtonText: '取消',
        type: 'warning'
      })
    }

    // 关闭任务队列
    await taskQueue.shutdown()
    // 强制销毁窗口
    mainWindow.destroy()
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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // 创建右键菜单
  const contextMenu = Electron.Menu.buildFromTemplate([
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
Electron.protocol.registerSchemesAsPrivileged([
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
Electron.app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  Electron.app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  Electron.ipcMain.on('ping', () => console.log('pong'))

  const mainWindow = createWindow()
  GlobalVar.create(GlobalVars.MAIN_WINDOW, mainWindow)

  // 配置日志
  LogUtil.initializeLogSetting()

  // 如何响应前面的resource自定义协议的请求
  Electron.protocol.handle('resource', async (request): Promise<Response> => {
    const workdir: string = GlobalVar.get(GlobalVars.SETTINGS).get('workdir')

    // 使用正则表达式测试URL是否符合预期格式
    if (!/^resource:\/\/workdir\//i.test(request.url)) {
      LogUtil.error('main/index.ts', 'Invalid protocol request format:', request.url)
      return new Response('Invalid request format', { status: 400 }) // 返回错误状态码
    }

    try {
      // 确保格式正确后，继续处理请求
      const url = new URL(request.url)
      const decodedUrl = decodeURIComponent(path.join(workdir, url.pathname))
      const fullPath = process.platform === 'win32' ? ConvertPath(decodedUrl) : decodedUrl
      const heightStr = url.searchParams.get('height')
      const height = heightStr === null ? undefined : parseInt(heightStr)
      const widthStr = url.searchParams.get('width')
      const width = widthStr === null ? undefined : parseInt(widthStr)
      const visualHeightStr = url.searchParams.get('visualHeight')
      const visualHeight = visualHeightStr === null ? undefined : parseInt(visualHeightStr)
      const visualWidthStr = url.searchParams.get('visualWidth')
      const visualWidth = visualWidthStr === null ? undefined : parseInt(visualWidthStr)

      const data = await GetWorksResource(fullPath, height, width, visualHeight, visualWidth) // 异步读取文件
      return new Response(data) // 返回文件
    } catch (error) {
      LogUtil.error('scheme-resource', 'Error handling protocol request:', String(error))
      return new Response('Failed to read file', { status: 500 }) // 文件读取失败或其他错误时的响应
    }
  })
  // 初始化APP_CONFIG
  GlobalVar.create(GlobalVars.APP_CONFIG)
  // 初始化设置
  GlobalVar.create(GlobalVars.SETTINGS)

  // 初始化数据库
  InitializeDB().then(() => {
    Initialize()
    // 创建服务层的ipc通信
    MainProcessApi.exposeService()
  })

  // 初始化任务队列
  GlobalVar.create(GlobalVars.TASK_QUEUE)

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
