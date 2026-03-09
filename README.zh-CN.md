# Chat Archive

[English](./README.md) | [简体中文](./README.zh-CN.md)

> 警告
> Chat Archive 仅适用于已获授权且合法的会话数据归档。你只能处理你有权访问、导出、保存和处理的数据，并且必须遵守目标平台的服务条款、自动化规则、隐私义务以及适用的法律法规。

Chat Archive 是一个本地优先的浏览器扩展，用于将 AI 聊天历史导出为具备修订历史感知能力的 JSON 归档文件。

它面向那些需要可长期保存、可审查、可进一步处理的会话记录的用户，而不是一次性的复制粘贴导出。这个项目重点解决结构化归档、本地可复现存储，以及可被索引、比对和下游导入的稳定 JSON 模型。

## 项目定位

Chat Archive 不是一个通用浏览器自动化工具。

它专门面向以下用途：

- AI 对话的个人归档
- 本地研究数据集整理
- 带修订历史的会话追踪
- 用于检索、分析和数据管道导入的 JSON 导出

它明确不打算成为：

- 云同步产品
- 托管式 SaaS 服务
- Prompt 管理工具
- 多人协作平台

## 核心特性

- 完全本地化：本仓库不包含后端服务、远程存储或遥测链路。
- 修订历史感知：每个会话都保存当前快照以及修订树。
- 支持中断恢复：抓取状态保存在 `chrome.storage.local` 中。
- 平台定制化：适配器面向具体聊天产品实现，而不是做成通用抓取器。
- 双语界面：弹窗和指南页面支持英文与中文切换。

## 当前支持的平台

- ChatGPT：`chatgpt.com`、`chat.openai.com`
- Gemini：`gemini.google.com`

## 隐私模型

- 会话抓取、状态保存和导出都在本地浏览器扩展内完成。
- JSON 导出通过浏览器下载 API 写入你选择的位置。
- 本仓库不包含任何服务端组件。

但需要注意，扩展必须在你已登录的平台页面中读取和操作页面 DOM。若涉及敏感数据，请先审查源码并自行评估风险。

## 合规与负责任使用

本项目仅用于你有权访问和保存的会话数据的合法归档。

- 你有责任遵守目标平台的服务条款、可接受使用政策、导出限制以及自动化规则。
- 你有责任遵守适用于自身场景的隐私法、数据保护法、劳动/雇佣规则、合同义务以及内部合规要求。
- 不要使用本扩展抓取、导出、保存或处理你无权接触的数据。
- 不要使用本项目绕过限流、访问控制、同意要求、账号限制或平台保护机制。
- 如果某个平台不允许你想要进行的工作流，就不要用这个工具去执行该工作流。

本仓库只提供软件本身，不授予你违反平台规则或适用法律的许可。

## 快速开始

1. 安装 Node.js 20 或更高版本。
2. 运行 `npm run doctor`。
3. 运行 `npm run build`。
4. 打开 `chrome://extensions` 或 Edge 对应的扩展页面。
5. 启用开发者模式。
6. 从 `dist/` 加载未打包扩展。
7. 在同一个浏览器配置中打开 ChatGPT 或 Gemini。
8. 打开扩展弹窗并开始抓取。
9. 当抓取到你需要的会话后，导出 JSON。

在真实使用前，请先确认你的目标平台以及你所处司法辖区允许你进行相应的数据收集和保留行为。

## 开发命令

- `npm run doctor`：检查本地环境和项目结构
- `npm run build`：将未打包扩展构建到 `dist/`
- `npm run dev`：监听源码变化并同步到 `dist/`
- `npm run clean`：删除 `dist/` 和 `release/`
- `npm run package`：构建后生成 ZIP 包到 `release/`

## 仓库结构

- `manifest.json`：扩展清单
- `chat-archive.config.json`：构建与打包配置
- `src/background.js`：抓取调度、节奏控制、导出入口
- `src/content.js`：页面侧抓取运行时与 DOM 操作
- `src/storage.js`：本地会话持久化与修订树维护
- `src/job-state.js`：抓取任务状态保存
- `src/exporters.js`：JSON 导出生成与下载处理
- `src/adapters/`：平台适配器与共享适配器基础层
- `popup/`：运行控制与实时状态界面
- `options/`：导出指南和格式说明页

## 架构说明

这个项目围绕清晰的职责边界组织：

- `background.js` 负责调度、节奏控制、状态流转和导出动作。
- `content.js` 负责页面交互、滚动和消息收集。
- 适配器模块负责平台选择器、会话发现和消息提取差异。
- 存储模块负责稳定的本地持久化和修订树更新。

这种拆分是有意为之，它可以把平台变化隔离在适配器层，减少 UI 变化破坏导出语义的概率。

