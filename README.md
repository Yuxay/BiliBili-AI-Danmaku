<h1 align="center">📺 BiliBili AI 弹幕姬</h1>

<p align="center">
  <strong>🎙️ B站直播间弹幕监听 + 🤖 AI 自动回复</strong><br>
  实时捕获弹幕 ⚡ 关键词精准匹配 🎯 大模型智能回复 💬 以弹幕形式回发直播间
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Node.js-24+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vue.js&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/License-GPLv3-blue?style=flat-square" alt="License" />
</p>

<p align="center">
  <img src="packages/electron-app/resources/工具介绍.png" alt="工具介绍" style="max-width: 100%;" />
</p>

> ⚠️ **声明**：这是一个 **Vibe Coding** 产物。大部分代码由 AI 生成，代码可能不够优雅，但——它和我有一个能跑就行。

---

## ✨ 功能特性

### 核心功能
- 🔴 **实时弹幕监听** — 基于 B站 WebSocket 协议，毫秒级接收弹幕、🎁礼物、💎SC
- 🎯 **关键词/正则匹配** — 支持纯文本、正则两种匹配模式，可配置大小写敏感和匹配范围（固定回复 / AI / 两者皆可）
- 🤖 **大模型回复** — 对接 OpenAI 兼容 API + 本地 Ollama，支持自定义 Prompt、发送间隔、队列上限、跳过标记与重复回复检测
- 🎣 **唤醒词识别** — 弹幕出现设定称呼即视为在叫你，模型输入自动带 `[对你]` 标记（主播发言带 `[主播]`），适合「叫我才说话」的观众号
- 🧠 **滚动上下文** — 最近 N 条弹幕和自己的回复一并发给模型，AI 能接上前文；`0` 关闭，每次只看当前一条
- 🚪 **回复闸门** — 只回复「叫你」或主播的弹幕，或限制「每窗口最多回复 M 条」；在调用模型前拦截，省 token 又不刷屏
- ⚡ **固定回复引擎** — 关键词命中后直接发送预设回复，优先级高于 AI，低延迟无等待
- 🚫 **忽略弹幕规则** — 支持 `左+数字`、`右+数字` 这类动态规则，命中后不触发固定回复 / AI 回复，保存即生效
- 🔑 **B站一键登录** — 内置 B站扫码登录弹窗，自动提取 Cookie，无需手动复制
- 🛑 **下播自动断开** — 可选开启，检测到主播下播（非直播中）后自动停止监听并断开 AI

### 直播间仪表板
- 📊 **实时仪表板** — 主播资料卡片、弹幕流、关键词命中统计、AI 队列状态一目了然
- 📈 **关键词命中排行** — 展示命中次数、匹配模式、优先级排名
- ⏱️ **AI 回复队列** — 实时显示待发送/已发送/跳过的 AI 回复状态，跳过原因（闸门拦截 / 跳过标记 / 重复回复）一并可见
- 🎯 **捕捉开关** — 全局关键词捕捉开关独立控制，不影响 AI 与固定回复链路
- 🚫 **连接中断** — 连接过程中可随时点击「取消连接」中断握手

### 配置与管理
- 🔒 **配置加密持久化** — 凭证本地 AES-256-GCM 加密存储，支持导出/导入（可选择是否包含敏感信息）
- 🔄 **热重载** — 关键词、固定回复、忽略弹幕与房间设置修改后即时生效；AI 唤醒词 / 上下文 / 闸门修改后需重新「开始连接」
- 📋 **模型列表** — OpenCode/Ollama 模型列表自动获取，实时更新
- 🔧 **per-provider 配置** — 每个模型供应商拥有独立的模型配置，自由切换
- 🔄 **版本检查** — 启动时自动检测 GitHub 最新 Release，提醒更新

### 监控与界面
- 📺 **弹幕监控面板** — 实时弹幕流、匹配命中列表、AI 队列状态一目了然
- 🏠 **默认首页仪表板** — 启动后默认进入「直播间」页，优先展示主播资料、实时弹幕与队列概览
- 🎨 **主题切换** — 支持亮色/暗色/跟随系统三种主题模式
- ℹ️ **关于页面** — 版本信息、技术栈、开源致谢

## 🏗️ 架构概览

