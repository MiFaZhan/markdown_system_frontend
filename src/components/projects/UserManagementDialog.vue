<template>
  <el-dialog
    :model-value="modelValue"
    title="用户管理"
    width="80%"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="user-management-header">
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名"
          clearable
          style="width: 200px; margin-right: 10px"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>
      <el-button type="success" @click="handleAdd">新增用户</el-button>
    </div>

    <el-table v-loading="loading" :data="userList" style="width: 100%; margin-top: 20px">
      <el-table-column prop="userId" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="roleId" label="角色">
        <template #default="{ row }">
          {{ getRoleName(row.roleId) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" show-overflow-tooltip />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleEdit(row)">编辑</el-button>
          <el-popconfirm
            title="确定删除该用户吗？此操作不可恢复！"
            confirm-button-text="确定"
            cancel-button-text="取消"
            confirm-button-type="danger"
            @confirm="handleDelete(row.userId)"
          >
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- User Edit/Create Dialog -->
    <el-dialog
      v-model="formVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      append-to-body
      width="500px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" :disabled="isEdit" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="角色" prop="roleId">
          <el-select v-model="formData.roleId" placeholder="选择角色" style="width: 100%">
            <el-option
              v-for="role in selectableRoles"
              :key="role.roleId"
              :label="role.roleName"
              :value="role.roleId"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>

        <el-form-item v-if="isEdit" label="新密码" prop="newPassword">
          <el-input
            v-model="formData.newPassword"
            type="password"
            show-password
            placeholder="不修改请留空"
          />
        </el-form-item>

        <el-form-item v-if="isEdit" label="状态" prop="status">
          <el-switch
            v-model="formData.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" placeholder="请输入描述信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { listUsers, register, updateUser, deleteUser } from '../../api/userService'
import { getRoleList } from '../../api/roleService'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue'])

// State
const loading = ref(false)
const userList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const roles = ref([])
const selectableRoles = computed(() => roles.value.filter((role) => role.roleCode !== 'guest'))

// Form State
const formVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const formData = reactive({
  userId: null,
  username: '',
  email: '',
  password: '',
  newPassword: '',
  roleId: null,
  status: 1,
  description: ''
})

// Validation Rules
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 100, message: '长度在 6 到 100 个字符', trigger: 'blur' }
  ],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

// Watchers
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      fetchUsers()
      fetchRoles()
    }
  }
)

watch(searchKeyword, () => {
  currentPage.value = 1
  fetchUsers()
})

// Methods
const fetchRoles = async () => {
  try {
    const res = await getRoleList()
    roles.value = res
  } catch (error) {
    console.error('Failed to fetch roles:', error)
  }
}

const getRoleName = (roleId) => {
  const role = roles.value.find((r) => r.roleId === roleId)
  return role ? role.roleName : '未知角色'
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    const res = await listUsers(params)
    userList.value = res.records
    total.value = res.total
  } catch (error) {
    console.error('Failed to fetch users:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchUsers()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchUsers()
}

const handleAdd = () => {
  isEdit.value = false
  resetForm()
  formVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  resetForm()
  Object.assign(formData, {
    userId: row.userId,
    username: row.username,
    email: row.email,
    roleId: row.roleId,
    status: row.status,
    description: row.description,
    newPassword: ''
  })
  formVisible.value = true
}

const handleDelete = async (userId) => {
  try {
    await deleteUser(userId)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error) {
    console.error('Failed to delete user:', error)
    ElMessage.error('删除失败')
  }
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    userId: null,
    username: '',
    email: '',
    password: '',
    newPassword: '',
    roleId: null,
    status: 1,
    description: ''
  })
}

const submitForm = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value) {
          const updateData = {
            userId: formData.userId,
            username: formData.username, // Allow update username? backend DTO has it
            email: formData.email,
            roleId: formData.roleId,
            status: formData.status,
            description: formData.description
          }
          if (formData.newPassword) {
            updateData.newPassword = formData.newPassword
          }
          await updateUser(updateData)
        } else {
          await register({
            username: formData.username,
            password: formData.password,
            email: formData.email,
            roleId: formData.roleId,
            description: formData.description
          })
        }

        ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
        formVisible.value = false
        fetchUsers()
      } catch (error) {
        console.error('Submit failed:', error)
        ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
      } finally {
        submitting.value = false
      }
    }
  })
}
</script>

<style scoped>
.user-management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
