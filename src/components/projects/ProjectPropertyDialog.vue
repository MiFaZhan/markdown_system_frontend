<template>
  <el-dialog
    :model-value="visible"
    title="项目属性"
    width="500px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="loading" class="property-loading">
      <el-skeleton :rows="6" animated />
    </div>
    <div v-else-if="project" class="project-property">
      <div class="property-item">
        <label class="property-label">项目图标：</label>
        <span class="property-value">{{ project.icon }}</span>
      </div>
      <div class="property-item">
        <label class="property-label">项目名称：</label>
        <span class="property-value">{{ project.projectName }}</span>
      </div>
      <div class="property-item">
        <label class="property-label">创建时间：</label>
        <span class="property-value">{{ formatTime(project.creationTime) }}</span>
      </div>
      <div class="property-item">
        <label class="property-label">更新时间：</label>
        <span class="property-value">{{ formatTime(project.updateTime) }}</span>
      </div>
      <div class="property-item">
        <label class="property-label">项目描述：</label>
        <span class="property-value">{{ project.description || '暂无描述' }}</span>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:visible'])

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.property-loading {
  padding: 20px;
}

.project-property {
  padding: 10px 0;
}

.property-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  line-height: 1.5;
}

.property-label {
  font-weight: 600;
  color: var(--el-text-color-secondary);
  width: 100px;
  flex-shrink: 0;
  text-align: right;
  margin-right: 16px;
}

.property-value {
  color: var(--color-text);
  flex: 1;
  word-break: break-word;
}

@media (max-width: 768px) {
  .property-item {
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
  }

  .property-label {
    width: 100%;
    text-align: left;
    margin-right: 0;
  }
}
</style>