```
📺 B站直播间 ──WebSocket──> 🐍 Python 弹幕核心 ──stdio──> ⚡ Electron 主进程
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                          🎯 关键词    ⚡固定回复    🤖 AI 中继
                              │            │            │
                              │            └─────┬──────┘
                              │                  ▼
                              │          ┌───────┴───────┐
                              │          ▼               ▼
                              │    🌐 OpenAI API    🐳 Ollama (本地)
                              │
                              └──────────────> 📤 弹幕回复
                                                   ▲
                                                   │
                                          🎨 Vue 3 GUI ──┘
```

**核心数据流：**

1. 🐍 Python 核心通过 WebSocket 连接 B站弹幕服务器，实时接收弹幕
2. 📡 弹幕数据通过 **stdio JSON-RPC** 传递给 Electron 主进程
3. 🚫 忽略弹幕规则先做前置过滤：命中规则的弹幕只显示与统计，不进入固定回复和 AI 链路
4. 🎯 关键词过滤器对剩余弹幕做匹配，按 `scope` 路由到固定回复或 AI
5. ⚡ 固定回复优先级高于 AI，命中后直接发送，阻止 AI 重复回复
6. 🚪 AI 中继先过回复闸门（唤醒词 / 主播发言 / 窗口限频），再带滚动上下文调用模型；被拦下的弹幕只进上下文、不回复
7. 🤖 AI 回复经发送间隔、跳过标记与重复检测后回传 Python，以弹幕形式发回直播间
8. 🖥️ GUI 提供可视化配置和实时状态监控

**主进程模块架构：**

| 模块 | 职责 |
|------|------|
| `index.ts` | 组合根，初始化并串联所有子模块、IPC 注册 |
| `app-shell.ts` | 窗口创建/关闭、系统托盘、应用生命周期 |
| `app-context.ts` | 全局运行时上下文（窗口、服务、状态引用） |
| `app-utility-ipc.ts` | 应用工具 IPC（版本更新检查、外链打开） |
| `auth-window.ts` | B站扫码登录弹窗，自动提取 Cookie |
| `config-store.ts` | 配置加密读写与持久化 |
| `config-ipc.ts` | 配置相关的 IPC 通信桥接 |
| `danmaku-service.ts` | Python 进程管理、JSON-RPC 协议、弹幕收发、连接中断与预热 |
| `danmaku-routing.ts` | 弹幕路由判定纯函数（scope 解析、固定回复/AI 路由） |
| `danmaku-ignore.ts` | 忽略弹幕规则编译与匹配（动态规则 / 正则） |
| `live-status-watcher.ts` | 开播状态轮询，连续确认下播后触发自动断开 |
| `dashboard-metrics-store.ts` | 直播间仪表板聚合器（关键词命中、AI 队列、主播资料快照） |
| `ai-context.ts` | 弹幕格式化（`[主播]` / `[对你]` 标记）、唤醒词、滚动上下文、回复去重与截断 |
| `ai-relay.ts` | AI 模型对接（OpenAI 兼容 API / Ollama），含回复闸门与上下文拼装 |
| `ai-ipc.ts` | AI 相关的 IPC 通信桥接 |
| `quick-reply-engine.ts` | 固定回复引擎，关键词命中后直接发送预设回复 |
| `runtime-cache.ts` | 运行时临时状态（模型列表缓存等） |
| `logger.ts` | 统一日志工具 |

## 📁 项目结构

