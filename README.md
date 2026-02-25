# Markdown System Frontend

## 项目简介

一个现代化的 Markdown 文档管理平台前端应用，提供直观的项目管理、文件树导航和实时编辑体验。

## 核心功能

### 用户认证
- 用户注册和登录
- JWT Token 自动管理
- 路由权限守卫
- 自动获取用户信息

### 项目管理
- 项目列表（卡片/列表双视图）
- 创建、编辑、删除项目
- 项目图标自定义
- 项目搜索和筛选
- 回收站功能

### 文件树管理
- 树形目录结构展示
- 创建文件夹和 Markdown 文件
- 文件重命名和拖拽移动
- 批量删除和恢复
- 回收站管理

### Markdown 编辑器
- 基于 Vditor 的富文本编辑
- 支持分屏、即时渲染、纯源码三种模式
- 图片拖拽上传和粘贴上传
- 实时大纲导航
- 文档历史版本

### 文档导出与分享
- 导出为 Markdown 文件
- 复制为 Markdown、知乎、公众号格式
- 创建分享链接（支持密码保护、过期时间）
- 分享页面独立访问

### 多标签页
- 打开的文件以标签页形式展示
- 标签页拖拽排序
- 右键菜单（关闭、关闭其他、全部关闭）
- 标签页状态持久化

### 响应式设计
- 桌面端完整功能
- 移动端适配布局
- 触摸手势支持

### 主题系统
- 亮色/暗色主题切换
- 跟随系统主题

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.3.4 | 渐进式框架 |
| Vue Router | 4.2.4 | 路由管理 |
| Pinia | 2.1.6 | 状态管理 |
| Element Plus | 2.3.9 | UI 组件库 |
| Vditor | 3.11.2 | Markdown 编辑器 |
| Vite | 4.4.5 | 构建工具 |
| Sass | 1.66.1 | CSS 预处理器 |
| mobile-drag-drop | 3.0.0-rc.0 | 移动端拖拽支持 |

## 项目结构

```
src/
├── api/                    # API 接口封装
│   ├── request.js          # Axios 实例配置
│   ├── userService.js
│   ├── projectService.js
│   ├── nodeService.js
│   ├── contentService.js
│   ├── imageService.js
│   ├── shareService.js
│   └── roleService.js
├── assets/                 # 静态资源
│   ├── base.css
│   ├── main.css
│   └── vditor.css
├── components/             # 组件
│   ├── projects/           # 项目页面组件
│   │   ├── EmptyState.vue
│   │   ├── ProjectCard.vue
│   │   ├── ProjectGrid.vue
│   │   ├── ProjectList.vue
│   │   ├── ProjectFormDialog.vue
│   │   ├── ProjectPropertyDialog.vue
│   │   ├── ProjectsHeader.vue
│   │   └── UserManagementDialog.vue
│   ├── workspace/          # 工作区组件
│   │   ├── EditorPanel.vue
│   │   ├── FileTreePanel.vue
│   │   ├── SidePanel.vue
│   │   └── RecycleBinDialog.vue
│   ├── share/              # 分享组件
│   │   ├── ShareCreateDialog.vue
│   │   ├── ShareFileTree.vue
│   │   └── ShareLinkManageDialog.vue
│   ├── OutlineNode.vue
│   ├── OutlineTree.vue
│   └── TabsBar.vue
├── composables/            # 组合式函数
│   ├── useEditor.js
│   ├── useFileTree.js
│   ├── useTabs.js
│   ├── useOutline.js
│   ├── useFileOperations.js
│   ├── useExportAndCopy.js
│   ├── useContentSearch.js
│   ├── useResponsive.js
│   └── usePanelResize.js
├── router/                 # 路由
│   └── index.js
├── stores/                 # Pinia 状态
│   ├── user.js
│   ├── projects.js
│   ├── files.js
│   └── theme.js
├── utils/                  # 工具函数
│   └── contentCache.js
├── views/                  # 页面
│   ├── Login.vue
│   ├── Projects.vue
│   ├── Workspace.vue
│   └── Share.vue
├── App.vue
└── main.js
```

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | Login | 登录/注册页面 |
| `/index` | Projects | 项目列表页 |
| `/project/:projectId-:projectName` | Workspace | 工作区（编辑页面） |
| `/share/:shareCode` | Share | 文档分享页 |

## 快速开始

### 环境要求

- Node.js ^20.19.0 或 >=22.12.0
- npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:5173`

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

### 代码检查与格式化

```bash
# ESLint 检查
npm run lint

# ESLint 自动修复
npm run lint:fix

# Prettier 格式化
npm run format

# Prettier 格式检查
npm run format:check
```

## 环境变量

创建 `.env.development.local` 文件：

```env
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:8080
```


