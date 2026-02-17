<template>
  <el-dialog
    :model-value="visible"
    :title="editingProject ? '编辑项目' : '新建项目'"
    width="400px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="projectForm" :rules="formRules" label-width="80px">
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
      </el-form-item>
      <el-form-item label="项目图标">
        <div class="icon-form-item">
          <el-input
            v-model="projectForm.icon"
            placeholder="请输入项目图标（支持 Emoji 表情）"
          />
          <div class="icon-hint">项目图标支持使用任意 Emoji 表情</div>
          <div class="icon-selector">
            <div
              v-for="icon in iconList"
              :key="icon"
              class="icon-option"
              :class="{ active: projectForm.icon === icon }"
              @click="projectForm.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="项目描述">
        <el-input
          v-model="projectForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入项目描述"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editingProject: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'save'])

const formRef = ref()
const submitLoading = ref(false)

const projectForm = ref({
  name: '',
  icon: '📁',
  description: ''
})

const formRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 1, max: 50, message: '项目名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

const iconList = ['📁', '📚', '💼', '🎯', '🚀', '⭐', '🔥', '💡', '🎨', '🔧', '📊', '🌟']

watch(
  () => props.editingProject,
  (newVal) => {
    if (newVal) {
      projectForm.value = {
        name: newVal.name,
        icon: newVal.icon,
        description: newVal.description
      }
    } else {
      projectForm.value = {
        name: '',
        icon: '📁',
        description: ''
      }
    }
  }
)

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && !props.editingProject) {
      projectForm.value = {
        name: '',
        icon: '📁',
        description: ''
      }
      nextTick(() => {
        formRef.value?.clearValidate()
      })
    }
  }
)

async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    emit('save', projectForm.value)
  } catch (error) {}
}
</script>

<style scoped>
.icon-form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.icon-selector {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  max-width: 240px;
}

.icon-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.3s;
}

.icon-option:hover {
  border-color: var(--el-color-primary);
}

.icon-option.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}
</style>