```
packages/
├── shared/                             # 📦 共享类型定义 (TypeScript)
│   ├── src/
│   │   ├── index.ts                    # 📤 统一导出
│   │   └── types.ts                    # 📋 类型定义（弹幕/关键词/JSON-RPC/配置）
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.build.json
│
├── danmaku-core/                       # 🐍 Python 弹幕核心
│   ├── receiver.py                     # 📥 弹幕接收器 (WebSocket)
│   ├── receiver.spec                   # 📦 PyInstaller 配置（接收器）
│   ├── sender.py                       # 📤 弹幕发送器 (HTTP API)
│   ├── sender.spec                     # 📦 PyInstaller 配置（发送器）
│   ├── danmaku.py                      # 🚪 入口 (JSON-RPC over stdio)
│   ├── bilibili_core_api.py            # 📡 主播资料查询（B站 API）
│   └── requirements.txt                # 📦 依赖
│
└── electron-app/                       # ⚡ Electron 桌面客户端
    ├── electron.vite.config.ts         # ⚙️ Vite 配置
    ├── build/
    │   ├── afterPack.js                # 🔨 electron-builder 打包后钩子（图标注入）
    │   └── installer.nsh               # 📦 NSIS 自定义安装/卸载脚本
    ├── main/                           # ⚡ 主进程（模块化架构）
    │   ├── index.ts                    # 🏠 组合根 + IPC 注册
    │   ├── app-shell.ts                # 🪟 窗口/托盘/生命周期
    │   ├── app-context.ts              # 🌐 全局运行时上下文
    │   ├── app-utility-ipc.ts          # 🔧 版本检查/外链打开
    │   ├── auth-window.ts              # 🔑 B站扫码登录
    │   ├── config-store.ts             # 🔐 配置加密存储
    │   ├── config-ipc.ts               # 📡 配置 IPC 桥接
    │   ├── danmaku-service.ts          # 🔌 Python 进程管理 + 弹幕收发 + 连接中断
    │   ├── danmaku-routing.ts          # 🎯 弹幕路由判定纯函数
    │   ├── danmaku-ignore.ts           # 🚫 忽略弹幕规则（动态规则 / 正则）
    │   ├── live-status-watcher.ts      # 🛑 下播检测（轮询开播状态）
    │   ├── dashboard-metrics-store.ts  # 📊 仪表板聚合器
    │   ├── ai-context.ts               # 🧠 唤醒词 / 滚动上下文 / 回复格式化
    │   ├── ai-relay.ts                 # 🤖 AI 模型对接 + 回复闸门
    │   ├── ai-ipc.ts                   # 📡 AI IPC 桥接
    │   ├── quick-reply-engine.ts       # ⚡ 固定回复引擎
    │   ├── runtime-cache.ts            # 💾 运行时缓存
    │   └── logger.ts                   # 📝 日志
    ├── preload/
    │   └── index.ts                    # 🌉 桥接
    ├── renderer/
    │   ├── index.html
    │   └── src/
    │       ├── App.vue                  # 🎨 主界面（侧栏导航）
    │       ├── main.ts                  # 🚀 启动
    │       ├── env.d.ts                 # 📝 类型声明
    │       ├── styles/                  # 🎨 样式
    │       │   ├── app.css
    │       │   ├── global.css
    │       │   ├── about.css
    │       │   ├── danmaku.css
    │       │   ├── dev.css
    │       │   ├── keywords.css
    │       │   ├── live-room-dashboard.css
    │       │   ├── matched.css
    │       │   ├── model-settings.css
    │       │   └── room.css
    │       └── pages/
    │           ├── BoundaryView.vue     # 📊 直播间仪表板（弹幕流/关键词/AI队列）
    │           ├── dashboard/           # 📊 仪表板 composable
    │           │   └── useLiveRoomDashboard.ts
    │           ├── DanmakuView.vue      # 💬 弹幕实时监控
    │           ├── RoomView.vue         # 📺 直播间配置 + B站登录
    │           ├── KeywordsView.vue     # 🎯 关键词规则管理
    │           ├── MatchedView.vue      # ✅ 匹配命中记录
    │           ├── ModelSettingsView.vue # 🤖 AI 模型配置
    │           ├── AboutView.vue        # ℹ️ 关于（版本/主题/关闭行为/更新检查）
    │           └── DevView.vue          # 🔧 开发调试
    └── resources/
        └── icon.ico                     # 🖼️ 应用图标（多尺寸）
```

## 🚀 快速开始

### 📋 前置要求

