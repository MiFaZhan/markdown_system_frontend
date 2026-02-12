<template>
  <main class="editor-area">
    <TabsBar
      :tabs="tabs"
      :active-index="activeIndex"
      :show-sidebar="showSidebar"
      :show-outline="showOutline"
      @switch-tab="emit('switch-tab', $event)"
      @close-tab="emit('close-tab', $event)"
      @close-others="emit('close-others', $event)"
      @close-all="emit('close-all')"
      @toggle-sidebar="emit('toggle-sidebar')"
      @toggle-outline="emit('toggle-outline')"
      @reorder-tabs="emit('reorder-tabs', $event)"
    />
    
    <div id="editor-container" class="editor-container">
      <div v-if="tabs.length === 0" class="empty-state">
        <el-icon :size="64" :color="'var(--el-text-color-placeholder)'">
          <Document />
        </el-icon>
        <p>选择一个文件开始编辑</p>
      </div>
    </div>
  </main>
</template>

<script setup>
import { Document } from '@element-plus/icons-vue'
import TabsBar from '../TabsBar.vue'

const props = defineProps({
  tabs: Array,
  activeIndex: Number,
  showSidebar: Boolean,
  showOutline: Boolean
})

const emit = defineEmits(['switch-tab', 'close-tab', 'close-others', 'close-all', 'toggle-sidebar', 'toggle-outline', 'reorder-tabs'])
</script>

<style scoped>
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-background);
}

#editor-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.vditor-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
