<template>
  <el-dialog
    :title="computedTitle"
    :model-value="visible"
    width="800px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
    @open="fetchShareList"
  >
    <div v-loading="loading" class="share-list-container">
      <div v-if="shareList.length === 0" class="empty-state">
        <el-empty description="暂无分享链接" :image-size="100" />
      </div>
      <el-table v-else :data="shareList" stripe table-layout="auto">
        <el-table-column prop="targetName" label="目标名称" min-width="140">
          <template #default="{ row }">
            <div class="target-name">
              <el-icon class="type-icon">
                <Folder v-if="row.targetType === 0" />
                <Document v-else-if="row.targetType === 1" />
                <Files v-else />
              </el-icon>
              <span>{{ row.targetName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="shareCode" label="分享码" width="120" />
        <el-table-column label="密码" width="80">
          <template #default="{ row }">
            <span v-if="row.hasPassword">{{ row.password || '******' }}</span>
            <span v-else class="no-password">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="expireTime" label="过期时间" width="150">
          <template #default="{ row }">
            <span v-if="row.expireTime" :class="{ 'expired': isExpired(row.expireTime) }">{{ formatTime(row.expireTime) }}</span>
            <span v-else class="no-expire">永不过期</span>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="访问次数" width="90" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="copyShareLink(row)">
              复制链接
            </el-button>
            <el-button type="primary" link size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-popconfirm
              title="确定要删除此分享链接吗？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              confirm-button-type="danger"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 编辑分享链接对话框 -->
  <el-dialog
    v-model="editDialogVisible"
    title="编辑分享链接"
    width="450px"
    destroy-on-close
  >
    <el-form :model="editForm" label-width="80px">
      <el-form-item label="访问密码">
        <el-input v-model="editForm.password" placeholder="留空表示清除密码" clearable />
      </el-form-item>
      <el-form-item label="过期时间">
        <el-date-picker
          v-model="editForm.expireTime"
          type="datetime"
          placeholder="留空表示永不过期"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
          :disabled-date="disabledDate"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="editLoading" @click="handleUpdateShare">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Folder, Document, Files } from '@element-plus/icons-vue'
import { getShareList, deleteShare, updateShare } from '../../api/shareService'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  targetType: {
    type: [Number, String, Array],
    default: null
  },
  title: {
    type: String,
    default: '分享链接管理'
  },
  projectId: {
    type: [Number, String],
    default: null
  },
  targetId: {
    type: [Number, String],
    default: null
  },
  targetName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'create'])

const computedTitle = computed(() => {
  if (props.targetName) {
    return `${props.title} - ${props.targetName}`
  }
  return props.title
})

const loading = ref(false)
const shareList = ref([])

const fetchShareList = async () => {
  loading.value = true
  try {
    const res = await getShareList(props.targetType, props.targetId)
    const data = res.data || res
    if (res.code && res.code !== 200) {
      ElMessage.error(res.message || '获取分享列表失败')
      return
    }
    shareList.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Fetch share list error:', error)
    ElMessage.error('获取分享列表失败')
  } finally {
    loading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await deleteShare(row.shareId)
    ElMessage.success('删除成功')
    await fetchShareList()
  } catch (error) {
    console.error('Delete share error:', error)
    ElMessage.error(error.message || '删除失败')
  }
}

const copyShareLink = (row) => {
  const baseUrl = window.location.origin
  const shareUrl = `${baseUrl}/share/${row.shareCode}`
  navigator.clipboard
    .writeText(shareUrl)
    .then(() => {
      ElMessage.success('链接已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败')
    })
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString()
}

const isExpired = (timeStr) => {
  if (!timeStr) return false
  const expireDate = new Date(timeStr)
  return expireDate < new Date()
}

// 编辑相关逻辑
const editDialogVisible = ref(false)
const editLoading = ref(false)
const editForm = reactive({
  shareId: null,
  password: '',
  expireTime: null
})

const disabledDate = (date) => {
  return date < new Date()
}

const openEditDialog = (row) => {
  editForm.shareId = row.shareId
  editForm.password = row.password || ''
  editForm.expireTime = row.expireTime || null
  editDialogVisible.value = true
}

const handleUpdateShare = async () => {
  editLoading.value = true
  try {
    const data = {
      shareId: editForm.shareId,
      password: editForm.password || '', // 空字符串表示清除密码
      expireTime: editForm.expireTime || null,
      clearExpireTime: !editForm.expireTime // 如果没有选时间，则清除过期时间
    }
    await updateShare(data)
    ElMessage.success('修改成功')
    editDialogVisible.value = false
    await fetchShareList()
  } catch (error) {
    console.error('Update share error:', error)
    ElMessage.error(error.message || '修改失败')
  } finally {
    editLoading.value = false
  }
}
</script>

<style scoped>
.share-list-container {
  min-height: 300px;
  max-height: 500px;
}

@media (min-width: 768px) {
  .share-list-container {
    overflow-x: visible;
    width: 100%;
  }

  :deep(.el-table) {
    width: 100% !important;
  }

  :deep(.el-table__header-wrapper),
  :deep(.el-table__body-wrapper) {
    overflow-x: visible !important;
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.target-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  font-size: 16px;
  color: #909399;
}

.no-password,
.no-expire {
  color: #909399;
}

.expired {
  color: #f56c6c;
}

:deep(.el-table .el-button.is-link) {
  background-color: transparent !important;
  background: transparent !important;
  border: none !important;
}

:deep(.el-table .el-button.is-link:hover),
:deep(.el-table .el-button.is-link:focus),
:deep(.el-table .el-button.is-link:active) {
  background-color: transparent !important;
  background: transparent !important;
  border: none !important;
}

@media (min-width: 768px) {
  :deep(.el-table__body-wrapper .el-scrollbar__wrap--hidden-default) {
    overflow-x: visible !important;
  }

  :deep(.el-scrollbar__bar.is-horizontal) {
    display: none !important;
  }
}
</style>
