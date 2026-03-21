import { Session } from 'electron'
import { getSettings } from './core/settings.ts'
import path from 'path'
import { ConvertPath, GetWorkResource, RootDir } from './util/FileSysUtil.ts'
import { PLUGIN_ROOT } from './constant/PluginConstant.ts'
import fs from 'fs/promises'
import log from './util/LogUtil.ts'

export function registerCustomProtocols(targetSession: Session) {
  targetSession.protocol.handle('resource', async (request): Promise<Response> => {
    const workdir: string = getSettings().store.workdir

    // 处理 workdir 资源请求
    if (/^resource:\/\/workdir\//i.test(request.url)) {
      try {
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

        const data = await GetWorkResource(fullPath, height, width, visualHeight, visualWidth)
        return new Response(data as BodyInit)
      } catch (error) {
        log.error('scheme-resource', 'Error handling workdir request:', String(error))
        return new Response('Failed to read file', { status: 500 })
      }
    }

    // 处理插件资源请求: resource://plugin/{plugin-path}
    if (/^resource:\/\/plugin\//i.test(request.url)) {
      try {
        const url = new URL(request.url)
        // 提取插件路径 (去掉开头的 /)
        const pluginPath = decodeURIComponent(url.pathname.substring(1))
        const pluginDir = path.join(RootDir(), PLUGIN_ROOT)
        const fullPath = path.join(pluginDir, pluginPath)
        const fullPathNormalized = process.platform === 'win32' ? ConvertPath(fullPath) : fullPath

        // 读取文件内容
        const content = await fs.readFile(fullPathNormalized)
        // 根据文件扩展名设置 Content-Type
        const ext = path.extname(pluginPath).toLowerCase()
        const contentTypes: Record<string, string> = {
          '.vue': 'application/javascript',
          '.js': 'application/javascript',
          '.mjs': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.css': 'text/css',
          '.html': 'text/html'
        }
        const contentType = contentTypes[ext] || 'text/plain'

        return new Response(content, {
          headers: { 'Content-Type': contentType }
        })
      } catch (error) {
        log.error('scheme-resource', 'Error handling plugin request:', String(error))
        return new Response('Plugin file not found', { status: 404 })
      }
    }

    log.error('main/index.ts', 'Invalid protocol request format:', request.url)
    return new Response('Invalid request format', { status: 400 })
  })
}
