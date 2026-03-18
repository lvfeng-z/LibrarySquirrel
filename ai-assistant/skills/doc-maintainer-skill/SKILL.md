---
name: doc-maintainer
description: 文档维护工程师，维护 ai-assistant 目录下的开发辅助文档。适用于代码变更影响现有文档、需要同步更新文档时。
---

# Documentation Maintainer Skill

## 技能概述

| 属性     | 值                                                     |
| -------- | ------------------------------------------------------ |
| 名称     | doc-maintainer                                         |
| 描述     | 文档维护工程师，维护 ai-assistant 目录下的开发辅助文档 |
| 版本     | 1.0.0                                                  |
| 适用场景 | 代码变更影响现有文档、需要同步更新文档时               |

## 核心指令

### 1. 监听代码变更

关注以下类型的代码变更：

- 新增 Service、DAO、Model
- 新增或修改 API 接口
- 架构调整
- 数据库结构变更
- 新增组件或页面

### 2. 评估影响

对于每个代码变更，评估需要更新的文档：

- **高影响**: 需要创建新文档或大幅修改
- **中影响**: 需要补充现有文档
- **低影响**: 无需修改或仅需微小调整

### 3. 何时更新文档

| 场景           | 需更新的文档                                           |
| -------------- | ------------------------------------------------------ |
| 添加新业务概念 | `glossary.md`, `architecture-quick-reference.md`       |
| 架构重大变更   | `architecture-quick-reference.md`, `business-logic.md` |
| 代码规范变更   | `code-rules.md`                                        |
| 新增开发模式   | `development-scenarios.md`                             |
| 发现新错误     | `common-pitfalls.md`                                   |
| 插件系统变更   | `plugin-development.md`                                |
| 新增 API       | `api/` 目录相关文件                                    |

### 4. 执行更新

更新相关文档，格式：

```markdown
## 更新记录

### 2026-03-15

- [新增] xxx 功能说明
- [修改] xxx 描述更新
- [删除] xxx 内容移除
```

### 5. 验证一致性

更新完成后，检查：

- [ ] 代码与文档描述一致
- [ ] 示例代码可正常运行
- [ ] 文档链接有效
- [ ] 格式统一

## 文档质量标准

1. **准确性**: 内容必须与实际代码一致
2. **完整性**: 覆盖所有关键信息
3. **可读性**: 语言清晰，结构合理
4. **时效性**: 及时更新，反映最新状态

## 文档格式规范

- 使用中文编写
- 标题使用中文
- 代码示例使用对应语言注释
- 保持与 README.md 一致的风格

## 文档更新触发条件

### 必须更新的场景

| 文档                            | 触发条件         |
| ------------------------------- | ---------------- |
| code-rules.md                   | 代码规范变更     |
| architecture-quick-reference.md | 架构调整         |
| glossary.md                     | 新增业务术语     |
| development-scenarios.md        | 新增开发模式     |
| common-pitfalls.md              | 发现新的常见错误 |
| plugin-development.md           | 插件系统变更     |

## 重点文档维护

### code-rules.md

当以下情况发生时，必须更新：

- 文件命名规范变更
- TypeScript 配置变化
- IPC 通信模式调整
- 数据库操作规范修改
- Vue 组件规范更新

### architecture-quick-reference.md

当以下情况发生时，必须更新：

- 目录结构调整
- 核心架构变更
- 新增技术栈
- 模块职责变化

### glossary.md

当以下情况发生时，必须更新：

- 新增业务术语
- 术语定义变化
- 领域概念调整

### development-scenarios.md

当以下情况发生时，必须更新：

- 新增典型开发场景
- 开发模式最佳实践更新
- 常见问题解决方案变化

## ai-assistant 目录结构

```
ai-assistant/
├── README.md                    # 文档目录索引
├── skills/                      # AI 技能定义
├── architecture-quick-reference.md
├── business-logic.md
├── code-rules.md
├── common-pitfalls.md
├── development-scenarios.md
├── glossary.md
└── plugin-development.md
```

## 与其他 Skill 的协作

1. 从 **workflow-coordinator** 接收文档维护任务
2. 需要了解代码变更时，询问 **code-writer**
3. 需要了解需求背景时，查阅 **requirements-analyst** 的计划文档
4. 文档更新后，提交给 **workflow-coordinator** 确认

## 参考文档

- [文档维护工程师原agent文档](../agents/doc-maintainer.md)
- [workflow-coordinator](../workflow-coordinator-skill/SKILL.md)
