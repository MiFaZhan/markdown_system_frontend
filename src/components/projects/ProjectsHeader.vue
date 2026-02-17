<template>
  <header class="projects-header">
    <div class="header-left">
      <span class="logo">My Notes</span>
    </div>
    <div class="header-right">
      <el-tooltip :content="themeStore.getThemeTooltip()" placement="bottom">
        <button class="theme-toggle-btn" aria-label="切换主题" @click="handleThemeToggle">
          <component :is="themeIconComponent" class="theme-icon" />
        </button>
      </el-tooltip>

      <el-dropdown
        ref="dropdownRef"
        placement="bottom-end"
        :hide-on-click="true"
        trigger="click"
        @command="handleCommand"
      >
        <div class="user-avatar-container">
          <el-avatar :size="40" :icon="UserFilled" class="user-avatar" />
          <div class="username-tooltip">
            {{ userStore.userInfo?.username || '用户' }}
          </div>
        </div>
        <template #dropdown>
          <el-dropdown-menu class="custom-dropdown-menu">
            <el-dropdown-item command="profile">
              <div class="dropdown-item-content">
                <span>个人资料</span>
              </div>
            </el-dropdown-item>
            <el-dropdown-item v-if="userStore.userInfo?.roleId === 1" command="userManagement">
              <div class="dropdown-item-content">
                <span>用户管理</span>
              </div>
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <div class="dropdown-item-content logout-item">
                <span>退出登录</span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-dialog
      v-model="profileDialogVisible"
      title="个人资料"
      width="500px"
      @close="handleProfileDialogClose"
    >
      <div v-if="displayUserInfo" class="profile-content">
        <div class="profile-avatar">
          <el-avatar :size="80" :icon="UserFilled" />
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户ID">
            {{ displayUserInfo.userId }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ displayUserInfo.username }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ displayUserInfo.email || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="角色">
            {{ userStore.getRoleName(displayUserInfo.roleId) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(displayUserInfo.status)">
              {{ getStatusText(displayUserInfo.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="userStore.getRoleById(displayUserInfo.roleId)" label="权限">
            <div class="permissions-tags">
              <el-tag
                v-for="permission in userStore.getRoleById(displayUserInfo.roleId).permissions"
                :key="permission"
                type="info"
                size="small"
                class="permission-tag"
              >
                {{ translatePermission(permission) }}
              </el-tag>
              <span
                v-if="!userStore.getRoleById(displayUserInfo.roleId).permissions?.length"
                class="no-permissions"
              >
                暂无权限
              </span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="displayUserInfo.description" label="描述">
            {{ displayUserInfo.description }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <div v-else class="profile-loading">
        <el-icon class="is-loading" :size="32">
          <Loading />
        </el-icon>
        <span>加载中...</span>
      </div>
    </el-dialog>

    <UserManagementDialog v-model="userManagementVisible" />
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { useThemeStore } from '../../stores/theme'
import { UserFilled, Loading, Sunny, Moon, Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import UserManagementDialog from './UserManagementDialog.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()
const dropdownRef = ref(null)
const profileDialogVisible = ref(false)
const userManagementVisible = ref(false)
const displayUserInfo = ref(null)

const themeIconComponent = computed(() => {
  switch (themeStore.currentTheme) {
    case 'light':
      return Sunny
    case 'dark':
      return Moon
    case 'auto':
      return Monitor
    default:
      return Sunny
  }
})

function handleThemeToggle() {
  themeStore.cycleTheme()
}

function handleCommand(command) {
  switch (command) {
    case 'profile':
      handleShowProfile()
      break
    case 'userManagement':
      userManagementVisible.value = true
      break
    case 'logout':
      userStore.logout()
      break
  }
}

  async function handleShowProfile() {
  profileDialogVisible.value = true

  try {
    if (!userStore.userInfo) {
      await userStore.fetchUserInfo()
    }

    if (!userStore.roleList) {
      await userStore.fetchRoleList()
    }
    
    // 强制重新赋值以触发响应式更新
    displayUserInfo.value = { ...userStore.userInfo }
  } catch (error) {
    ElMessage.error('获取信息失败')
    profileDialogVisible.value = false
  }
}

function handleProfileDialogClose() {
  displayUserInfo.value = null
}

function getStatusType(status) {
  const statusMap = {
    1: 'success',
    0: 'danger'
  }
  return statusMap[status] || 'info'
}

function getStatusText(status) {
  const statusMap = {
    1: '启用',
    0: '禁用'
  }
  return statusMap[status] || '未知'
}

function translatePermission(permission) {
  const permissionMap = {
    'user:manage': '用户管理',
    'project:*': '项目管理',
    'project:create': '创建项目',
    'project:read': '查看项目',
    'project:update': '更新项目',
    'project:delete': '删除项目',
    'node:*': '节点管理',
    'node:create': '创建节点',
    'node:read': '查看节点',
    'node:update': '更新节点',
    'node:delete': '删除节点',
    'content:*': '内容管理',
    'content:create': '创建内容',
    'content:read': '查看内容',
    'content:update': '更新内容',
    'content:delete': '删除内容'
  }
  return permissionMap[permission] || permission
}

function handleKeydown(event) {
  if (event.key === 'Escape' && dropdownRef.value) {
    dropdownRef.value.handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  flex-shrink: 0;
}

.theme-toggle-btn:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  transform: translateY(-1px);
}

.theme-toggle-btn:active {
  transform: translateY(0);
}

.theme-icon {
  width: 20px;
  height: 20px;
}

.user-avatar-container {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.user-avatar:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.username-tooltip {
  margin-left: 12px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  font-weight: 500;
  white-space: nowrap;
}

.custom-dropdown-menu {
  border-radius: 6px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  background: #fff !important;
  padding: 8px 0 !important;
  min-width: 180px !important;
  max-width: 240px !important;
  animation: dropdownFadeIn 0.2s ease-out;
  overflow: visible !important;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-dropdown-menu :deep(.el-dropdown-menu__item) {
  padding: 10px 16px !important;
  margin: 0 !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
  color: #333 !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
}

.custom-dropdown-menu :deep(.el-dropdown-menu__item:hover) {
  background: rgba(102, 126, 234, 0.08) !important;
  color: #667eea !important;
  transform: translateX(2px);
}

.custom-dropdown-menu :deep(.el-dropdown-menu__item.is-disabled) {
  color: #999 !important;
  cursor: not-allowed !important;
}

.dropdown-item-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.dropdown-item-content span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-item span {
  color: #f56c6c !important;
}

.custom-dropdown-menu :deep(.el-dropdown-menu__item.logout-item:hover) {
  background: rgba(245, 108, 108, 0.08) !important;
}

.custom-dropdown-menu :deep(.el-dropdown-menu__item.logout-item:hover .dropdown-item-content span) {
  color: #f56c6c !important;
}

.custom-dropdown-menu :deep(.el-dropdown-menu__item--divided) {
  border-top: 1px solid rgba(0, 0, 0, 0.06) !important;
  margin-top: 4px !important;
  padding-top: 10px !important;
}

@media (max-width: 768px) {
  .custom-dropdown-menu {
    max-width: 180px !important;
    min-width: 150px !important;
  }

  .custom-dropdown-menu :deep(.el-dropdown-menu__item) {
    padding: 8px 12px !important;
    font-size: 13px !important;
  }

  .projects-header {
    padding: 16px 20px;
  }

  .logo {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .custom-dropdown-menu {
    animation: none;
  }

  .custom-dropdown-menu :deep(.el-dropdown-menu__item) {
    transition: none;
  }
}

@media (prefers-color-scheme: dark) {
  .custom-dropdown-menu {
    background: var(--dr-bg-elevated) !important;
    border: 1px solid var(--dr-border) !important;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5) !important;
  }

  .custom-dropdown-menu :deep(.el-dropdown-menu__item) {
    color: var(--dr-text-primary) !important;
  }

  .custom-dropdown-menu :deep(.el-dropdown-menu__item:hover) {
    background: var(--dr-bg-hover) !important;
    color: var(--dr-accent) !important;
  }

  .custom-dropdown-menu :deep(.el-dropdown-menu__item.is-disabled) {
    color: var(--dr-text-muted) !important;
  }

  .custom-dropdown-menu :deep(.el-dropdown-menu__item--divided) {
    border-top: 1px solid var(--dr-border) !important;
  }

  .logout-item span {
    color: var(--dr-danger) !important;
  }

  .custom-dropdown-menu :deep(.el-dropdown-menu__item.logout-item:hover) {
    background: rgba(217, 100, 89, 0.15) !important;
  }

  .custom-dropdown-menu
    :deep(.el-dropdown-menu__item.logout-item:hover .dropdown-item-content span) {
    color: var(--dr-danger-hover) !important;
  }
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.profile-avatar {
  margin-bottom: 10px;
}

.profile-avatar .el-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 32px;
}

.profile-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
}

@media (prefers-color-scheme: dark) {
  .profile-content :deep(.el-descriptions) {
    --el-descriptions-table-border-color: var(--dr-border);
  }

  .profile-content :deep(.el-descriptions__label) {
    background-color: var(--dr-bg-tertiary) !important;
    color: var(--dr-text-secondary) !important;
  }

  .profile-content :deep(.el-descriptions__body) {
    background-color: var(--dr-bg-secondary);
    color: var(--dr-text-primary) !important;
  }

  .profile-content :deep(.el-descriptions__cell) {
    background-color: var(--dr-bg-secondary);
    border-color: var(--dr-border) !important;
  }

  .profile-content :deep(.el-tag--info) {
    background-color: rgba(92, 154, 255, 0.15) !important;
    border-color: rgba(92, 154, 255, 0.3) !important;
    color: var(--dr-accent) !important;
  }

  .profile-content :deep(.el-tag--info:hover) {
    background-color: rgba(92, 154, 255, 0.25) !important;
  }

  .permissions-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .permission-tag {
    margin: 0;
  }

  .no-permissions {
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}
</style>
