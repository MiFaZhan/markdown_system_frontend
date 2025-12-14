import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProjectsStore } from './projects'

export const useFilesStore = defineStore('files', () => {
  const projectsStore = useProjectsStore()

  // 从当前项目获取文件列表
  const fileList = computed(() => {
    const project = projectsStore.currentProject()
    return project ? project.files : []
  })

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
    const index = list.findIndex((f) => f.id === Number(id))
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
    const project = projectsStore.currentProject()
    if (!project) return

    if (parentId) {
      const parent = findFile(project.files, parentId)
      if (parent && parent.type === 'folder') {
        parent.children = parent.children || []
        parent.children.unshift(file)
        return
      }
    }
    project.files.unshift(file)
  }

  function getFile(id) {
    const project = projectsStore.currentProject()
    if (!project) return null
    return findFile(project.files, id)
  }

  function updateFile(id, data) {
    const file = getFile(id)
    if (file) {
      Object.assign(file, data)
    }
  }

  function deleteFile(id) {
    const project = projectsStore.currentProject()
    if (!project) return
    removeFile(project.files, id)
  }

  return { fileList, addFile, getFile, updateFile, deleteFile }
})
