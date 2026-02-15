<template>
  <div class="login-wrapper">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>系统登录</h2>
        </div>
      </template>
      <el-form :model="form" label-width="0">
        <el-form-item>
          <el-input v-model="form.account" placeholder="请输入用户名或邮箱" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="w-100" :loading="loading" @click="handleLogin"
            >登录</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const store = useUserStore()
const router = useRouter()
const loading = ref(false)

const form = reactive({
  account: '',
  password: ''
})

const handleLogin = async () => {
  if (!form.account || !form.password) return ElMessage.warning('请输入账号和密码')

  loading.value = true
  try {
    await store.login(form.account, form.password)
    ElMessage.success('登录成功')
    router.push('/index')
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #722ed1 0%, #1890ff 100%);
}
.login-card {
  width: 400px;
  background-color: var(--color-background);
}
.card-header {
  text-align: center;
  color: var(--color-text);
}
.w-100 {
  width: 100%;
}
.tips {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: 10px;
}

/* Dark Reader 风格深色模式 */
@media (prefers-color-scheme: dark) {
  .login-wrapper {
    background: linear-gradient(135deg, #3d1a6d 0%, #1a4a7a 100%);
  }

  .login-card {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }
}
</style>
