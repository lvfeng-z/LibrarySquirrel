# AI助手查询示例

## 示例1：理解作者关联问题

**用户查询**："用户报告说下载的作品无法通过本地作者搜索到，应该如何诊断这个问题？"

**AI助手参考流程**：

### 步骤1：快速概念定位
参考 `glossary.md`：
- "本地作者"：本地创建的作者，用于统一跨站点作者身份
- "作者关联"：本地作者与站点作者的关联关系
- "统一检索"：通过关联实现跨站点检索

### 步骤2：业务逻辑理解
参考 `business-logic.md` "作者系统"部分：
- 本地作者关联站点作者后才能实现统一检索
- 关联存储在 `re_work_author` 表
- 检索时系统会查找所有关联的站点作者

### 步骤3：数据流分析
参考 `business-logic.md` "作品下载流程"：
```
插件获取作品信息 → 创建站点作者 → 关联本地作者（可选） → 保存作品
```

### 步骤4：可能的问题点
参考 `development-scenarios.md` "场景3"：
1. 站点作者创建失败
2. 本地作者关联逻辑缺失
3. 关联表数据插入失败
4. 检索查询逻辑错误

### 步骤5：具体检查建议
1. 检查 `WorkService.saveFromPlugin()` 中的作者处理逻辑
2. 检查 `ReWorkAuthorService.associateAuthors()` 的调用
3. 验证数据库 `re_work_author` 表数据
4. 检查检索查询是否包含关联作者条件

## 示例2：添加新功能需求

**用户查询**："需要添加作品评分功能，用户可以为作品打1-5星"

**AI助手参考流程**：

### 步骤1：确定开发模式
参考 `development-scenarios.md` "常见开发模式" → "模式1：添加新实体"

### 步骤2：参考类似实现
参考 `development-scenarios.md` "场景2：添加作品收藏功能"：
1. 数据库表设计
2. 数据模型创建
3. Service层实现
4. IPC注册
5. 前端组件

### 步骤3：具体实现步骤
1. **数据库**：创建 `rating` 表（work_id, user_id, score, create_time）
2. **模型**：创建 `Rating` entity 和 `RatingDTO`
3. **DAO**：创建 `RatingDao` 继承 `BaseDao`
4. **Service**：创建 `RatingService` 继承 `BaseService`
5. **IPC**：在 `MainProcessApi` 注册 `rating-save`, `rating-getByWork` 等方法
6. **前端**：创建评分组件和Store

### 步骤4：架构约束检查
参考 `architecture-quick-reference.md`：
- IPC命名：`'rating-save'` → `ratingSave()`
- 响应格式：使用 `ApiUtil.response()`
- 事务处理：使用 `db.transaction()` 如果需要多个操作

## 示例3：性能优化查询

**用户查询**："作品列表页面加载很慢，如何优化？"

**AI助手参考流程**：

### 步骤1：理解数据模型
参考 `business-logic.md` "数据模型关系"：
- 作品与作者、标签有多对多关系
- 检索可能涉及多个JOIN操作

### 步骤2：参考优化方案
参考 `development-scenarios.md` "场景4：优化作品检索性能"：
1. 分析现有查询逻辑
2. 添加数据库索引
3. 优化JOIN查询
4. 实现分页缓存
5. 前端虚拟滚动

### 步骤3：具体优化建议
1. 检查 `WorkService.queryPage()` 的查询逻辑
2. 为常用查询字段添加索引（create_time, site_id等）
3. 使用单次查询代替N+1查询
4. 在前端实现虚拟滚动减少渲染压力

### 步骤4：技术要点
参考 `architecture-quick-reference.md`：
- 数据库索引位置：`createDataTables.yml`
- 缓存实现位置：Service层
- 前端虚拟滚动：Element Plus组件

## 示例4：插件开发问题

**用户查询**："开发的新插件无法正常下载作品，如何调试？"

**AI助手参考流程**：

