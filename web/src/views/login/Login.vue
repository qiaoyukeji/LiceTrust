<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-title">
        <el-icon :size="30"><Monitor /></el-icon>
        <h1>正版软件管理平台</h1>
        <p>软件正版化工作管理信息系统 <span class="ver">v1.1.0</span></p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" class="login-form" @submit.prevent>
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" size="large" :prefix-icon="User" @keyup.enter="onSubmit" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="onSubmit">登 录</el-button>
        </el-form-item>
      </el-form>
      <div class="login-register">
        <span>没有账号？</span>
        <el-link type="primary" :underline="false" @click="goRegister">注册企业账号</el-link>
      </div>
      <div class="login-tip">账号密码登录 · 登录信息将被审计记录</div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { post } from '../../api/request'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const route = useRoute()
const store = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

/** 登录提交（回车可触发） */
async function onSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    const data = await post('/auth/login', { username: form.username, password: form.password })
    store.setLogin(data.token, data.user)
    await store.refreshMe().catch(() => {})
    ElMessage.success('登录成功')
    router.push(String(route.query.redirect || '/'))
  } finally {
    loading.value = false
  }
}

/** 前往企业注册页 */
function goRegister() {
  router.push('/register')
}
</script>

<style scoped>
.login-page {
  height: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #123c73 0%, #1f5aa8 55%, #2d77c8 100%);
}
.login-box {
  width: 400px;
  background: #fff;
  border-radius: 8px;
  padding: 40px 36px 28px;
  box-shadow: 0 12px 40px rgba(0, 21, 41, 0.35);
}
.login-title {
  text-align: center;
  color: #1f5aa8;
  margin-bottom: 28px;
}
.login-title h1 {
  font-size: 22px;
  margin: 10px 0 6px;
  letter-spacing: 2px;
}
.login-title p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.login-title .ver {
  color: rgba(255, 255, 255, 0.75);
  font-size: 11px;
}
.login-btn {
  width: 100%;
}
.login-register {
  text-align: center;
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.login-tip {
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
  margin-top: 6px;
}
</style>
