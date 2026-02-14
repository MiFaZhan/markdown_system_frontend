<template>
  <header class="projects-header">
    <div class="header-left">
      <span class="logo">My Notes</span>
    </div>
    <div class="header-right">
      <el-button type="danger" link @click="userStore.logout">退出登录</el-button>
    </div>
  </header>
</template>

<script setup>
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
</script>

<style scoped>
.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.logo {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
}
</style>
