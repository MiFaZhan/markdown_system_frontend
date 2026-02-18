<template>
  <el-dialog
    title="创建分享链接"
    :model-value="visible"
    width="450px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item v-if="!targetId" label="选择项目" prop="targetId">
        <el-select
          v-model="form.targetId"
          placeholder="请选择要分享的项目"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="project in projectList"
            :key="project.id"
            :label="project.name"
            :value="project.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-else label="分享目标">
        <div class="target-info">
          <el-icon class="type-icon">
            <Folder v-if="form.targetType === 0" />
            <Document v-else-if="form.targetType === 1" />
            <Files v-else />
          </el-icon>
          <span>{{ targetName }}</span>
        </div>
      </el-form-item>
      <el-form-item label="访问密码" prop="password">
        <el-input v-model="form.password" placeholder="留空表示无密码" clearable />
      </el-form-item>
      <el-form-item label="过期时间" prop="expireTime">
        <el-date-picker
          v-model="form.expireTime"
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
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleCreate">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { Folder, Document, Files } from '@element-plus/icons-vue'
import { createShare } from '../../api/shareService'
import { getAllProjects } from '../../api/projectService'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  targetType: {
    type: Number,
    default: 2
  },
  targetId: {
    type: Number,
    default: null
  },
  targetName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'success'])

const formRef = ref(null)
const loading = ref(false)
const projectList = ref([])

const form = reactive({
  targetType: props.targetType,
  targetId: props.targetId,
  password: '',
  expireTime: null
})

const rules = {
  targetId: [{ required: true, message: '请选择要分享的项目', trigger: 'change' }]
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      form.targetType = props.targetType
      form.targetId = props.targetId
      form.password = ''
      form.expireTime = null
      if (!props.targetId) {
        fetchProjectList()
      }
    }
  }
)

const fetchProjectList = async () => {
  try {
    const res = await getAllProjects()
    projectList.value = res.data || res || []
  } catch (error) {
    console.error('Fetch project list error:', error)
  }
}

const disabledDate = (date) => {
  return date < new Date()
}

const handleCreate = async () => {
  if (!form.targetId) {
    ElMessage.warning('请选择要分享的项目')
    return
  }
  loading.value = true
  try {
    const data = {
      targetType: form.targetType,
      targetId: form.targetId,
      password: form.password || null,
      expireTime: form.expireTime || null
    }
    const res = await createShare(data)
    ElMessage.success('创建成功')
    emit('success', res.data || res)
    emit('update:visible', false)
  } catch (error) {
    console.error('Create share error:', error)
    ElMessage.error(error.message || '创建失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.target-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  font-size: 18px;
  color: #909399;
}
</style>
