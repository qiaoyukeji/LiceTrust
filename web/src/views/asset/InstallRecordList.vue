<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="计算机编号/软件名称" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
      <el-form-item label="所属单位">
        <el-tree-select
          v-model="query.orgId"
          :data="orgTree"
          node-key="id"
          :props="{ label: 'org_name', children: 'children' }"
          check-strictly
          clearable
          placeholder="全部"
          style="width: 180px"
        />
      </el-form-item>
      <el-form-item label="软件分类">
        <el-select v-model="query.category" clearable placeholder="全部" style="width: 130px">
          <el-option v-for="(t, k) in CATEGORY" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="软件类型">
        <el-select v-model="query.softwareType" clearable placeholder="全部" style="width: 130px">
          <el-option v-for="(t, k) in SOFTWARE_TYPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="安装日期">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始"
          end-placeholder="结束"
          style="width: 240px"
        />
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'install:edit'" type="primary" :icon="Plus" @click="openAdd">登记安装</el-button>
      <el-button v-perm="'install:edit'" type="warning" :icon="Upload" @click="importDlg.visible = true">批量导入</el-button>
    </template>
    <el-table-column prop="computer_no" label="计算机编号" width="140" />
    <el-table-column prop="brand" label="品牌" width="100" />
    <el-table-column prop="software_no" label="软件编号" width="160" show-overflow-tooltip />
    <el-table-column prop="software_name" label="软件名称" min-width="160" show-overflow-tooltip />
    <el-table-column label="分类" width="100">
      <template #default="{ row }">{{ enumText(CATEGORY, row.category) }}</template>
    </el-table-column>
    <el-table-column prop="version" label="版本" width="110" />
    <el-table-column prop="license_term" label="许可期限" width="100" />
    <el-table-column prop="install_date" label="安装日期" width="110" />
    <el-table-column prop="install_source" label="安装来源" width="100" />
    <el-table-column label="核查状态" width="100">
      <template #default="{ row }">
        <el-tag :type="inspectTag(row.inspect_status)" size="small">{{ inspectText(row.inspect_status) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'install:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'install:edit'" title="确定删除该安装记录吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 登记/编辑安装记录 -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="560px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="计算机" prop="computer_id">
        <el-select v-model="form.computer_id" filterable style="width: 100%" :disabled="dlg.editId != null">
          <el-option v-for="c in computerOptions" :key="c.id" :label="c.computer_no + ' ' + (c.brand || '')" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="软件" prop="software_id">
        <el-select v-model="form.software_id" filterable style="width: 100%" :disabled="dlg.editId != null">
          <el-option v-for="s in softwareOptions" :key="s.id" :label="s.software_name + '（' + s.software_no + '）'" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="版本">
            <el-input v-model="form.version" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="安装日期" prop="install_date">
            <el-date-picker v-model="form.install_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="许可期限">
        <el-input v-model="form.license_term" placeholder="如 永久 / 3年" />
      </el-form-item>
      <el-form-item label="安装来源">
        <el-select v-model="form.install_source" style="width: 100%">
          <el-option label="统一部署" value="统一部署" />
          <el-option label="个人申请" value="个人申请" />
          <el-option label="补录" value="补录" />
        </el-select>
      </el-form-item>
      <el-form-item label="核查状态">
        <el-select v-model="form.inspect_status" style="width: 100%">
          <el-option label="未核查" :value="0" />
          <el-option v-for="(t, k) in INS_RESULT" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
    </template>
  </el-dialog>

  <!-- 批量导入 -->
  <el-dialog v-model="importDlg.visible" title="批量导入安装明细" width="620px" destroy-on-close>
    <el-alert
      title="每行一条记录，格式：计算机编号,软件编号,版本,安装日期（YYYY-MM-DD），失败行不影响其他行"
      type="info"
      :closable="false"
      show-icon
      class="import-tip"
    />
    <el-input
      v-model="importDlg.text"
      type="textarea"
      :rows="10"
      placeholder="PC-HFE-0001,RJ-OS-0001,Windows 11 专业版,2025-01-10"
    />
    <div v-if="importDlg.result" class="import-result">
      <el-alert
        :title="'导入完成：成功 ' + importDlg.result.success + ' 条，失败 ' + importDlg.result.failed.length + ' 条'"
        :type="importDlg.result.failed.length ? 'warning' : 'success'"
        :closable="false"
        show-icon
      />
      <div v-for="f in importDlg.result.failed" :key="f.row" class="failed-line">第 {{ f.row }} 行：{{ f.reason }}</div>
    </div>
    <template #footer>
      <el-button @click="importDlg.visible = false">关闭</el-button>
      <el-button type="primary" :loading="importDlg.loading" @click="onImport">开始导入</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 安装明细：筛选/登记/编辑/批量导入（install:view / install:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'
import { CATEGORY, SOFTWARE_TYPE, INS_RESULT, enumText } from '../../constants'

const tableRef = ref()
const orgTree = ref([])
const computerOptions = ref([])
const softwareOptions = ref([])
const formRef = ref()
const saving = ref(false)
const dateRange = ref(null)
const query = reactive({ kw: '', orgId: null, category: null, softwareType: null })

const dlg = reactive({ visible: false, title: '登记安装', editId: null })
const form = reactive({ computer_id: null, software_id: null, version: '', license_term: '', install_date: '', install_source: '统一部署', inspect_status: 0, remark: '' })
const rules = {
  computer_id: [{ required: true, message: '请选择计算机', trigger: 'change' }],
  software_id: [{ required: true, message: '请选择软件', trigger: 'change' }],
  install_date: [{ required: true, message: '请选择安装日期', trigger: 'change' }]
}

const importDlg = reactive({ visible: false, text: '', loading: false, result: null })

async function fetchData({ page, pageSize }) {
  const from = dateRange.value && dateRange.value[0] ? dateRange.value[0] : undefined
  const to = dateRange.value && dateRange.value[1] ? dateRange.value[1] : undefined
  return get('/install-records', {
    kw: query.kw || undefined,
    orgId: query.orgId || undefined,
    category: query.category === null ? undefined : query.category,
    softwareType: query.softwareType === null ? undefined : query.softwareType,
    dateFrom: from,
    dateTo: to,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', orgId: null, category: null, softwareType: null })
  dateRange.value = null
}

function inspectText(s) {
  const n = Number(s) || 0
  return n === 0 ? '未核查' : enumText(INS_RESULT, n)
}

function inspectTag(s) {
  return { 0: 'info', 1: 'success', 2: 'danger', 3: 'warning', 4: 'warning' }[Number(s) || 0] || 'info'
}

function openAdd() {
  dlg.title = '登记安装'
  dlg.editId = null
  Object.assign(form, { computer_id: null, software_id: null, version: '', license_term: '', install_date: '', install_source: '统一部署', inspect_status: 0, remark: '' })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑安装记录'
  dlg.editId = row.id
  Object.assign(form, {
    computer_id: Number(row.computer_id),
    software_id: Number(row.software_id),
    version: row.version || '',
    license_term: row.license_term || '',
    install_date: row.install_date || '',
    install_source: row.install_source || '',
    inspect_status: Number(row.inspect_status) || 0,
    remark: row.remark || ''
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/install-records/' + dlg.editId, { ...form })
    } else {
      await post('/install-records', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

/** 批量导入：textarea 逐行解析后 POST /install-records/import */
async function onImport() {
  const lines = String(importDlg.text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) {
    ElMessage.warning('请先粘贴导入数据')
    return
  }
  const items = []
  for (const line of lines) {
    const parts = line.split(/[,，\t]/).map((p) => p.trim())
    items.push({ computer_no: parts[0] || '', software_no: parts[1] || '', version: parts[2] || '', install_date: parts[3] || '' })
  }
  importDlg.loading = true
  try {
    const res = await post('/install-records/import', { items })
    importDlg.result = res
    ElMessage.success('导入完成：成功 ' + (res.success || 0) + ' 条')
    reloadTable()
  } finally {
    importDlg.loading = false
  }
}

onMounted(async () => {
  orgTree.value = (await get('/orgs/tree')) || []
  computerOptions.value = (await get('/computers/options')) || []
  softwareOptions.value = (await get('/softwares/options')) || []
})
</script>

<style scoped>
.import-tip {
  margin-bottom: 10px;
}
.import-result {
  margin-top: 10px;
}
.failed-line {
  color: #f56c6c;
  font-size: 13px;
  padding: 2px 0;
}
</style>
