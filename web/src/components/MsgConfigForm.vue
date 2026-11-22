<template>
  <div class="msg-config-form">
    <!-- 短信通道卡片 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">短信通道</span></template>
      <el-form label-width="150px" class="config-form">
        <el-form-item label="启用自有短信通道">
          <el-switch v-model="form.sms_enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="短信模式">
          <el-select v-model="form.sms_mode" style="width: 320px">
            <el-option label="mock（模拟通道，不实际发送）" value="mock" />
            <el-option label="alibaba（阿里云短信）" value="alibaba" />
            <el-option label="alibaba_pnvs（阿里云视频短信）" value="alibaba_pnvs" />
          </el-select>
        </el-form-item>
        <el-form-item label="AccessKey ID">
          <el-input v-model="form.sms_access_key_id" maxlength="128" placeholder="阿里云 AccessKey ID" style="width: 320px" />
        </el-form-item>
        <el-form-item label="AccessKey Secret">
          <el-input
            v-model="form.sms_access_key_secret"
            type="password"
            show-password
            maxlength="128"
            :placeholder="hasSecret ? '已配置，留空保留' : '请输入 AccessKey Secret'"
            style="width: 320px"
          />
        </el-form-item>
        <el-form-item label="短信签名">
          <el-input v-model="form.sms_sign_name" maxlength="50" placeholder="已报备的短信签名" style="width: 320px" />
        </el-form-item>
        <el-form-item label="模板 Code">
          <el-input v-model="form.sms_template_code" maxlength="64" placeholder="短信模板 Code（如 SMS_123456789）" style="width: 320px" />
        </el-form-item>
        <el-form-item v-if="expire" label="到期短信提前天数">
          <el-input-number v-model="form.expire_sms_days" :min="1" :max="90" />
          <span class="form-tip">授权到期前提前发送提醒短信的天数</span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- SMTP 邮箱通道卡片 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">邮箱通道（SMTP）</span></template>
      <el-form label-width="150px" class="config-form">
        <el-form-item label="启用 SMTP 发送">
          <el-switch v-model="form.smtp_enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="SMTP 服务器">
          <el-input v-model="form.smtp_host" maxlength="100" placeholder="如 smtp.exmail.qq.com" style="width: 320px" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="form.smtp_port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="SSL 加密">
          <el-switch v-model="form.smtp_secure" active-text="SSL" inactive-text="不加密" />
        </el-form-item>
        <el-form-item label="发件账号">
          <el-input v-model="form.smtp_user" maxlength="100" placeholder="发件邮箱账号" style="width: 320px" />
        </el-form-item>
        <el-form-item label="发件密码">
          <el-input
            v-model="form.smtp_pass"
            type="password"
            show-password
            maxlength="128"
            :placeholder="hasPass ? '已配置，留空保留' : '请输入发件密码或授权码'"
            style="width: 320px"
          />
        </el-form-item>
        <el-form-item label="发件人">
          <el-input v-model="form.smtp_from" maxlength="150" placeholder="发件人显示（如 正版软件管理平台 <notice@corp.com>）" style="width: 320px" />
        </el-form-item>
        <el-form-item v-if="expire" label="到期邮件提前天数">
          <el-input-number v-model="form.expire_email_days" :min="1" :max="90" />
          <span class="form-tip">授权到期前提前发送提醒邮件的天数</span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 保存操作 -->
    <div class="save-bar">
      <el-button type="primary" :loading="saving" @click="onSave">保存配置</el-button>
      <span class="form-tip">密钥与密码留空保存表示保留原值；短信与邮箱配置一并提交</span>
    </div>

    <!-- 页面差异内容插槽（如租户额度卡） -->
    <slot />

    <!-- 测试发送卡片 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">测试发送</span></template>
      <el-form inline class="config-form" @submit.prevent>
        <el-form-item label="手机号">
          <el-input v-model="testPhone" maxlength="20" placeholder="接收测试短信的手机号" style="width: 220px" @keyup.enter="onTestSms" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="testingSms" @click="onTestSms">发送测试短信</el-button>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="testEmail" maxlength="150" placeholder="接收测试邮件的邮箱" style="width: 220px" @keyup.enter="onTestEmail" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="testingEmail" @click="onTestEmail">发送测试邮件</el-button>
        </el-form-item>
      </el-form>
      <p class="form-desc">测试发送将从当前配置的通道发出验证消息，发送结果可在发送记录（租户侧）中查看。</p>
    </el-card>
  </div>
</template>