### 步骤1：插件架构理解
参考 `business-logic.md` "插件系统"部分：
- 插件存储在 `plugin/package/`
- 通过 `PluginFactory` 创建实例
- `TaskHandler` 处理插件执行

### 步骤2：参考插件示例
参考 `development-scenarios.md` "场景5：扩展插件接口"：
- 插件必须实现 `BasePlugin` 接口
- 主要方法：`processUrl()`
- 返回格式：`PluginWorkResponseDTO`

### 步骤3：调试步骤
1. 检查插件是否在 `plugin/package/` 正确安装
2. 验证 `processUrl()` 方法实现
3. 检查返回的 `PluginWorkResponseDTO` 格式
4. 查看 `LogUtil` 输出中的错误信息
5. 验证任务执行流程：任务创建 → 插件选择 → 执行 → 结果处理

### 步骤4：常见问题
1. 插件类未正确导出
2. `processUrl()` 返回格式错误
3. 插件依赖缺失
4. 站点URL匹配失败

## 示例5：架构理解查询

**用户查询**："这个项目的双架构设计有什么优势？"

**AI助手参考流程**：

### 步骤1：核心概念解释
参考 `glossary.md`：
- "本地作者" vs "站点作者"
- "本地标签" vs "站点标签"
- "统一检索"机制

### 步骤2：业务价值说明
参考 `business-logic.md` "关键业务概念"：
- **跨站点统一**：不同站点的相同作者/标签可统一管理
- **语义聚合**：相似但不完全相同的标签可归为一类
- **检索效率**：一次搜索返回所有相关站点结果
- **灵活性**：用户可自定义关联规则

### 步骤3：技术实现
参考 `architecture-quick-reference.md`：
- 关联表：`re_work_author`, `re_work_tag`
- 检索查询：JOIN关联表实现统一检索
- 数据同步：插件下载时自动创建站点实体，手动关联本地实体

### 步骤4：具体优势总结
1. **用户体验**：简化跨站点检索
2. **数据质量**：统一不同站点的数据标准
3. **扩展性**：支持不断新增的内容平台
4. **灵活性**：用户可自定义关联规则

## 查询策略总结

### 快速定位策略
1. **术语问题** → 查 `glossary.md`
2. **架构问题** → 查 `architecture-quick-reference.md`
3. **业务逻辑问题** → 查 `business-logic.md`
4. **开发实现问题** → 查 `development-scenarios.md`

### 深度分析策略
1. 从速查表获取概览
2. 深入业务逻辑文档理解细节
3. 参考类似场景的实现
4. 验证架构约束

### 解决方案生成
1. 基于文档中的模式提出方案
2. 检查技术约束和最佳实践
3. 提供具体的代码位置和修改建议
4. 考虑向后兼容性和扩展性

## 文档协同使用示例

**复杂问题**："用户反馈从pixiv下载的作品，站点标签没有正确关联到本地标签"

**协同查询流程**：

1. **术语理解**（glossary.md）：
   - 站点标签：来自pixiv的原始标签
   - 本地标签：用户创建的统一定义标签
   - 标签关联：两者间的映射关系

2. **业务逻辑**（business-logic.md）：
   - 插件下载流程：pixiv插件获取标签 → 创建站点标签
   - 关联时机：下载后用户手动关联，或通过自动规则关联
   - 检索机制：通过关联表实现统一检索

3. **架构要点**（architecture-quick-reference.md）：
   - 关联表：`re_work_tag`
   - 服务：`LocalTagService`, `SiteTagService`, `ReWorkTagService`
   - IPC方法：相关标签操作API

4. **类似场景**（development-scenarios.md）：
   - 场景3中的作者关联问题修复思路
   - 检查关联创建逻辑和数据一致性

5. **综合诊断**：
   - 检查pixiv插件是否返回正确的标签信息
   - 验证 `WorkService` 中的标签处理逻辑
   - 检查 `ReWorkTagService` 的关联创建
   - 查看数据库 `re_work_tag` 表数据