<template>
  <div class="tenant-msg-config">
    <MsgConfigForm base="/tenant/msg-config" expire>
      <!-- 平台额度展示卡 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">平台通道额度</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="平台短信通道">
            <el-tag :type="quota.use_platform_sms ? 'success' : 'info'" size="small">
              {{ quota.use_platform_sms ? '已分配可用' : '未分配' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="平台邮箱通道">
            <el-tag :type="quota.use_platform_email ? 'success' : 'info'" size="small">
              {{ quota.use_platform_email ? '已分配可用' : '未分配' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="短信额度">
            已用 {{ quota.sms_used }} / {{ quota.sms_quota }} 条
          </el-descriptions-item>
          <el-descriptions-item label="邮箱额度">
            已用 {{ quota.email_used }} / {{ quota.email_quota }} 封
          </el-descriptions-item>
        </el-descriptions>
        <p class="quota-tip">额度由平台运营方分配；自有通道启用且配置完整时优先使用自有通道，未启用自有通道时由平台通道按已分配额度发送，额度用尽后发送将失败，请及时申请追加。</p>
      </el-card>
    </MsgConfigForm>

    <!-- 发送记录 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="log-header">
          <span class="section-title">发送记录（最近 100 条）</span>
          <el-button link type="primary" :icon="Refresh" @click="loadLogs">刷新</el-button>
        </div>
      </template>
      <el-table :data="logs" v-loading="logsLoading" border stripe size="small">
        <el-table-column label="通道" width="90">
          <template #default="{ row }">{{ channelText(row.channel) }}</template>
        </el-table-column>
        <el-table-column label="来源" width="110">
          <template #default="{ row }">{{ sourceText(row.source) }}</template>
        </el-table-column>
        <el-table-column prop="target" label="接收方" min-width="160" show-overflow-tooltip />
        <el-table-column prop="content" label="内容摘要" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="Number(row.status) === 0 && row.error" :content="row.error" placement="top">
              <el-tag type="danger" size="small">失败</el-tag>
            </el-tooltip>
            <el-tag v-else :type="Number(row.status) === 1 ? 'success' : 'danger'" size="small">
              {{ Number(row.status) === 1 ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ str(row.create_time) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 租户消息配置：自有短信/SMTP 通道配置 + 平台额度展示 + 测试发送 + 发送记录（config:edit）
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { get } from '../../api/request'
import MsgConfigForm from '../../components/MsgConfigForm.vue'

/* ---------- 平台额度 ---------- */
const quota = ref({ use_platform_sms: false, sms_quota: 0, sms_used: 0, use_platform_email: false, email_quota: 0, email_used: 0 })

async function loadQuota() {
  const d = await get('/tenant/msg-config')
  quota.value = (d && d.quota) || quota.value
}

/* ---------- 发送记录 ---------- */
const logs = ref([])
const logsLoading = ref(false)

async function loadLogs() {
  logsLoading.value = true
  try {
    logs.value = (await get('/tenant/msg-send-logs')) || []
  } finally {
    logsLoading.value = false
  }
}

function channelText(v) {
  return v === 'sms' ? '短信' : v === 'email' ? '邮箱' : v || '-'
}

function sourceText(v) {
  return v === 'tenant' ? '自有通道' : v === 'platform' ? '平台通道' : v || '-'
}

function str(v) {
  return String(v || '').slice(0, 19)
}

onMounted(() => {
  loadQuota()
  loadLogs()
})
</script>

<style scoped>
.section-card {
  margin-bottom: 16px;
}
.section-title {
  font-weight: bold;
  color: #1f2d3d;
}
.quota-tip {
  margin: 12px 0 0;
  color: #909399;
  font-size: 12px;
}
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
