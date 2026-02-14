<template>
  <div class="projects-list">
    <div class="projects-list-header">
      <div class="header-icon"></div>
      <div class="header-name sortable-header" @click="$emit('handleListSort', 'project_name')">
        名称
        <el-icon v-if="isUserSorted && sortField === 'project_name'" class="sort-icon">
          <ArrowUp v-if="sortOrder === 'asc'" />
          <ArrowDown v-else />
        </el-icon>
      </div>
      <div class="header-date sortable-header" @click="$emit('handleListSort', 'creation_time')">
        创建时间
        <el-icon v-if="isUserSorted && sortField === 'creation_time'" class="sort-icon">
          <ArrowUp v-if="sortOrder === 'asc'" />
          <ArrowDown v-else />
        </el-icon>
      </div>
      <div class="header-update sortable-header" @click="$emit('handleListSort', 'update_time')">
        更新时间
        <el-icon v-if="isUserSorted && sortField === 'update_time'" class="sort-icon">
          <ArrowUp v-if="sortOrder === 'asc'" />
          <ArrowDown v-else />
        </el-icon>
      </div>
      <div class="header-desc">项目描述</div>
      <div class="header-actions"></div>
    </div>

    <ProjectListItem
      v-for="project in projects"
      :key="project.id"
      :project="project"
      @click="$emit('enterProject', project)"
      @edit="$emit('editProject', project)"
      @delete="$emit('deleteProject', project)"
      @view="$emit('viewProperty', project)"
    />
  </div>
</template>

<script setup>
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import ProjectListItem from './ProjectListItem.vue'

defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  sortField: {
    type: String,
    default: 'creation_time'
  },
  sortOrder: {
    type: String,
    default: 'asc'
  },
  isUserSorted: {
    type: Boolean,
    default: false
  }
})

defineEmits(['enterProject', 'editProject', 'deleteProject', 'viewProperty', 'handleListSort'])
</script>

<style scoped>
.projects-list {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 30px;
  box-shadow: var(--el-box-shadow-light);
}

.projects-list-header {
  display: grid;
  grid-template-columns: 40px 220px 130px 130px 300px 50px;
  align-items: center;
  padding: 12px 20px;
  background: var(--el-fill-color);
  border-bottom: 1px solid var(--el-border-color);
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  overflow: hidden;
}

.header-icon,
.header-name,
.header-date,
.header-update,
.header-desc,
.header-actions {
  padding: 0 6px;
}

.header-name {
  text-align: left;
}

.header-date {
  text-align: left;
}

.header-update {
  text-align: left;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border-radius: 4px;
  padding: 4px 6px !important;
  margin: -4px 0;
  position: relative;
  z-index: 1;
}

.sortable-header:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.sort-icon {
  font-size: 12px;
  opacity: 0.8;
}

@media (max-width: 1024px) {
  .projects-list-header {
    grid-template-columns: 40px 1fr 130px 130px 50px;
  }

  .header-desc {
    display: none;
  }
}

@media (prefers-color-scheme: dark) {
  .projects-list {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .sortable-header:hover {
    background: rgba(92, 154, 255, 0.15);
  }
}
</style>
