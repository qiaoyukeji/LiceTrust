<template>
  <div class="register-page">
    <div class="register-box">
      <div class="register-title">
        <el-icon :size="30"><Monitor /></el-icon>
        <h1>注册企业账号</h1>
        <p>开通企业独立工作空间，注册成功后自动登录</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" class="register-form" @submit.prevent>
        <el-form-item label="公司名称" prop="company_name">
          <el-input v-model="form.company_name" placeholder="请输入企业全称" size="large" :prefix-icon="OfficeBuilding" />
        </el-form-item>
        <el-form-item label="管理员账号" prop="username">
          <el-input v-model="form.username" placeholder="登录账号，注册后作为企业管理员" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="不少于6位" size="large" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" size="large" :prefix-icon="Lock" show-password @keyup.enter="onSubmit" />
        </el-form-item>
        <el-form-item label="负责人姓名" prop="real_name">
          <el-input v-model="form.real_name" placeholder="企业信息化负责人姓名" size="large" :prefix-icon="UserFilled" />
        </el-form-item>
        <el-form-item label="手机号码" prop="phone">
          <el-input v-model="form.phone" placeholder="用于登录验证与预警通知" size="large" :prefix-icon="Iphone" maxlength="11">
            <template #append>
              <el-button :disabled="countdown > 0" @click="sendCode">{{ countdown > 0 ? countdown + 's' : '获取验证码' }}</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="短信验证码" prop="sms_code">
          <el-input v-model="form.sms_code" placeholder="请输入短信验证码" size="large" maxlength="6" @keyup.enter="onSubmit" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="register-btn" :loading="loading" @click="onSubmit">注册并登录</el-button>
        </el-form-item>
      </el-form>
      <div class="register-extra">
        <span>已有账号？</span>
        <el-link type="primary" :underline="false" @click="goLogin">返回登录</el-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// 企业注册：POST /auth/register {company_name, username, password, real_name, phone}
// 注册成功响应 {token, user}，直接写入登录态并跳转工作台（与登录页保存逻辑一致）
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled, Iphone, OfficeBuilding } from '@element-plus/icons-vue'
import { post } from '../../api/request'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const store = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({
  company_name: '',
  username: '',
  password: '',
  confirmPassword: '',
  real_name: '',
  phone: '',
  sms_code: ''
})

const rules = {
  company_name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不得少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ],
  real_name: [{ required: true, message: '请输入负责人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  sms_code: [{ required: true, message: '请输入短信验证码', trigger: 'blur' }]
}

// ===== 短信验证码（阿里云短信通道；mock 模式验证码自动回显填入）=====
const countdown = ref(0)
let cdTimer = null

async function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    ElMessage.warning('请先填写正确的手机号码')
    return
  }
  const data = await post('/auth/sms/send', { phone: form.phone })
  if (data.mock_code) {
    form.sms_code = data.mock_code
    ElMessage.info('模拟模式：验证码已自动填入（' + data.mock_code + '）')
  } else {
    ElMessage.success('验证码已发送，请查收短信')
  }
  countdown.value = 60
  cdTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && cdTimer) { clearInterval(cdTimer); cdTimer = null }
  }, 1000)
}

/** 注册提交：成功后自动登录并进入工作台 */
async function onSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    const data = await post('/auth/register', {
      company_name: form.company_name,
      username: form.username,
      password: form.password,
      real_name: form.real_name,
      phone: form.phone,
      sms_code: form.sms_code
    })
    store.setLogin(data.token, data.user)
    await store.refreshMe().catch(() => {})
    ElMessage.success('企业注册成功，欢迎使用')
    router.push('/')
  } finally {
    loading.value = false
  }
}

/** 返回登录页 */
function goLogin() {
  router.push('/login')
}

onBeforeUnmount(() => { if (cdTimer) clearInterval(cdTimer) })
</script>

<style scoped>
.register-page {
  height: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #123c73 0%, #1f5aa8 55%, #2d77c8 100%);
}
.register-box {
  width: 440px;
  background: #fff;
  border-radius: 8px;
  padding: 36px 36px 24px;
  box-shadow: 0 12px 40px rgba(0, 21, 41, 0.35);
}
.register-title {
  text-align: center;
  color: #1f5aa8;
  margin-bottom: 24px;
}
.register-title h1 {
  font-size: 22px;
  margin: 10px 0 6px;
  letter-spacing: 2px;
}
.register-title p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.register-btn {
  width: 100%;
}
.register-extra {
  text-align: center;
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
</style>
