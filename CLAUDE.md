# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LibrarySquirrel 是一个用于在个人电脑中创建并维护基于标签检索的资源库的 Electron 桌面应用程序。主要功能包括从远程站点下载资源到本地资源库，并提供标签式的检索服务。

**技术栈**: Electron 39, Vue 3, TypeScript, better-sqlite3

## Development Commands

```bash
# Development
yarn dev              # Start dev server (Chinese codepage: chcp 65001)
yarn watch            # Watch mode for development

# Building
yarn build            # Type-check + production build
yarn typecheck        # Check types for both node and web
yarn typecheck:node   # Type-check main process only
yarn typecheck:web    # Type-check renderer only

# Code Quality
yarn lint             # ESLint with auto-fix
yarn format           # Prettier formatting

# Distribution
yarn build:win         # Build Windows installer
yarn build:mac        # Build macOS DMG
yarn build:linux      # Build Linux AppImage/deb
yarn build:unpack     # Build without packaging
yarn start            # Preview production build
```

**Node.js Requirement**: 22.18.0

## AI 开发辅助文档

项目维护了一套快速参考文档，位于 `ai-assistant/` 目录，通过`ai-assistant/README.md`文件了解文档结构

**提示**：遇到架构、数据库、IPC通信等问题时，可参考上述文档获取详细上下文。

## Architecture

### Directory Structure

```
src/
├── main/              # Electron main process (Node.js)
│   ├── base/          # Base classes (BaseDao, BaseService, BasePlugin)
│   ├── constant/      # Constants and enums
│   ├── core/          # Core services (MainProcessApi, Initialize)
│   ├── dao/           # Data Access Objects
│   ├── database/      # Database initialization
│   ├── model/         # Domain models and entities
│   ├── plugin/        # Plugin system
│   ├── service/       # Business logic services
│   ├── resources/     # YAML config files
│   └── util/          # Utilities
├── preload/           # Preload script (IPC bridge)
└── renderer/          # Vue renderer process
    └── src/
        ├── apis/      # API wrappers for IPC
        ├── components/# Vue components
        ├── store/     # Pinia stores
        └── utils/     # Renderer utilities
```

### Main Process (`src/main/`)

- **Entry**: `src/main/index.ts` - BrowserWindow creation, IPC handler registration, custom `resource://` protocol
- **Core**: `MainProcessApi.ts` - Central IPC handler dispatcher, registers all service methods as `ipcRenderer.invoke('service-method', args)`
- **Custom Protocol**: `resource://` scheme serves local files with image resizing support via sharp

### Renderer Process (`src/renderer/`)

- **Entry**: `src/renderer/src/main.ts` - Vue 3 app initialization, Pinia store setup
- **IPC Communication**: Via preload script exposing `window.electron` and `window.api`
- **State Management**: Pinia stores (UseTaskStore, UsePageStatesStore, UseNotificationStore)

## IPC Communication Pattern

**Renderer → Main**: `ipcRenderer.invoke('service-method', args)` via preload bridge
**Main → Renderer**: `ipcMain.send/ipcMain.on` for push notifications (task progress, etc.)

**统一响应格式**: `ApiUtil.response(data)` / `ApiUtil.error(message)` in main; all responses go through `returnError()` wrapper.

### Service Method Naming Convention

- `Electron.ipcMain.handle('serviceName-methodName', ...)` in MainProcessApi.ts
- `window.api.serviceNameMethodName(...)` in preload/index.ts

## Database Architecture

- **Client**: Custom `DatabaseClient` with connection pooling via `ConnectionPool`
- **Pattern**: DAO layer with `BaseDao` for CRUD operations
- **Tables**: Defined in YAML at `src/main/resources/database/createDataTables.yml`
- **Transactions**: Uses **SAVEPOINT** (not SQLite BEGIN/COMMIT), nested transaction support
- **Key Tables**: work, resource, local_tag, site_tag, local_author, site_author, task, plugin

## Plugin System

- **Loader**: `PluginLoader.ts` - loads plugins from `plugin/package/`
- **Factory**: `PluginFactory.ts` - creates plugin instances via `create(pluginLoadDTO, pluginTool?)`
- **Execution**: `TaskHandler.ts` in plugin module handles plugin task execution
- Each plugin is a separate package with author, name, and version metadata
- **BasePlugin**: Minimal interface with only `pluginId: number`

## Key Conventions

- **File Naming**: PascalCase for components/classes, camelCase for functions/variables
- **Vue Components**: Composition API with `<script setup lang="ts">`, props use `Props` suffix
- **TypeScript**: Path alias `@renderer/*` for renderer imports (configured in tsconfig.web.json)
- **ESLint**: Extends `@electron-toolkit/eslint-config`, Vue `require-default-prop` is off
- **Date Handling**: Unix timestamp (milliseconds) for all datetime fields

## TypeScript Configuration

- `tsconfig.node.json` - Main process (moduleResolution: node16)
- `tsconfig.web.json` - Renderer with `@renderer/*` path alias
- Building requires Node.js 22.18.0

## Common Patterns

### Adding a New Service

1. Create service in `src/main/service/`
2. Add IPC handlers in `MainProcessApi.ts` using pattern:
   ```typescript
   Electron.ipcMain.handle('serviceName-method', async (_event, args) => {
     const service = new ServiceName()
     try { return ApiUtil.response(await service.method(args)) }
     catch (error) { return returnError(error) }
   })
   ```
3. Add wrapper in `src/preload/index.ts`: `serviceNameMethod: (args) => Electron.ipcRenderer.invoke('serviceName-method', args)`

### Database Transaction

```typescript
await db.transaction(async (tx) => {
  await tx.run('INSERT INTO ...')
  await tx.run('UPDATE ...')
}, 'operation-description')
```

Uses SAVEPOINT internally for nested transactions.