<script setup>
// 消息通道配置表单（短信 + SMTP + 测试发送），租户/平台两页共用
// base 为接口前缀：租户 '/tenant/msg-config'，平台 '/platform/msg-config'
// expire=true 时显示到期提醒提前天数（仅租户配置接口支持）
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { get, put, post } from '../api/request'

const props = defineProps({
  base: { type: String, required: true },
  expire: { type: Boolean, default: false }
})

const saving = ref(false)
const hasSecret = ref(false)
const hasPass = ref(false)

const form = reactive({
  sms_enabled: false,
  sms_mode: 'mock',
  sms_access_key_id: '',
  sms_access_key_secret: '',
  sms_sign_name: '',
  sms_template_code: '',
  expire_sms_days: 7,
  smtp_enabled: false,
  smtp_host: '',
  smtp_port: 465,
  smtp_secure: true,
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  expire_email_days: 7
})

/** 加载配置（租户返回 { config, quota }，平台直接返回字段） */
async function load() {
  const d = await get(props.base)
  const c = props.expire ? (d && d.config) || {} : d || {}
  form.sms_enabled = !!c.sms_enabled
  form.sms_mode = c.sms_mode || 'mock'
  form.sms_access_key_id = c.sms_access_key_id || ''
  form.sms_sign_name = c.sms_sign_name || ''
  form.sms_template_code = c.sms_template_code || ''
  form.expire_sms_days = Number(c.expire_sms_days) || 7
  form.smtp_enabled = !!c.smtp_enabled
  form.smtp_host = c.smtp_host || ''
  form.smtp_port = Number(c.smtp_port) || 465
  form.smtp_secure = !!c.smtp_secure
  form.smtp_user = c.smtp_user || ''
  form.smtp_from = c.smtp_from || ''
  form.expire_email_days = Number(c.expire_email_days) || 7
  hasSecret.value = !!c.has_sms_secret
  hasPass.value = !!c.has_smtp_pass
  form.sms_access_key_secret = ''
  form.smtp_pass = ''
}

/** 保存配置（密钥传空 = 保留原值） */
async function onSave() {
  saving.value = true
  try {
    const payload = {
      sms_enabled: form.sms_enabled,
      sms_mode: form.sms_mode,
      sms_access_key_id: form.sms_access_key_id,
      sms_access_key_secret: form.sms_access_key_secret,
      sms_sign_name: form.sms_sign_name,
      sms_template_code: form.sms_template_code,
      smtp_enabled: form.smtp_enabled,
      smtp_host: form.smtp_host,
      smtp_port: form.smtp_port,
      smtp_secure: form.smtp_secure,
      smtp_user: form.smtp_user,
      smtp_pass: form.smtp_pass,
      smtp_from: form.smtp_from
    }
    if (props.expire) {
      payload.expire_sms_days = form.expire_sms_days
      payload.expire_email_days = form.expire_email_days
    }
    await put(props.base, payload)
    ElMessage.success('消息配置已保存')
    await load()
  } finally {
    saving.value = false
  }
}

/* ---------- 测试发送 ---------- */
const testPhone = ref('')
const testEmail = ref('')
const testingSms = ref(false)
const testingEmail = ref(false)

async function onTestSms() {
  if (!testPhone.value.trim()) {
    ElMessage.warning('请输入接收测试短信的手机号')
    return
  }
  testingSms.value = true
  try {
    const d = await post(props.base + '/test-sms', { phone: testPhone.value.trim() })
    const src = d && d.source === 'tenant' ? '自有通道' : d && d.source === 'platform' ? '平台通道' : ''
    ElMessage.success('测试短信已发送' + (src ? '（来源：' + src + '）' : ''))
  } finally {
    testingSms.value = false
  }
}

async function onTestEmail() {
  if (!testEmail.value.trim()) {
    ElMessage.warning('请输入接收测试邮件的邮箱')
    return
  }
  testingEmail.value = true
  try {
    const d = await post(props.base + '/test-email', { email: testEmail.value.trim() })
    const src = d && d.source === 'tenant' ? '自有通道' : d && d.source === 'platform' ? '平台通道' : ''
    ElMessage.success('测试邮件已发送' + (src ? '（来源：' + src + '）' : ''))
  } finally {
    testingEmail.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.msg-config-form {
  max-width: 900px;
}
.section-card {
  margin-bottom: 16px;
}
.section-title {
  font-weight: bold;
  color: #1f2d3d;
}
.config-form {
  max-width: 640px;
}
.form-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
.form-desc {
  margin: 0;
  color: #909399;
  font-size: 12px;
}
.save-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
</style>
