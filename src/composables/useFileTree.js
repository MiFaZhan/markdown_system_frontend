import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getNodeTree } from '../api/nodeService'
import { useProjectsStore } from '../stores/projects'

export function useFileTree(route) {
  const treeRef = ref(null)
  const fileTree = ref([])
  const loading = ref(false)
  const searchKeyword = ref('')
  const currentProjectName = ref('')
  const currentSelectedNodeId = ref(null)

  const projectsStore = useProjectsStore()
  const currentProjectId = computed(() => projectsStore.currentProjectId)

  const convertNodeTreeToFileTree = (nodeTreeResponse) => {
    if (!nodeTreeResponse || !nodeTreeResponse.rootNodes) return []

    const convertNodeItem = (nodeItem) => ({
      id: nodeItem.nodeId,
      parentId: nodeItem.parentId,
      name: nodeItem.nodeName,
      type: nodeItem.nodeType === 0 ? 'folder' : 'file',
      updateTime: nodeItem.updateTime,
      creationTime: nodeItem.creationTime,
      children: nodeItem.children?.map(convertNodeItem) || []
    })

    return nodeTreeResponse.rootNodes.map(convertNodeItem)
  }

  const loadNodeTree = async () => {
    if (!currentProjectId.value) {
      return
    }

    try {
      loading.value = true
      const treeResponse = await getNodeTree(currentProjectId.value)

      if (treeResponse.projectName) {
        currentProjectName.value = treeResponse.projectName
      }

      fileTree.value = convertNodeTreeToFileTree(treeResponse)
    } catch (error) {
      ElMessage.error('加载文件树失败')
    } finally {
      loading.value = false
    }
  }

  const filterFileTree = (nodes, keyword) => {
    if (!keyword) return nodes

    const lowerKeyword = keyword.toLowerCase()

    const filterNode = (node) => {
      const nodeName = node.name.toLowerCase()
      const nameMatches = nodeName.includes(lowerKeyword)

      const filteredChildren = node.children ? node.children.map(filterNode).filter(Boolean) : []

      if (nameMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        }
      }

      return null
    }

    return nodes.map(filterNode).filter(Boolean)
  }

  const filteredFileTree = computed(() => {
    return filterFileTree(fileTree.value, searchKeyword.value)
  })

  const searchResultCount = computed(() => {
    if (!searchKeyword.value) return 0

    const countNodes = (nodes) => {
      let count = 0
      for (const node of nodes) {
        if (
          node.type === 'file' &&
          node.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
        ) {
          count++
        }
        if (node.children) {
          count += countNodes(node.children)
        }
      }
      return count
    }

    return countNodes(filteredFileTree.value)
  })

  const findFileById = (fileList, id) => {
    for (const file of fileList) {
      if (file.id === id) return file
      if (file.children) {
        const found = findFileById(file.children, id)
        if (found) return found
      }
    }
    return null
  }

  watch(
    () => route.params.projectId,
    async (newProjectId) => {
      if (newProjectId) {
        currentSelectedNodeId.value = null
        currentProjectName.value = ''

        const projectId = parseInt(newProjectId)
        projectsStore.setCurrentProject(projectId)

        await nextTick()
        await loadNodeTree()
      }
    },
    { immediate: true }
  )

  return {
    treeRef,
    fileTree,
    loading,
    searchKeyword,
    currentProjectName,
    currentSelectedNodeId,
    currentProjectId,
    filteredFileTree,
    searchResultCount,
    loadNodeTree,
    findFileById
  }
}