| 依赖 | 最低版本 |
|------|---------|
| [Node.js](https://nodejs.org/) | ≥ 24 |
| [Python](https://www.python.org/) | = 3.13 |
| [pnpm](https://pnpm.io/) | ≥ 10 |

### 📥 安装

```bash
# 克隆仓库
git clone https://github.com/xgxdmx/BiliBili-AI-Danmaku.git
cd BiliBili-AI-Danmaku

# 📦 安装 Node 依赖
pnpm install

# 🐍 安装 Python 依赖
cd packages/danmaku-core && pip install -r requirements.txt
```

### 🛠️ 开发

```bash
# 🚀 启动 Electron 开发模式 (hot-reload)
pnpm dev

# ✅ 仅类型检查
pnpm typecheck

# 🔨 构建
pnpm build
```

### 📦 打包发布

```bash
# 🎁 完整打包 (Python EXE + Electron 安装包)
pnpm package

# 🐍 只打包 Python 部分
pnpm package:python

# ⚡ 只打包 Electron 部分
pnpm package:electron

# 🧹 清理构建产物
pnpm package:clean
```

> 打包脚本基于 Node.js (`scripts/build.mjs`)。

## ⚙️ 配置说明

应用首次启动后会自动创建加密配置文件，所有配置均可在 GUI 中完成，无需手动编辑文件。

### 🖱️ 方式一：GUI 配置（推荐）

1. 启动后默认进入左侧「📺 直播间」仪表板查看实时状态
2. 点击「🛠️ 直播间配置」进入配置页
3. 点击「🔑 B站登录」按钮扫码登录，自动获取 Cookie
4. 填写直播间房间号，点击「▶️ 开始监听」
5. 在「🎯 关键词」页面添加匹配规则
6. 在「🤖 大模型」页面配置 API 和 Prompt
7. 在「🔧 设置工具」页面管理全局开关与配置导入导出

### 📂 方式二：配置导入

支持在 GUI 中导入/导出 JSON 配置文件，方便在多台机器间同步。导出时可选择是否包含敏感信息。

配置结构示例：

```jsonc
{
  "room": {
    "roomId": 12345,
    "enabled": true,
    "minMedalLevel": 0,
    "captureEnabled": true,
    "sendOnDisconnect": true,
    "disconnectMessage": "先下播啦，感谢大家陪伴，我们下次见～",
    "autoStopWhenLiveEnds": false
  },
  "credentials": {
    "sessdata": "***",
    "biliJct": "***",
    "buvid3": "***"
  },
  "keywords": [
    { "pattern": "你好", "type": "keyword", "caseSensitive": false, "scope": "both", "enabled": true },
    { "pattern": "^签到$", "type": "regex", "scope": "quickReply", "enabled": true }
  ],
  "quickReplies": [
    { "contains": ["签到"], "reply": "感谢签到～", "cooldownMs": 5000, "enabled": true }
  ],
  "danmakuIgnore": {
    "enabled": true,
    "patterns": ["左+数字", "右+数字", "^数字+连击$"]
  },
  "aiModel": {
    "provider": "opencode",
    "prompt": "你是一个直播间助理，逐条回复，单条不超过40字。",
    "sendIntervalMs": 1800,
    "maxPending": 100,
    "ignoreUsernames": [],
    "skipReplies": ["NO_REPLY", "无需回复", "忽略"],
    "wakeWords": ["比小哩", "比小哩_", "小哩", "哩哩"],
    "contextSize": 6,
    "replyOnlyWhenAddressed": false,
    "replyMaxPerWindow": 3,
    "replyWindowMs": 60000,
    "providers": {
      "opencode": {
        "modelId": "mimo-v2.5-free",
        "apiKey": "sk-***",
        "endpoint": "https://opencode.ai/zen/v1/chat/completions",
        "temperature": 0.7,
        "topP": 0.9,
        "maxTokens": 500
      },
      "ollama": {
        "modelId": "qwen2.5:7b",
        "ollamaBaseUrl": "http://localhost:11434",
        "temperature": 0.7,
        "topP": 0.9,
        "maxTokens": 500,
        "ollamaKeepAlive": "5m",
        "requestTimeoutMs": 120000
      }
    }
  },
  "theme": "system"
}
```

### 🎯 关键词规则

| 字段 | 说明 |
|-----|------|
| `type: "keyword"` | 🔤 子串匹配，支持大小写控制 |
| `type: "regex"` | 📜 JavaScript 正则表达式，支持捕获组 |
| `scope: "both"` | 🎯 同时触发固定回复和 AI |
| `scope: "quickReply"` | ⚡ 仅触发固定回复，AI 处理所有弹幕 |
| `scope: "ai"` | 🤖 仅触发 AI，固定回复处理所有弹幕 |

### ⚡ 固定回复规则

| 字段 | 说明 |
|-----|------|
| `contains` | 🔎 包含任意关键词即命中 |
| `notContains` | 🚫 排除包含这些词的弹幕 |
| `regex` | 📜 正则匹配（与 contains 二选一） |
| `reply` | 💬 命中后发送的回复文本 |
| `cooldownMs` | ⏱️ 冷却时间 (ms)，防止刷屏 |

> ⚡ 固定回复优先级始终高于 AI。当弹幕命中固定回复规则时，AI 不会对该弹幕回复。

### 🚫 忽略弹幕规则

在「🎯 关键词」页面底部的「忽略弹幕（命中不回复）」中配置。命中规则的弹幕仍会正常显示和统计，但**不会进入固定回复 / AI 自动回复流程**。总开关切换后即时保存，规则保存后立即生效（均无需重连）。

| 写法 | 说明 | 命中示例 |
|-----|------|---------|
| `左+数字` | 包含「左」且紧接数字（不区分大小写，忽略空格差异） | `左1`、`走左3`、`左 12` |
| `^右+数字$` | 整条弹幕就是「右」+数字（首尾锚定） | `右12`；不命中 `右边12个` |
| `数字+连击` | 数字后紧跟「连击」 | `66连击`、`6 6 连击` |
| `C\+\+` | `\` 转义加号，按纯文本匹配 | `C++` |
| `/^6+$/` | 原生正则，语法与「无需发送标记」一致 | `666`；不命中 `666a` |

**动态规则语法：**

- 用 `+`（全角 `＋` 亦可）把「文本」和「占位符」拼接起来，按顺序连续匹配。
- 占位符：`数字`（含全角数字）、`字母` / `英文`、`汉字` / `中文`、`任意` / `*`、`空格`。
- 占位符必须作为独立片段（`+` 分隔），例如 `左数字` 是纯文本，`左+数字` 才是动态规则。
- 默认「包含」匹配；加 `^` / `$` 改为整条弹幕锚定。
- 默认不区分大小写；原生正则可用 `/pattern/i` 等标志（`g` / `y` 会被自动移除，避免漏匹配）。
- 匹配时会同时比对原文和去掉空格后的文本，防止用 `左 1` 这类写法绕过。

### 🎣 唤醒词与滚动上下文

在「🤖 大模型」页面的提示词配置区设置。让 AI 知道「谁在叫我」以及「前面聊了什么」。

| 配置项 | 默认值 | 说明 |
|-----|------|------|
| `wakeWords` | `比小哩`、`小哩`、`哩哩` | 观众称呼 AI 的名字，每行一个；归一化后长度 ≥ 2 才生效 |
| `contextSize` | `6` | 滚动上下文条数（`0` = 关闭，每次只看当前一条；上限 20） |

- 唤醒词匹配会忽略 `@`、空格、下划线、标点与大小写，所以 `@比小哩_`、`比 小 哩` 都能命中。
- 命中唤醒词的弹幕在模型输入里带 `[对你]` 标记；主播本人发言带 `[主播]` 标记（按 uid 判定，不是按昵称）。
- 系统提示词会自动追加【直播间身份】（观众怎么称呼你）与【本场主播】（主播昵称），无需自己写进 Prompt。
- 上下文把最近 N 条弹幕和自己的回复拼成 `【最近聊天】…【当前弹幕】` 一并发给模型；被闸门、跳过标记或重复检测拦下的弹幕也会进入上下文，只是不回复。
- 重新点「开始连接」会重建上下文并清空去重记录；修改唤醒词 / 上下文条数后需重新连接生效。

### 🚪 回复闸门

在「🤖 大模型」页面的「回复闸门」卡片设置，用来控制「什么情况下才值得回」。

| 配置项 | 默认值 | 说明 |
|-----|------|------|
| `replyOnlyWhenAddressed` | 关闭 | 只回复「叫了你」或主播的弹幕：弹幕里出现唤醒词（含 `@` 上你的名字）即视为在叫你 |
| `replyMaxPerWindow` | `3` | 时间窗口内最多回复条数（`0` = 不限制，上限 100） |
| `replyWindowMs` | `60000` | 频率窗口时长（GUI 以「秒」填写，上限 600 秒） |

- 闸门在**调用模型之前**执行：被拦下的弹幕不消耗 token，只在「AI 返回预览」里记一条跳过原因。
- 连续相同原因在预览中只保留一条，避免刷满列表；跳过标记、重复回复等拦截同样会出现在预览里。
- 回复超过 40 字会按标点截断（优先在句末收尾，不会把一句话砍成两半）；与最近 5 条已发送回复重复时同样跳过。
- 修改闸门参数后需重新点「开始连接」生效；想按弹幕内容直接跳过（例如 `左+数字`），请用上一节的忽略弹幕规则。

### 🛑 下播自动断开

在「📺 直播间配置」页面开启「下播时自动断开连接」（默认关闭，切换后即时保存）。

- 连接期间每 20 秒查询一次直播间开播状态；只有本次连接**先观察到「直播中」**，之后连续 2 次都返回非直播，才判定为主播下播。
- 查询失败（超时 / 接口异常）视为未知，不累计、不判定，避免网络抖动误断开；从真正下播到断开最慢约 40 秒。
- 判定下播后停止监听、断开 AI 中继，并在界面提示「主播已下播，已自动断开连接」。
- 若同时开启「断开前发送告别弹幕」，会尽力发送告别文案（最多等待 5 秒，发送失败不影响断开）。
- 该开关每次轮询都会重新读取，切换后无需重新连接。

## 🧰 技术栈

| 层 | 技术 |
|---|------|
| 🐍 弹幕核心 | Python 3.13 + [blivedm](https://github.com/xfgryujk/blivedm) + aiohttp |
| 🔗 进程通信 | JSON-RPC 2.0 over stdio |
| 🤖 AI 对接 | TypeScript (OpenAI 兼容 API) |
| ⚡ 桌面客户端 | Electron 43 + Vue 3 + Vite 7 |
| 🔄 状态管理 | Vue 3 Composition API (provide/inject) |
| 🔒 配置持久化 | electron-store (AES-256-GCM 加密) |
| 📦 类型共享 | TypeScript project references |
| 🔨 构建 | electron-vite + electron-builder + PyInstaller |
| 📦 安装包 | NSIS (自定义安装/卸载/图标/中文界面) |
| 🔄 CI/CD | GitHub Actions (Windows + macOS 自动构建) |

## 🙏 开源致谢

本项目依赖以下优秀开源项目（与应用内「关于」页保持一致）：

- [blivedm](https://github.com/xfgryujk/blivedm)
- [bilibili-api-python](https://github.com/Nemo2011/bilibili-api)
- [electron-builder](https://www.electron.build)
- [PyInstaller](https://pyinstaller.org)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [vue-router](https://router.vuejs.org)

## 📅 更新日志

| 版本 | 日期 | 主要改动                                                                                                                                                                                                   |
|:------:|:--------:|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **未发布** | 2026-11 | 唤醒词、滚动上下文、回复闸门、忽略弹幕与下播自动断开<br/>• 新增 `ai-context.ts`：唤醒词匹配（忽略 `@`/空格/标点/大小写，≥2 字生效）、弹幕格式化（`[对你]` / `[主播]` 标记）、滚动上下文、回复去重与按标点截断（40 字）<br/>• 系统提示词自动追加【直播间身份】与【本场主播】，无需手写<br/>• 回复闸门：只回复唤醒词 / 主播弹幕 + 时间窗口限频，在调用模型前拦截以省 token，跳过原因显示在「AI 返回预览」<br/>• 新增忽略弹幕规则（动态规则 `左+数字` / 原生正则），命中后不进入固定回复与 AI 流程，保存即生效<br/>• 新增下播自动断开：每 20 秒轮询开播状态，连续 2 次确认非直播才断开，查询失败不判定<br/>• 修复跳过标记误判（改用前缀匹配，`passionate` 不再命中 `pass`）与 `temperature=0` 被默认值覆盖<br/>• 弹幕发送与状态查询补充超时保护，接口卡住时超时返回而不是一直等待 |
| **v0.5.6** | 2026-08 | 模型列表校对与安全加固<br/>• 免费模型列表按 `/zen/v1/models` 远端实测校准：移除已下线的 `minimax-m2.5-free`、`deepseek-v4-flash-free`、`north-mini-code-free`、`ling-2.6-flash-free`、`trinity-large-preview-free`、`hy3-preview-free`、`nemotron-3-super-free`，以及 `kimi-k2.7`、`claude-opus-4-1`；默认模型改为 `mimo-v2.5-free`<br/>• 失效模型加入弃用黑名单，防远端列表滞后回显<br/>• 安全加固：主窗口阻止意外导航与新窗口（`will-navigate` + `setWindowOpenHandler`）、登录 Cookie 按 `.bilibili.com` 域名过滤、配置导入增加最小形状校验防损坏 JSON 崩溃<br/>• 正确性修复：跳过正则剥除 `g`/`y` 标志（修复"隔一条漏一条"）、正则关键词遵循大小写开关、AI 响应预览截断防 IPC 放大<br/>• 依赖升级：Electron 42→43、Vue 3.5.41、electron-builder 26.15.3、vue-router 5.2.0、vue-tsc 3.3.11 |
| **v0.5.5** | 2026-06 | 大模型供应商与思考型模型支持增强<br/>• 新增「自定义」供应商：手填 API 端点 / 模型 ID / API Key，可对接任意 OpenAI 或 Anthropic 兼容服务（含 OpenCode 未列出 / 已弃用但仍可用的模型），按 Endpoint URL 自动识别协议<br/>• OpenCode 模型列表全量更新：Free / Go / Zen 三档分组，新增 GPT 5.5、Claude Fable 5、Claude Opus 4.8、Gemini 3.5 Flash、Qwen3.7、Grok Build 0.1 等；移除已弃用模型<br/>• 远端弃用模型黑名单：`claude-sonnet-4`、`glm-5` 等不再经由「远端新增模型」分组回显<br/>• DeepSeek 等思考型模型修复：`max_tokens` 自适应（思考型 ≥ 2048）+ 截断自动重试（2048→4096→8192），解决 token 超长导致的空回复<br/>• 思考标签（`<think>` / `<reasoning>`）清理扩展到所有 provider，防 reasoning 泄漏成弹幕<br/>• Big Pickle（隐身思考模型）握手失败修复：响应式重试 + 运行期发现机制<br/>• 代码模型（north-mini-code 等）代码片段回复过滤，保留 B 站常见弹幕（2333 / 666 / GG）<br/>• 打包脚本修复：`.deploy` 安装加 `--ignore-scripts`，解决 pnpm 在 CI 下因 esbuild 构建脚本被忽略而打包失败<br/>• 构建环境升级至 `pnpm@11.9.0`，`onlyBuiltDependencies` 迁移至 `pnpm-workspace.yaml` |
| **v0.5.4** | 2026-05 | 打包链路与首次连接体验修复<br/>• 修复 Windows 打包后主程序图标注入链路（`afterPack` + `rcedit`），避免安装后回退 Electron 默认图标<br/>• 首次连接预载提示改为应用内主题化弹窗（暗色/亮色一致）<br/>• 新增“**不再提示**”勾选项，并调整为“**按版本生效**”：同版本可跳过，升级后会重新提示一次<br/>• 修复覆盖安装后提示偏好读取不一致问题（配置读取链路补齐）<br/>• 构建环境升级至 `pnpm@11.0.9` |
| **v0.5.1** | 2025-05 | 稳定性修复与安全性加固<br/>• 修复 Python warmup 预热模式因导入副作用导致的 `lost sys.stderr` 异常（`receiver.py` 模块级 `system.ready` 输出移至运行期）<br/>• 修复 blivedm 回调线程直接调用 `asyncio.create_task` 的跨线程 event loop 风险，改用 `run_coroutine_threadsafe`<br/>• 修复 Windows 信号处理器空注册（`add_signal_handler` 不可用时降级到 `signal.signal`）<br/>• 修复 Python 子进程 stdin EOF 后空转不退出（添加 EOF 哨兵与 `_running` 置 False）<br/>• 修复 `shutdown` 信号重复触发导致双重释放（添加 `shutdown_started` 防重入门闩）<br/>• 修复 Electron `second-instance` 场景重复注册 IPC handler 导致的潜在崩溃<br/>• 修复 `app:rendererReady` 监听使用 `removeAllListeners` 的破坏性模式，改为一次性注册守卫<br/>• 修复 AI 回复队列超过 `maxPending` 上限时仅告警不截断，改为丢弃最旧条目并记录决策<br/>• 加固 `shell:openExternal` 仅允许 `http/https` 协议，阻止 `file://` 等危险协议<br/>• Python 弹幕核心全量函数注释规范化（每个 `def` 补齐功能说明与实现思路 docstring） |
| **v0.5.0** | 2025-05 | 直播间仪表板页面（主播资料卡片、弹幕流、关键词命中排行、AI 队列状态）<br/>• 主播资料查询模块 `bilibili_core_api.py` <br/>• 仪表板聚合器 `dashboard-metrics-store.ts` 下沉主进程 <br/>• 弹幕路由纯函数 `danmaku-routing.ts` 抽离 <br/>• 连接中断功能（连接过程中可随时取消）<br/>• 延后预热策略（进入直播间配置页触发，避免首启卡顿）<br/>• 关键词捕捉开关仅控制关键词链路，不联动固定回复与 AI <br/>• 关键词空态提示修复（`hasEnabledKeywordRules` 全链路贯穿）<br/>• 打包修复（`bilibili_api` 动态子模块收集、UTF-8 编码强制、子进程生命周期优化）<br/>• 版本自动检查（GitHub Release 对比）<br/>• 模型列表更新策略修复 <br/>• 主进程新增 `app-utility-ipc.ts` 工具模块 |
| **v0.4.0** | 2025-04 | Python 入口 `run.py` → `danmaku.py` 全链路重命名（含 PyInstaller / 构建 / 部署脚本 / 安装器）<br/>• 关于页面新增关闭按钮行为设置（询问/最小化到托盘/直接退出）<br/>• 主进程可读性重构（弹幕路由纯函数、配置 IPC 助手拆分）<br/>• AI 握手兼容增强（多个 fallback 提取路径 + 响应预览诊断）<br/>• 样式外提收尾（所有页面内联样式迁移至独立 CSS） |
| **v0.3.0** | 2025-04 | 主进程模块化重构（12 个专职模块）<br/>• 固定回复优先级修复（高于 AI、全局开关同步）<br/>• 停止监听按钮交互增强 <br/>• 单实例限制防止重复启动 <br/>• NSIS 安装包完善（可选安装路径、安装后启动、完整卸载含配置保留选项）<br/>• 自定义应用图标（多尺寸 ICO + rcedit 注入）<br/>• 关于页面（版本/主题/技术栈） |
| **v0.2.0** | 2025-04 | OpenCode 模型列表自动获取、启动时实时拉取可用模型 <br/>• 新增亮色/暗色/跟随系统三种主题模式 <br/>• 导出配置可选择是否包含敏感信息 <br/>• 每个模型供应商独立配置、连接中自动热重载 <br/>• 菜单栏间距优化 |
| **v0.1.2** | 2025-04 | Ollama 模型参数自定义（温度/Top P/Max Token/Keep-Alive/超时）<br/>• 自动识别 Ollama 模型列表 <br/>• 修复 Thinking 过程误识别问题 <br/>• 优化弹幕回复提取逻辑、减少 NO_REPLY |
| **v0.1.1** | 2025-02 | 修复打包异常  |
| **v0.1.0** | 2025-01 | 初始版本：B站弹幕监听+关键词匹配 <br/>• AI 自动回复（OpenCode/Ollama 双供应商）<br/>• B站扫码登录 <br/>• 配置加密存储  |

## ⚠️ 安全提醒

> 🔴 **配置文件包含 B站 Cookie 和 AI API Key 等敏感信息！**
>
> - 🔒 `config.json` 已在 `.gitignore` 中排除，**绝不可提交到版本控制**
> - 🏷️ 配置文件使用基于机器指纹的 AES-256-GCM 加密存储
> - 📄 导出的配置文件为明文，仅用于本地迁移，**务必妥善保管**
> - 🚫 如需分享项目，请确保清除所有包含凭证的文件

## 📄 许可证

本项目基于 GNU General Public License v3.0（GPLv3）开源许可。

- ✅ 可免费使用于商业和非商业目的
- ✅ 可自由修改和分发
- ✅ 分发修改版/衍生版时需按 GPLv3 开源并附带许可证声明
- ✅ 分发时需提供对应源代码（按 GPLv3 要求）

详细条款请参阅 [LICENSE](./LICENSE) 文件。
