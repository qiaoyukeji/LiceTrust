<template>
  <el-card shadow="never" class="page-card">
    <el-alert title="按上级要求的报表模板生成台账报表，可预览后导出 Excel 报送" type="info" :closable="false" show-icon class="mb12" />
    <el-form inline class="query-form" @submit.prevent>
      <el-form-item label="报表模板">
        <el-select v-model="type" style="width: 280px" @change="loadPreview">
          <el-option v-for="t in templates" :key="t.type" :label="t.name" :value="t.type" />
        </el-select>
      </el-form-item>
      <el-form-item label="统计单位">
        <el-tree-select
          v-model="orgId"
          :data="orgTree"
          node-key="id"
          :props="{ label: 'org_name', children: 'children' }"
          check-strictly
          clearable
          placeholder="全部单位"
          style="width: 200px"
          @change="loadPreview"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Refresh" @click="loadPreview">刷新预览</el-button>
        <el-button type="success" :icon="Download" :loading="exporting" @click="onExport">导出 Excel</el-button>
      </el-form-item>
    </el-form>

    <!-- 统计区（部分模板返回 topStats） -->
    <el-row v-if="topStats" :gutter="16" class="mb12">
      <el-col v-for="s in statCards" :key="s.label" :span="4">
        <el-card shadow="never" class="stat-mini">
          <div class="stat-mini-value">{{ s.value }}</div>
          <div class="stat-mini-label">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <h4 v-if="preview.title" class="report-title">{{ preview.title }}</h4>
    <el-table :data="preview.rows" v-loading="loading" border stripe max-height="560">
      <el-table-column
        v-for="col in preview.columns"
        :key="col.key"
        :prop="col.key"
        :label="col.label"
        :min-width="Math.min(Math.max(Number(col.width) || 90, 80), 260)"
        show-overflow-tooltip
      />
    </el-table>
    <div class="row-count">共 {{ preview.rows.length }} 条记录</div>
  </el-card>
</template>

<script setup>
// 报表中心：模板选择 + 预览（动态 columns）+ topStats + 导出下载
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'
import { get, download } from '../../api/request'

const templates = ref([])
const type = ref('')
const orgId = ref(null)
const orgTree = ref([])
const loading = ref(false)
const exporting = ref(false)
const preview = reactive({ title: '', columns: [], rows: [], topStats: null })

/** topStats 统计卡片 */
const statCards = computed(() => {
  const t = preview.topStats || {}
  return [
    { label: '使用人数', value: t.person_total || 0 },
    { label: '计算机总数', value: t.computer_total || 0 },
    { label: '服务器', value: t.server_total || 0 },
    { label: '台式机', value: t.desktop_total || 0 },
    { label: '便携机', value: t.laptop_total || 0 }
  ]
})

const topStats = computed(() => preview.topStats)

async function loadPreview() {
  if (!type.value) return
  loading.value = true
  try {
    const data = await get('/reports/preview/' + type.value, { orgId: orgId.value || undefined })
    preview.title = (data && data.title) || ''
    preview.columns = (data && data.columns) || []
    preview.rows = (data && data.rows) || []
    preview.topStats = (data && data.topStats) || null
  } finally {
    loading.value = false
  }
}

/** 导出：blob 下载 */
async function onExport() {
  if (!type.value) return
  exporting.value = true
  try {
    const name = await download('/reports/export/' + type.value, { orgId: orgId.value || undefined })
    ElMessage.success('已导出：' + (name || 'report.xlsx'))
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  templates.value = (await get('/reports/templates')) || []
  orgTree.value = (await get('/orgs/tree')) || []
  if (templates.value.length) {
    type.value = templates.value[0].type
    loadPreview()
  }
})
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}
.report-title {
  text-align: center;
  color: #1f2d3d;
  margin: 6px 0 12px;
}
.stat-mini {
  text-align: center;
}
.stat-mini-value {
  font-size: 20px;
  font-weight: bold;
  color: #1f5aa8;
}
.stat-mini-label {
  font-size: 12px;
  color: #909399;
}
.row-count {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
  text-align: right;
}
</style>
