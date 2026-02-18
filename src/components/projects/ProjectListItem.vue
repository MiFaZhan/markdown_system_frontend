<template>
  <div class="project-list-item" @click="$emit('click', project)">
    <div class="list-icon">{{ project.icon }}</div>
    <div class="list-name">{{ project.name }}</div>
    <div class="list-date">{{ formatDate(project.creationTime) }}</div>
    <div class="list-update">{{ formatDate(project.updateTime) }}</div>
    <div class="list-desc">{{ project.description || '' }}</div>
    <div class="list-actions">
      <el-dropdown trigger="click" @command="handleCommand">
        <el-button type="text" :icon="MoreFilled" @click.stop />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="edit">编辑项目</el-dropdown-item>
            <el-dropdown-item command="share">分享项目</el-dropdown-item>
            <el-dropdown-item command="delete">删除项目</el-dropdown-item>
            <el-dropdown-item command="view" divided>属性</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { MoreFilled } from '@element-plus/icons-vue'

defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'edit', 'share', 'delete', 'view'])

function formatDate(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .replace(/\//g, '-')
}

function handleCommand(command) {
  emit(command)
}
</script>

<style scoped>
.project-list-item {
  display: grid;
  grid-template-columns: 40px 220px 130px 130px 300px 50px;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--el-border-color-lighter);
  min-height: 48px;
}

.project-list-item:last-child {
  border-bottom: none;
}

.project-list-item:hover {
  background: var(--el-fill-color-light);
  border-left: 3px solid var(--el-color-primary);
  padding-left: 17px;
}

.project-list-item:active {
  background: var(--el-fill-color);
}

.list-icon {
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.list-name {
  font-size: 14px;
  color: var(--color-heading);
  font-weight: 500;
  padding: 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.list-date {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 0 6px;
  text-align: left;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.list-update {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 0 6px;
  text-align: left;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.list-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 0 6px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.list-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.list-actions .el-button {
  padding: 6px;
  font-size: 14px;
  border: none;
  background: transparent;
  color: var(--el-text-color-placeholder);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.list-actions .el-button:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .project-list-item {
    grid-template-columns: 40px 1fr 50px;
    min-height: 46px;
    padding: 10px 12px;
  }

  .list-date,
  .list-update,
  .list-desc {
    display: none;
  }

  .list-actions .el-button {
    width: 28px;
    height: 28px;
    padding: 6px;
  }

  .list-name {
    font-size: 14px;
  }
}

@media (prefers-color-scheme: dark) {
  .list-actions .el-button:hover {
    background: rgba(92, 154, 255, 0.15);
  }
}
</style>
