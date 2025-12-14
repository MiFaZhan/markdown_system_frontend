import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFilesStore = defineStore('files', () => {
  const fileList = ref([
    {
      id: 1,
      name: '学习笔记',
      type: 'folder',
      updateTime: '2023-10-24 10:00',
      children: [
        { id: 11, name: 'Vue3 学习笔记.md', type: 'file', updateTime: '2023-10-24 10:00', content: '## Vue3 学习笔记\n\n- 组合式API\n- 响应式系统' },
        { id: 12, name: 'React 入门.md', type: 'file', updateTime: '2023-10-23 15:30', content: '# React 入门\n\n学习React...' }
      ]
    },
    { id: 2, name: '项目需求文档.md', type: 'file', updateTime: '2023-10-23 15:30', content: '# 项目需求文档\n\n这是项目需求...' },
    { id: 3, name: '会议记录_2023.md', type: 'file', updateTime: '2023-10-22 09:20', content: '# 会议记录\n\n会议内容...' },
  ])

  // 递归查找文件
  function findFile(list, id) {
    for (const item of list) {
      if (item.id === Number(id)) return item
      if (item.children) {
        const found = findFile(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  // 递归删除文件
  function removeFile(list, id) {
    const index = list.findIndex(f => f.id === Number(id))
    if (index !== -1) {
      list.splice(index, 1)
      return true
    }
    for (const item of list) {
      if (item.children && removeFile(item.children, id)) return true
    }
    return false
  }

  function addFile(file, parentId = null) {
    if (parentId) {
      const parent = findFile(fileList.value, parentId)
      if (parent && parent.type === 'folder') {
        parent.children = parent.children || []
        parent.children.unshift(file)
        return
      }
    }
    fileList.value.unshift(file)
  }

  function getFile(id) {
    return findFile(fileList.value, id)
  }

  function updateFile(id, data) {
    const file = findFile(fileList.value, id)
    if (file) {
      Object.assign(file, data)
    }
  }

  function deleteFile(id) {
    removeFile(fileList.value, id)
  }

  return { fileList, addFile, getFile, updateFile, deleteFile }
})
