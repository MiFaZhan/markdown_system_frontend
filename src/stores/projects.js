import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProjectsStore = defineStore('projects', () => {
  const projectList = ref([
    {
      id: 1,
      name: '示例项目',
      description: '这是一个示例项目，包含学习笔记和文档',
      icon: '📚',
      updateTime: '2023-10-24 10:00',
      files: [
        {
          id: 1,
          name: '学习笔记',
          type: 'folder',
          updateTime: '2023-10-24 10:00',
          children: [
            {
              id: 11,
              name: 'Vue3 学习笔记.md',
              type: 'file',
              updateTime: '2023-10-24 10:00',
              content: `# Vue3 学习笔记

## 组合式 API

### setup 函数

setup 是 Vue3 中新增的组件选项，是组合式 API 的入口。

\`\`\`javascript
import { ref, reactive } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const state = reactive({ name: 'Vue3' })
    return { count, state }
  }
}
\`\`\`

### ref 与 reactive

- **ref**: 用于定义基本类型的响应式数据
- **reactive**: 用于定义对象类型的响应式数据

## 响应式系统

### Proxy 代理

Vue3 使用 Proxy 替代了 Vue2 的 Object.defineProperty。

优点：
1. 可以监听数组变化
2. 可以监听对象属性的添加和删除
3. 性能更好

### computed 计算属性

\`\`\`javascript
const doubleCount = computed(() => count.value * 2)
\`\`\`

## 生命周期

### 选项式 vs 组合式

| 选项式 API | 组合式 API |
|-----------|-----------|
| beforeCreate | setup() |
| created | setup() |
| beforeMount | onBeforeMount |
| mounted | onMounted |

## 总结

Vue3 带来了更好的 TypeScript 支持和更灵活的代码组织方式。
`
            },
            {
              id: 12,
              name: 'React 入门.md',
              type: 'file',
              updateTime: '2023-10-23 15:30',
              content: `# React 入门指南

## 什么是 React

React 是一个用于构建用户界面的 JavaScript 库。

## 核心概念

### JSX 语法

JSX 是 JavaScript 的语法扩展：

\`\`\`jsx
const element = <h1>Hello, world!</h1>
\`\`\`

### 组件

#### 函数组件

\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>
}
\`\`\`

#### 类组件

\`\`\`jsx
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>
  }
}
\`\`\`

## Hooks

### useState

\`\`\`jsx
const [count, setCount] = useState(0)
\`\`\`

### useEffect

用于处理副作用，如数据获取、订阅等。

## 最佳实践

1. 保持组件小而专注
2. 使用 PropTypes 进行类型检查
3. 合理使用 memo 优化性能
`
            }
          ]
        },
        {
          id: 2,
          name: '项目需求文档.md',
          type: 'file',
          updateTime: '2023-10-23 15:30',
          content: `# 项目需求文档

## 项目概述

本项目是一个在线 Markdown 笔记应用。

## 功能需求

### 用户管理

#### 登录注册

- 支持用户名密码登录
- 支持第三方登录（微信、GitHub）

#### 个人设置

- 修改密码
- 修改头像

### 笔记管理

#### 文件操作

- 新建文件/文件夹
- 重命名
- 删除
- 移动

#### 编辑功能

- Markdown 实时预览
- 代码高亮
- 图片上传

### 大纲功能

- 自动提取标题生成大纲
- 支持展开/折叠
- 点击跳转

## 非功能需求

### 性能要求

- 首屏加载 < 3s
- 编辑响应 < 100ms

### 兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+

## 开发计划

| 阶段 | 内容 | 时间 |
|-----|------|-----|
| 第一阶段 | 基础框架搭建 | 1周 |
| 第二阶段 | 核心功能开发 | 2周 |
| 第三阶段 | 测试优化 | 1周 |
`
        },
        {
          id: 3,
          name: '会议记录_2023.md',
          type: 'file',
          updateTime: '2023-10-22 09:20',
          content: `# 2023年度会议记录

## Q4 季度会议

### 10月15日 周会

**参会人员**: 张三、李四、王五

**会议内容**:

1. 项目进度汇报
2. 下周工作安排
3. 问题讨论

### 10月22日 周会

**待办事项**:

- [ ] 完成需求文档
- [ ] 代码评审
- [x] 环境部署

## Q3 季度会议

### 季度总结

本季度完成了以下工作：

1. 完成了 v1.0 版本开发
2. 用户量增长 50%
3. 修复了 20+ 个 bug

### 下季度规划

重点工作：
- 性能优化
- 新功能开发
- 用户体验改进
`
        }
      ]
    },
    {
      id: 2,
      name: '个人日记',
      description: '记录日常生活和想法',
      icon: '📝',
      updateTime: '2023-10-20 18:00',
      files: []
    },
    {
      id: 3,
      name: '工作项目',
      description: '工作相关的文档和笔记',
      icon: '💼',
      updateTime: '2023-10-18 09:00',
      files: []
    }
  ])

  // 当前选中的项目
  const currentProjectId = ref(null)

  const currentProject = () => {
    return projectList.value.find(p => p.id === currentProjectId.value)
  }

  const setCurrentProject = (id) => {
    currentProjectId.value = id
  }

  const getProject = (id) => {
    return projectList.value.find(p => p.id === id)
  }

  const addProject = (project) => {
    projectList.value.unshift(project)
  }

  const updateProject = (id, data) => {
    const project = projectList.value.find(p => p.id === id)
    if (project) {
      Object.assign(project, data)
    }
  }

  const deleteProject = (id) => {
    const index = projectList.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projectList.value.splice(index, 1)
    }
    if (currentProjectId.value === id) {
      currentProjectId.value = null
    }
  }

  return {
    projectList,
    currentProjectId,
    currentProject,
    setCurrentProject,
    getProject,
    addProject,
    updateProject,
    deleteProject
  }
})
