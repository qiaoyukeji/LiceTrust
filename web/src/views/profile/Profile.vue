<template>
  <el-row :gutter="16">
    <el-col :md="10" :xs="24">
      <el-card shadow="never" class="page-card">
        <template #header><span class="card-title">基本信息</span></template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="登录账号">{{ user.username }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ user.real_name }}</el-descriptions-item>
          <el-descriptions-item label="所属单位">{{ user.org_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所属部门">{{ user.dept_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ roleNames }}</el-descriptions-item>
          <el-descriptions-item label="数据权限">{{ enumText(DATA_SCOPE, user.dataScope) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-col>
    <el-col :md="14" :xs="24">
      <el-card shadow="never" class="page-card">
        <template #header><span class="card-title">修改密码</span></template>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" style="max-width: 420px">
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="form.oldPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="form.newPassword" type="password" show-password placeholder="不少于 6 位" />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="onSave">保存修改</el-button>
            <el-button @click="formRef.resetFields()">重置</el-button>
          </el-form-item>
        </el-form>
        <el-alert
          title="修改成功后需重新登录，请牢记新密码"
          type="info"
          :closable="false"
          show-icon
          class="mt8"
        />
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
// 个人中心：用户信息展示 + 修改密码（PUT /auth/password）
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { put } from '../../api/request'
import { useUserStore } from '../../stores/user'
import { DATA_SCOPE, enumText } from '../../constants'

const router = useRouter()
const store = useUserStore()
const user = computed(() => store.user || {})
const roleNames = computed(() => ((user.value.roles || []).map((r) => r.name)).join('、') || '-')

const formRef = ref()
const saving = ref(false)
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const rules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码不少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.newPassword) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    await put('/auth/password', { oldPassword: form.oldPassword, newPassword: form.newPassword })
    ElMessage.success('密码修改成功，请重新登录')
    store.logout()
    router.push('/login')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.card-title {
  font-weight: bold;
  color: #1f2d3d;
}
.mt8 {
  margin-top: 8px;
}
</style>
