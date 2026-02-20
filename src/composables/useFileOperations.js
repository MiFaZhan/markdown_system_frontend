import { ElMessage, ElMessageBox } from 'element-plus'
import { createNode, updateNode, deleteNode, uploadMarkdownFile } from '../api/nodeService'

export function useFileOperations({ onRefresh, onCloseTab }) {
  const handleCreate = async (command, currentProjectId) => {
    if (!currentProjectId) {
      ElMessage.error('项目ID不存在，无法创建文件')
      return
    }

    if (command === 'file') {
      ElMessageBox.prompt('请输入文件名', '新建文件', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '文件名不能为空'
      })
        .then(async ({ value }) => {
          try {
            const fileName = value
            const nodeData = {
              projectId: currentProjectId,
              parentId: 0,
              nodeType: 1,
              nodeName: fileName
            }

            await createNode(nodeData)

            if (onRefresh) {
              await onRefresh()
            }
            ElMessage.success('文件创建成功')
          } catch (error) {
            ElMessage.error('创建文件失败')
          }
        })
        .catch(() => {})
    } else if (command === 'folder') {
      ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '文件夹名称不能为空'
      })
        .then(async ({ value }) => {
          try {
            const nodeData = {
              projectId: currentProjectId,
              parentId: 0,
              nodeType: 0,
              nodeName: value
            }

            await createNode(nodeData)

            if (onRefresh) {
              await onRefresh()
            }
            ElMessage.success('文件夹创建成功')
          } catch (error) {
            ElMessage.error('创建文件夹失败')
          }
        })
        .catch(() => {})
    }
  }

  const handleUploadMarkdown = async (currentProjectId) => {
    if (!currentProjectId) {
      ElMessage.error('项目ID不存在，无法上传文件')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) {
        return
      }

      if (!file.name.toLowerCase().endsWith('.md')) {
        ElMessage.error('仅支持上传.md格式的文件')
        return
      }

      try {
        await uploadMarkdownFile(file, currentProjectId)

        if (onRefresh) {
          await onRefresh()
        }

        ElMessage.success('上传成功')
      } catch (error) {
        ElMessage.error(error.message || '上传失败')
      }
    }
    input.click()
  }

  const collectFileIds = (node) => {
    const ids = []
    if (node.type === 'file') {
      ids.push(node.id)
    } else if (node.children) {
      for (const child of node.children) {
        ids.push(...collectFileIds(child))
      }
    }
    return ids
  }

  const handleDelete = async (file, currentFileId, currentSelectedNodeId) => {
    const msg = file.type === 'folder' ? '确定要删除该文件夹及其所有内容吗?' : '确定要删除该文件吗?'
    ElMessageBox.confirm(msg, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          if (currentFileId === file.id) {
            currentFileId.value = null
          }
          if (currentSelectedNodeId.value === file.id) {
            currentSelectedNodeId.value = null
          }

          await deleteNode(file.id)

          if (onCloseTab) {
            const fileIds = collectFileIds(file)
            for (const fileId of fileIds) {
              await onCloseTab(fileId)
            }
          }

          if (onRefresh) {
            await onRefresh()
          }
          ElMessage.success('删除成功')
        } catch (error) {
          ElMessage.error('删除失败')
        }
      })
      .catch(() => {})
  }

  const handleRename = async (file) => {
    const title = '重命名'
    const placeholder = file.type === 'folder' ? '新的文件夹名称' : '新的文件名'
    ElMessageBox.prompt('', title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: placeholder,
      inputValue: file.type === 'file' ? file.name.replace(/\.md$/, '') : file.name,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空'
    })
      .then(async ({ value }) => {
        try {
          const newName = value.trim()

          const nodeData = {
            nodeId: file.id,
            nodeName: newName
          }

          await updateNode(nodeData)

          if (onRefresh) {
            await onRefresh()
          }
          ElMessage.success('重命名成功')
        } catch (error) {
          ElMessage.error('重命名失败')
        }
      })
      .catch(() => {})
  }

  const allowDrop = (draggingNode, dropNode, type) => {
    if (draggingNode.data.id === dropNode.data.id) {
      return false
    }

    const isDescendant = (parent, child) => {
      if (!parent.childNodes) return false
      for (const node of parent.childNodes) {
        if (node.data.id === child.data.id) {
          return true
        }
        if (isDescendant(node, child)) {
          return true
        }
      }
      return false
    }

    if (isDescendant(draggingNode, dropNode)) {
      return false
    }

    if (type === 'inner') {
      return dropNode.data.type === 'folder'
    }

    return true
  }

  const allowDrag = () => {
    return true
  }

  const handleDrop = async (draggingNode, dropNode, dropType) => {
    let parentId

    if (dropType === 'inner') {
      if (dropNode.data.type !== 'folder') {
        ElMessage.warning('只能拖到文件夹中')
        return false
      }
      parentId = dropNode.data.id
    } else if (dropType === 'before' || dropType === 'after') {
      parentId = dropNode.data.parentId
      if (parentId === null) {
        parentId = 0
      }
    } else {
      return false
    }

    try {
      const nodeData = {
        nodeId: draggingNode.data.id,
        parentId: parentId,
        nodeName: draggingNode.data.name
      }

      await updateNode(nodeData)

      ElMessage.success('移动成功')
      return true
    } catch (error) {
      ElMessage.error('移动失败')
      return false
    } finally {
      if (onRefresh) {
        await onRefresh()
      }
    }
  }

  return {
    handleCreate,
    handleDelete,
    handleRename,
    allowDrop,
    allowDrag,
    handleDrop,
    handleUploadMarkdown
  }
}
