<template>
  <el-dialog
    :model-value="modelValue"
    title="二次身份认证"
    width="420px"
    destroy-on-close
    @update:model-value="(v) => emit('update:modelValue', v)"
    @open="password = ''"
  >
    <el-alert
      title="查看序列号、激活码等敏感信息需验证登录密码，该操作已记录审计日志"
      type="warning"
      :closable="false"
      show-icon
      class="reveal-alert"
    />
    <el-form @submit.prevent>
      <el-form-item label="登录密码">
        <el-input v-model="password" type="password" show-password placeholder="请输入当前账号登录密码" @keyup.enter="onConfirm" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="onConfirm">确认查看</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 敏感信息查看通用对话框：密码二次认证 + 调用 reveal 接口（审计留痕）
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { post } from '../api/request'

const props = defineProps({
  /** 二次认证接口地址，如 /entitlements/1/reveal */
  url: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue', 'revealed'])

const password = ref('')
const loading = ref(false)

async function onConfirm() {
  if (!password.value) {
    ElMessage.warning('请输入登录密码')
    return
  }
  loading.value = true
  try {
    const data = await post(props.url, { password: password.value })
    ElMessage.warning('该操作已记录审计日志')
    emit('revealed', data)
    emit('update:modelValue', false)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reveal-alert {
  margin-bottom: 14px;
}
</style>
