<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="预警内容" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
      <el-form-item label="预警类型">
        <el-select v-model="query.alertType" clearable placeholder="全部" style="width: 140px">
          <el-option v-for="(t, k) in ALERT_TYPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
          <el-option v-for="(t, k) in ALERT_STATUS" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="级别">
        <el-select v-model="query.level" clearable placeholder="全部" style="width: 120px">
          <el-option v-for="(t, k) in ALERT_LEVEL" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'alert:handle'" type="warning" :icon="Search" :loading="scanning" @click="onScan">手动扫描</el-button>
    </template>
    <el-table-column label="类型" width="120">
      <template #default="{ row }">
        <el-tag size="small" :type="alertTypeTag(row.alert_type)">{{ enumText(ALERT_TYPE, row.alert_type) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="content" label="预警内容" min-width="280" show-overflow-tooltip />
    <el-table-column label="级别" width="80">
      <template #default="{ row }">
        <el-tag size="small" :type="alertLevelTag(row.level)">{{ enumText(ALERT_LEVEL, row.level) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="状态" width="90">
      <template #default="{ row }">
        <el-tag size="small" :type="alertStatusTag(row.status)">{{ enumText(ALERT_STATUS, row.status) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="handler_name" label="处理人" width="90" />
    <el-table-column prop="handle_time" label="处理时间" width="160">
      <template #default="{ row }">{{ str(row.handle_time) }}</template>
    </el-table-column>
    <el-table-column prop="handle_remark" label="处理说明" min-width="150" show-overflow-tooltip />
    <el-table-column prop="create_time" label="产生时间" width="160">
      <template #default="{ row }">{{ str(row.create_time) }}</template>
    </el-table-column>
    <el-table-column label="操作" width="110" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'alert:handle'" v-if="Number(row.status) !== 2" link type="primary" @click="openHandle(row)">处理</el-button>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 处理对话框 -->
  <el-dialog v-model="dlg.visible" title="预警处理" width="520px" destroy-on-close>
    <el-descriptions :column="1" border class="mb12">
      <el-descriptions-item label="预警内容">{{ dlg.row.content }}</el-descriptions-item>
    </el-descriptions>
    <el-form label-width="90px">
      <el-form-item label="处理说明" required>
        <el-input v-model="dlg.remark" type="textarea" :rows="4" placeholder="请填写处理措施与结果" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveHandle">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 预警中心：列表 + 手动扫描 + 处理（alert:view / alert:handle）
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put } from '../../api/request'
import { ALERT_TYPE, ALERT_STATUS, ALERT_LEVEL, enumText, alertLevelTag, alertStatusTag } from '../../constants'

const tableRef = ref()
const saving = ref(false)
const scanning = ref(false)
const query = reactive({ kw: '', alertType: null, status: null, level: null })

const dlg = reactive({ visible: false, row: {}, remark: '' })

async function fetchData({ page, pageSize }) {
  return get('/alerts', {
    kw: query.kw || undefined,
    alertType: query.alertType === null ? undefined : query.alertType,
    status: query.status === null ? undefined : query.status,
    level: query.level === null ? undefined : query.level,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', alertType: null, status: null, level: null })
}

function str(v) {
  return String(v || '').slice(0, 19)
}

function alertTypeTag(t) {
  return { 1: 'warning', 2: 'danger', 3: 'info', 4: 'info' }[Number(t)] || 'info'
}

/** 手动扫描：POST /alerts/scan */
async function onScan() {
  scanning.value = true
  try {
    const res = await post('/alerts/scan')
    const n = Number((res && res.created) || 0)
    ElMessage.success('扫描完成，本次新增预警 ' + n + ' 条')
    reloadTable()
  } finally {
    scanning.value = false
  }
}

function openHandle(row) {
  dlg.row = row
  dlg.remark = ''
  dlg.visible = true
}

async function saveHandle() {
  if (!dlg.remark) {
    ElMessage.warning('请填写处理说明')
    return
  }
  saving.value = true
  try {
    await put('/alerts/' + dlg.row.id + '/handle', { handle_remark: dlg.remark })
    ElMessage.success('处理成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}
</style>