## 抓取行为

- 抓取状态保存在 `chrome.storage.local` 中。
- 中断后的运行可以从待处理会话 ID 继续。
- 已完成的运行可以重新开始，以刷新列表并检查新修订。
- 存在保守的节奏控制与冷却逻辑，以避免固定频率的自动化行为。
- 弹窗状态值包括 `idle`、`running`、`waiting`、`aborting`、`aborted`、`completed` 和 `error`。

## 导出模型

导出的 JSON 是一个包对象，而不是裸的会话数组。

```json
{
  "export_info": {
    "format": "chat-archive-export",
    "schema_version": 2,
    "exported_at": "2026-03-07T00:00:00.000Z",
    "conversation_count": 12,
    "structure_type": "conversation-snapshot-plus-revision-tree"
  },
  "conversations": [
    {
      "platform": "chatgpt",
      "conversation_id": "...",
      "title": "...",
      "tree_root_id": "root::chatgpt::...",
      "current_revision_id": "rev::chatgpt::...",
      "conversation_hash": "...",
      "messages": ["active snapshot"],
      "revisions": ["revision nodes"],
      "updated_at": 0,
      "last_checked_at": 0,
      "last_changed_at": 0
    }
  ]
}
```

核心模型是“会话快照 + 修订树”，而不是消息级 N 叉树。

- `conversations[*].messages`：当前可直接阅读的活动快照
- `conversations[*].revisions`：同一会话的修订历史
- `revisions[*].parent_revision_id`：修订之间的父子关系
- `revisions[*].divergence_index`：子修订相对父修订首次分叉的消息索引
- `current_revision_id`：根快照当前所代表的活动修订

### 为什么根级和修订节点都保存消息

- 根级 `messages` 用于优化常见读取场景。
- `revisions[*].messages` 保存完整历史快照。
- 这种重复是有意保留的，因为它能让导出消费、调试和数据导入更简单。

## 最小示例

```json
{
  "export_info": {
    "format": "chat-archive-export",
    "schema_version": 2,
    "structure_type": "conversation-snapshot-plus-revision-tree"
  },
  "conversations": [
    {
      "platform": "chatgpt",
      "conversation_id": "conv-1",
      "title": "Example Conversation",
      "tree_root_id": "root::chatgpt::conv-1",
      "current_revision_id": "rev-B",
      "conversation_hash": "hash-B",
      "messages": [
        { "role": "user", "content": "Hello", "hash": "m1" },
        { "role": "assistant", "content": "Hi, what can I help with?", "hash": "m2" },
        { "role": "user", "content": "Draft a weekly summary", "hash": "m3" },
        { "role": "assistant", "content": "Here is a first draft", "hash": "m4" },
        { "role": "user", "content": "Make it shorter", "hash": "m5" },
        { "role": "assistant", "content": "Here is a shorter version", "hash": "m6" }
      ],
      "revisions": [
        {
          "revision_id": "rev-A",
          "parent_revision_id": null,
          "change_type": "created",
          "divergence_index": 0,
          "conversation_hash": "hash-A",
          "message_count": 4,
          "messages": [
            { "role": "user", "content": "Hello", "hash": "m1" },
            { "role": "assistant", "content": "Hi, what can I help with?", "hash": "m2" },
            { "role": "user", "content": "Draft a weekly summary", "hash": "m3" },
            { "role": "assistant", "content": "Here is a first draft", "hash": "m4" }
          ]
        },
        {
          "revision_id": "rev-B",
          "parent_revision_id": "rev-A",
          "change_type": "append",
          "divergence_index": 4,
          "conversation_hash": "hash-B",
          "message_count": 6,
          "messages": [
            { "role": "user", "content": "Hello", "hash": "m1" },
            { "role": "assistant", "content": "Hi, what can I help with?", "hash": "m2" },
            { "role": "user", "content": "Draft a weekly summary", "hash": "m3" },
            { "role": "assistant", "content": "Here is a first draft", "hash": "m4" },
            { "role": "user", "content": "Make it shorter", "hash": "m5" },
            { "role": "assistant", "content": "Here is a shorter version", "hash": "m6" }
          ]
        }
      ]
    }
  ]
}
```

## 对贡献者的范围说明

最有价值的贡献通常集中在这些方面：

- 修复 ChatGPT 和 Gemini 的 DOM 变化
- 在不破坏兼容性的前提下改进导出 schema
- 提升抓取可靠性
- 优化新增平台时的适配器架构
- 为归档使用者补充文档

不太有帮助的改动包括通用 UI 重设计、偏离归档目标的产品功能，或建立在云服务假设上的设计。

协作细节请参考 `CONTRIBUTING.md` 和 `SECURITY.md`。