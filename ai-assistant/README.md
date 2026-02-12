# AI Assistant Documentation for LibrarySquirrel

## 文档概述

本目录包含为AI助手（如Claude Code）准备的LibrarySquirrel项目文档，旨在帮助AI快速理解项目架构、业务逻辑和开发模式，从而更高效地进行代码分析、问题诊断和开发任务。

## 文档结构

### 1. [business-logic.md](./business-logic.md) - 完整业务逻辑文档
- **用途**：全面理解项目的业务模型、数据流和架构
- **适合场景**：需要深度理解项目整体架构时
- **包含内容**：
  - 项目概述和核心价值
  - 详细业务概念解释
  - 数据模型关系图
  - 完整业务流程
  - 架构组件详细说明
  - 典型业务用例

### 2. [architecture-quick-reference.md](./architecture-quick-reference.md) - 架构速查
- **用途**：快速查找核心概念和技术要点
- **适合场景**：开发任务中需要快速参考时
- **包含内容**：
  - 核心业务概念速查表
  - 关键业务逻辑总结
  - 技术架构要点
  - 开发模式和常见场景

### 3. [glossary.md](./glossary.md) - 术语表
- **用途**：统一理解项目中的领域特定术语
- **适合场景**：遇到不熟悉的术语时参考
- **包含内容**：
  - 核心实体术语定义
  - 作者/标签系统术语
  - 插件系统术语
  - 架构和开发约定术语

### 4. [development-scenarios.md](./development-scenarios.md) - 开发示例场景
- **用途**：通过具体示例理解开发模式和最佳实践
- **适合场景**：需要实施具体开发任务时
- **包含内容**：
  - 添加新站点支持（Twitter示例）
  - 添加新功能（收藏功能示例）
  - 修复典型问题（作者关联问题）
  - 性能优化实践
  - 插件接口扩展

### 5. [common-pitfalls.md](./common-pitfalls.md) - 常见误区与陷阱
- **用途**：了解项目中容易犯的错误和需要特别注意的问题
- **适合场景**：编写IPC通信代码、调试数据传输问题时参考
- **包含内容**：
  - IPC数据传输规则和常见错误
  - 响应式变量处理注意事项
  - 其他开发中容易忽略的陷阱

### 6. [code-rules.md](./code-rules.md) - 代码规则与约定
- **用途**：查看项目的代码编写规范、命名约定和开发规范
- **适合场景**：编写新代码、重构或评审代码时参考
- **包含内容**：
  - 文件命名规范和目录结构约定
  - TypeScript、Vue组件和命名约定
  - IPC通信、数据库操作和插件开发规范
  - 代码质量工具和日期处理规则
  - 新增功能开发流程和常见注意事项

## 如何使用这些文档

### 对于新任务分析
1. **首先阅读**：`architecture-quick-reference.md` - 获取快速概览
2. **深入理解**：`business-logic.md` - 理解完整业务模型
3. **术语澄清**：`glossary.md` - 统一术语理解
4. **参考实现**：`development-scenarios.md` - 查看类似任务实现

### 对于具体问题诊断
1. **定位相关概念**：使用`glossary.md`确定涉及的术语
2. **理解业务逻辑**：参考`business-logic.md`相关章节
3. **查看类似案例**：`development-scenarios.md`中的问题修复示例
4. **检查常见陷阱**：参考`common-pitfalls.md`避免重复已知错误

### 对于新功能开发
1. **确定开发模式**：`development-scenarios.md`中的模式总结
2. **参考完整示例**：查看收藏功能添加的完整流程
3. **检查架构约束**：`architecture-quick-reference.md`中的技术要点
4. **遵循代码规范**：`code-rules.md`中的编码规则和约定
5. **避免常见错误**：参考`common-pitfalls.md`中的注意事项

## 关键架构要点（快速记忆）

### 双架构统一检索
- **本地作者** ↔ **站点作者** = 跨站点作者统一检索
- **本地标签** ↔ **站点标签** = 跨站点标签统一检索
- **业务价值**：一次检索，全站结果

### 插件化架构
- 插件在`plugin/package/`目录
- 每个插件是独立包
- 预置：本地导入 + pixiv插件

### IPC通信模式
- 主进程：`Electron.ipcMain.handle('service-method', args)`
- 预加载：`window.api.serviceNameMethodName(args)`
- 响应格式：统一使用`ApiUtil.response()`/`.error()`

### 数据库设计
- DAO模式 + BaseDao基类
- SAVEPOINT事务（支持嵌套）
- 表结构在YAML配置中定义

## 项目文件定位指南

| 任务类型 | 主要文件位置 |
|---------|-------------|
| 业务逻辑 | `src/main/service/` |
| 数据模型 | `src/main/model/` |
| 数据库操作 | `src/main/dao/` |
| 插件开发 | `src/main/plugin/` |
| 前端组件 | `src/renderer/src/components/` |
| 状态管理 | `src/renderer/src/store/` |
| IPC注册 | `src/main/core/MainProcessApi.ts` |
| 任务队列 | `src/main/core/taskQueue.ts` |

## 常见开发任务参考

### 添加新Service
1. `src/main/service/`创建Service类
2. `MainProcessApi.ts`注册IPC
3. `preload/index.ts`添加API包装
4. 前端通过`window.api`调用

### 数据库事务
```typescript
await db.transaction(async (tx) => {
  // 多个操作
}, '操作描述')
```

### 响应处理
```typescript
const response = await window.api.someMethod(args)
if (ApiUtil.check(response)) {
  const data = ApiUtil.data(response)
  // 处理成功
} else {
  const error = ApiUtil.error(response)
  // 处理错误
}
```

## 更新和维护

当项目架构或业务逻辑发生变化时，应相应更新这些文档以保持同步。特别是：
- 添加新的核心业务概念时更新`glossary.md`
- 架构重大变更时更新`architecture-quick-reference.md`
- 新增典型开发模式时更新`development-scenarios.md`
- 代码规范变更时更新`code-rules.md`
- 发现新的常见错误时更新`common-pitfalls.md`

## 相关项目文档

- [../CLAUDE.md](../CLAUDE.md) - 项目级开发指南
- [../README.md](../README.md) - 项目基本说明
- 代码中的注释和类型定义