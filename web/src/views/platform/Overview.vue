<template>
  <div class="platform-overview">
    <!-- 平台聚合指标卡（GET /platform/overview，仅 tenant_id=0 可见） -->
    <el-row :gutter="16">
      <el-col v-for="c in cards" :key="c.label" :xs="12" :sm="8" :md="6" :lg="3" class="card-col">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <el-icon :size="26" :color="c.color"><component :is="c.icon" /></el-icon>
            <div>
              <div class="stat-value">{{ c.value }}</div>
              <div class="stat-label">{{ c.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt16">
      <el-col :md="12" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">企业租户分布</span></template>
          <div class="kv-line">
            <span class="kv-label">企业总数</span>
            <span class="kv-value">{{ ov.tenant_total || 0 }}</span>
          </div>
          <el-progress :percentage="enabledPct" :stroke-width="14" status="success" class="kv-progress" />
          <div class="kv-line">
            <span class="kv-label">启用企业</span>
            <span class="kv-value">{{ ov.tenant_enabled || 0 }}</span>
          </div>
          <div class="kv-line">
            <span class="kv-label">停用企业</span>
            <span class="kv-value">{{ (ov.tenant_total || 0) - (ov.tenant_enabled || 0) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :md="12" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">快捷入口</span></template>
          <div class="quick-grid">
            <el-button plain class="quick-btn" @click="$router.push('/platform/tenants')">
              <el-icon class="quick-icon"><OfficeBuilding /></el-icon>
              企业管理
            </el-button>
            <el-button plain class="quick-btn" @click="$router.push('/configs')">
              <el-icon class="quick-icon"><Setting /></el-icon>
              系统参数
            </el-button>
            <el-button plain class="quick-btn" @click="$router.push('/dicts')">
              <el-icon class="quick-icon"><Collection /></el-icon>
              数据字典
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
// 平台总览：跨租户聚合指标（GET /api/platform/overview），仅平台运营账号（tenant_id=0）可见
import { computed, onMounted, reactive } from 'vue'
import { get } from '../../api/request'

const ov = reactive({})

/** 指标卡片 */
const cards = computed(() => [
  { label: '企业总数', value: ov.tenant_total || 0, icon: 'OfficeBuilding', color: '#1f5aa8' },
  { label: '启用企业', value: ov.tenant_enabled || 0, icon: 'CircleCheck', color: '#67c23a' },
  { label: '用户数', value: ov.user_total || 0, icon: 'User', color: '#409eff' },
  { label: '电脑数', value: ov.computer_total || 0, icon: 'Monitor', color: '#e6a23c' },
  { label: '软件数', value: ov.software_total || 0, icon: 'Box', color: '#909399' },
  { label: '安装记录', value: ov.install_total || 0, icon: 'Download', color: '#f56c6c' },
  { label: '许可总数', value: ov.license_total || 0, icon: 'Key', color: '#b88230' }
])

/** 启用企业占比 */
const enabledPct = computed(() => {
  const total = Number(ov.tenant_total || 0)
  if (!total) return 0
  return Math.round((Number(ov.tenant_enabled || 0) / total) * 100)
})

async function load() {
  const data = await get('/platform/overview')
  Object.assign(ov, data || {})
}

onMounted(load)
</script>

<style scoped>
.card-col {
  margin-bottom: 16px;
}
.stat-card {
  cursor: default;
}
.stat-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}
.stat-label {
  font-size: 13px;
  color: #909399;
}
.card-title {
  font-weight: bold;
  color: #303133;
}
.kv-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #ebeef5;
}
.kv-label {
  color: #606266;
  font-size: 14px;
}
.kv-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.kv-progress {
  margin: 12px 0;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.quick-btn {
  height: 64px;
  justify-content: flex-start;
  gap: 8px;
}
.quick-icon {
  font-size: 20px;
  color: #1f5aa8;
}
</style>
