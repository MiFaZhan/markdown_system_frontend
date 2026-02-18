<template>
  <el-dialog
    title="回收站"
    :model-value="visible"
    width="600px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
    @open="fetchDeletedNodes"
  >
    <div v-loading="loading" class="recycle-bin-container">
      <div v-if="nodes.length === 0" class="empty-state">
        <el-empty description="回收站是空的" :image-size="100" />
      </div>
      <el-tree
        v-else
        :data="nodes"
        node-key="id"
        default-expand-all
        :props="{ label: 'name', children: 'children' }"
        class="recycle-tree"
      >
        <template #default="{ node, data }">
          <div class="custom-tree-node">
            <span class="node-content">
              <el-icon class="node-icon">
                <Folder v-if="data.type === 'folder'" />
                <Document v-else />
              </el-icon>
              <span class="node-label">{{ data.name }}</span>
              <span class="node-time">{{ formatTime(data.updateTime) }}</span>
            </span>
            <span class="node-actions">
              <el-button
                type="primary"
                link
                size="small"
                class="action-btn"
                @click.stop="handleRestore(data)"
              >
                恢复
              </el-button>
              <el-popconfirm
                title="确定要彻底删除吗？"
                confirm-button-text="彻底删除"
                cancel-button-text="取消"
                confirm-button-type="danger"
                width="220"
                @confirm="handlePhysicalDelete(data)"
              >
                <template #reference>
                  <el-button type="danger" link size="small" class="action-btn" @click.stop>
                    彻底删除
                  </el-button>
                </template>
                <template #default>
                  <div class="popconfirm-content">
                    <p class="warning-text">此操作不可逆！</p>
                    <p>删除后文件将无法找回。</p>
                  </div>
                </template>
              </el-popconfirm>
            </span>
          </div>
        </template>
      </el-tree>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="emit('update:visible', false)">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { Folder, Document } from '@element-plus/icons-vue'
import { getRecycleBinTree, restoreNode, physicalDeleteNode } from '../../api/nodeService'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['update:visible', 'restore'])

const loading = ref(false)
const nodes = ref([])

const fetchDeletedNodes = async () => {
  if (!props.projectId) return
  loading.value = true
  try {
    const res = await getRecycleBinTree(props.projectId)
    // 根据 request.js 封装，res 可能是直接的数据或者包含 code 的对象
    // 通常 axios 响应拦截器会处理，这里假设 request.js 返回的是 response.data
    // 如果后端标准结构是 { code: 200, data: { ... } }

    // 检查 res 结构
    const data = res.data || res

    // 如果有 code 且不是 200，说明业务失败
    if (res.code && res.code !== 200) {
      ElMessage.error(res.message || '获取回收站数据失败')
      return
    }

    // 解析 NodeTreeVO
    // 后端返回的结构是 NodeTreeVO { rootNodes: [...] }
    if (data && data.rootNodes) {
      nodes.value = convertNodeTree(data.rootNodes)
    } else if (Array.isArray(data)) {
      // 兼容直接返回数组的情况（虽然 VO 不是这样）
      nodes.value = convertNodeTree(data)
    } else {
      nodes.value = []
    }
  } catch (error) {
    console.error('Fetch recycle bin error:', error)
    ElMessage.error('获取回收站数据失败')
  } finally {
    loading.value = false
  }
}

const convertNodeTree = (nodeList) => {
  return nodeList.map((node) => ({
    id: node.nodeId,
    name: node.nodeName,
    type: node.nodeType === 0 ? 'folder' : 'file',
    updateTime: node.updateTime,
    children: node.children ? convertNodeTree(node.children) : []
  }))
}

const handleRestore = async (node) => {
  try {
    // request.js 直接返回 data.data，如果后端返回 void，则这里可能为 null/undefined
    // request.js 内部已经处理了 code !== 200 的抛错情况
    await restoreNode(node.id)
    ElMessage.success('恢复成功')
    // 刷新列表
    await fetchDeletedNodes()
    // 通知父组件刷新文件树
    emit('restore')
  } catch (error) {
    console.error('Restore error:', error)
    // request.js 抛出的 error 可能是 Error 对象，message 属性包含后端错误信息
    ElMessage.error(error.message || '恢复失败')
  }
}

const handlePhysicalDelete = async (node) => {
  try {
    // request.js 直接返回 data.data
    // request.js 内部已经处理了 code !== 200 的抛错情况
    await physicalDeleteNode(node.id)
    ElMessage.success('彻底删除成功')
    await fetchDeletedNodes()
  } catch (error) {
    console.error('Physical delete error:', error)
    ElMessage.error(error.message || '删除失败')
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString()
}
</script>

<style>
.popconfirm-content {
  padding: 8px 0;
}
.popconfirm-content p {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.4;
}
.warning-text {
  color: #f56c6c;
  font-weight: bold;
}
</style>

<style scoped>
.recycle-bin-container {
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  flex: 1;
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-time {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
  min-width: 140px;
}

.node-actions {
  display: flex;
  gap: 12px;
  /* opacity: 0; */
  /* transition: opacity 0.2s; */
  padding-left: 12px;
}

/* .custom-tree-node:hover .node-actions {
  opacity: 1;
} */

.action-btn {
  padding: 0 4px;
  font-weight: normal;
  background: none !important;
  border: none !important;
}

.action-btn:hover,
.action-btn:focus,
.action-btn:active {
  background: none !important;
  color: inherit !important; /* 保持原有颜色，或者指定颜色 */
  text-decoration: underline;
}

/* 针对特定类型的按钮保持颜色 */
.action-btn.el-button--primary {
  color: var(--el-color-primary) !important;
}
.action-btn.el-button--primary:hover {
  color: var(--el-color-primary) !important;
}

.action-btn.el-button--danger {
  color: var(--el-color-danger) !important;
}
.action-btn.el-button--danger:hover {
  color: var(--el-color-danger) !important;
}

:deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 4px;
}

:deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

.node-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  color: #909399;
}

@media (max-width: 700px) {
  .recycle-bin-container {
    max-height: 60vh;
  }

  .custom-tree-node {
    padding-right: 4px;
  }

  .node-time {
    display: none;
  }

  .node-actions {
    opacity: 1;
    gap: 8px;
    padding-left: 8px;
  }

  .action-btn {
    font-size: 13px;
    padding: 0 2px;
  }
}
</style>
