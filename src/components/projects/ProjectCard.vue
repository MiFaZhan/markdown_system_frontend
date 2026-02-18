<template>
  <div class="project-card" @click="$emit('click', project)">
    <div class="project-actions">
      <el-dropdown trigger="click" @command="handleCommand">
        <button class="more-btn" @click.stop @mousedown.stop @touchstart.stop @touchend="blurBtn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
            <path
              fill="currentColor"
              d="M176 416a112 112 0 1 1 0 224 112 112 0 0 1 0-224m336 0a112 112 0 1 1 0 224 112 112 0 0 1 0-224m336 0a112 112 0 1 1 0 224 112 112 0 0 1 0-224"
            ></path>
          </svg>
        </button>
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
    <div class="project-content">
      <div class="project-icon">{{ project.icon }}</div>
      <h3 class="project-name">{{ project.name }}</h3>
    </div>
  </div>
</template>

<script setup>
function blurBtn(e) {
  const t = e.currentTarget
  // 延迟一个tick，确保下拉已触发后再移除焦点，避免高亮停留
  requestAnimationFrame(() => t.blur())
}

defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'edit', 'delete', 'view', 'share'])

function handleCommand(command) {
  emit(command)
}
</script>

<style scoped>
.project-card {
  background: transparent;
  border-radius: 4px;
  padding: 16px 12px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 140px;
  box-sizing: border-box;
  border: 1px solid transparent;
}

.project-card:hover {
  background: var(--el-fill-color);
}

.project-card:hover .more-btn {
  opacity: 1;
}

.project-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.project-icon {
  font-size: 64px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
}

.project-name {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
  max-width: 120px;
}

.project-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  flex-shrink: 0;
}

.more-btn {
  padding: 4px;
  font-size: 16px;
  border: none;
  background: transparent;
  color: var(--el-text-color-primary);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: all 0.15s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

@media (hover: hover) and (pointer: fine) {
  .more-btn {
    opacity: 0.3;
  }
}

.more-btn:hover {
  background: transparent;
  opacity: 1;
}

.more-btn:focus,
.more-btn:active {
  outline: none;
  box-shadow: none;
  background: transparent;
}

.more-btn svg {
  width: 14px;
  height: 14px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .project-card {
    min-height: 120px;
  }

  .more-btn {
    opacity: 1;
    width: 32px;
    height: 32px;
    padding: 6px;
  }

  .project-icon {
    font-size: 48px;
    width: 72px;
    height: 72px;
  }
}
</style>
