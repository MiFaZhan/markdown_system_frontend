<template>
  <div class="empty-state">
    <el-icon :size="64" :color="'var(--el-text-color-placeholder)'"><FolderOpened /></el-icon>
    <p>还没有项目，点击上方按钮创建</p>
  </div>
</template>

<script setup>
import { FolderOpened } from '@element-plus/icons-vue'
</script>

<style scoped>
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--el-text-color-placeholder);
}
</style>
