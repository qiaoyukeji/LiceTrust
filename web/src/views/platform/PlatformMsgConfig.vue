<template>
  <div class="platform-msg-config">
    <el-alert
      title="平台通道供未配置自有通道的租户分配使用"
      description="各企业可在其「消息配置」页启用自有短信或 SMTP 通道，启用后优先使用自有通道发送；未启用自有通道的企业由本平台通道按分配额度发送。额度可在「企业管理」中按企业分配。"
      type="info"
      show-icon
      :closable="false"
      class="top-tip"
    />
    <MsgConfigForm base="/platform/msg-config" />
  </div>
</template>

<script setup>
// 平台消息配置：平台级短信/SMTP 通道配置 + 测试发送（仅平台运营账号 tenant_id=0）
import MsgConfigForm from '../../components/MsgConfigForm.vue'
</script>

<style scoped>
.top-tip {
  margin-bottom: 16px;
}
.platform-msg-config :deep(.msg-config-form) {
  max-width: 900px;
}
</style>
