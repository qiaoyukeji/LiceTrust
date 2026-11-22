<template>
  <div class="login-page">
    <div class="gov-header login-header">
      <p class="header-title">正版软件管理平台</p>
      <p class="header-sub">软件正版化 · 台账 · 流程 · 预警 一站式管理（v1.1.0）</p>
    </div>
    <div class="gov-card login-card">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.username"
            name="username"
            label="账号"
            left-icon="manager-o"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请输入用户名' }]"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密码"
            left-icon="lock"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
        </van-cell-group>
        <div class="login-btn">
          <van-button round block type="primary" color="#1a66d0" native-type="submit" :loading="loading">
            登 录
          </van-button>
        </div>
      </van-form>
    </div>
    <p class="login-foot">移动端 H5 · 正版软件管理平台</p>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showSuccessToast } from 'vant'
import { post } from '../../api/request'
import { setAuth } from '../../composables/user'

const router = useRouter()
const route = useRoute()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

async function onSubmit() {
  loading.value = true
  try {
    const data = await post('/auth/login', { username: form.username, password: form.password })
    setAuth(data.token, data.user)
    showSuccessToast('登录成功')
    const redirect = route.query && route.query.redirect
    router.replace(typeof redirect === 'string' && redirect ? redirect : '/home')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding-bottom: 32px;
}
.login-header {
  padding-top: 56px;
  padding-bottom: 40px;
  border-radius: 0 0 24px 24px;
  text-align: center;
}
.login-card {
  margin: -20px 16px 0;
  padding: 20px 0 8px;
}
.login-btn {
  margin: 20px 16px 8px;
}
.login-foot {
  text-align: center;
  color: #8492a6;
  font-size: 12px;
  margin-top: 24px;
}
</style>
