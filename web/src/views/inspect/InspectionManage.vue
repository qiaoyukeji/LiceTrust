<template>
  <el-tabs v-model="activeTab" class="inspect-tabs" @tab-change="onTabChange">
    <!-- Tab1：督查任务（原列表页） -->
    <el-tab-pane label="督查任务" name="task">
      <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
        <template #query>
          <el-form-item label="关键字">
            <el-input v-model="query.kw" placeholder="任务名称" clearable style="width: 200px" @keyup.enter="reloadTable" />
          </el-form-item>
          <el-form-item label="任务状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px">
              <el-option v-for="(t, k) in TASK_STATUS" :key="k" :label="t" :value="Number(k)" />
            </el-select>
          </el-form-item>
          <el-form-item label="年度">
            <el-input v-model="query.year" placeholder="如 2026" clearable style="width: 110px" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="query.checkType" clearable placeholder="全部" style="width: 120px">
              <el-option v-for="(t, k) in CHECK_TYPE" :key="k" :label="t" :value="Number(k)" />
            </el-select>
          </el-form-item>
        </template>
        <template #toolbar>
          <el-button v-perm="'ins:edit'" type="primary" :icon="Plus" @click="openAdd">新建任务</el-button>
        </template>
        <el-table-column prop="title" label="任务名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ enumText(CHECK_TYPE, row.check_type) }}</template>
        </el-table-column>
        <el-table-column prop="year" label="年度" width="80" />
        <el-table-column prop="start_date" label="开始日期" width="110" />
        <el-table-column prop="end_date" label="结束日期" width="110" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'primary' : 'success'" size="small">{{ enumText(TASK_STATUS, row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openChecks(row)">核查记录</el-button>
            <el-button v-perm="'ins:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-perm="'ins:edit'" v-if="Number(row.status) === 1" link type="success" @click="onFinish(row)">完成</el-button>
            <el-popconfirm v-perm="'ins:edit'" title="确定删除该任务吗？" @confirm="onDel(row)">
              <template #reference><el-button link type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </CrudTable>

      <!-- 新建/编辑任务 -->
      <el-dialog v-model="dlg.visible" :title="dlg.title" width="560px" destroy-on-close>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="任务名称" prop="title">
            <el-input v-model="form.title" />
          </el-form-item>
          <el-row>
            <el-col :span="12">
              <el-form-item label="类型" prop="check_type">
                <el-select v-model="form.check_type" style="width: 100%">
                  <el-option v-for="(t, k) in CHECK_TYPE" :key="k" :label="t" :value="Number(k)" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="年度">
                <el-input-number v-model="form.year" :min="2020" :max="2100" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="检查单位">
            <el-tree-select
              v-model="form.org_id"
              :data="orgTree"
              node-key="id"
              :props="{ label: 'org_name', children: 'children' }"
              check-strictly
              clearable
              placeholder="全部单位"
              style="width: 100%"
            />
          </el-form-item>
          <el-row>
            <el-col :span="12">
              <el-form-item label="开始日期">
                <el-date-picker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束日期">
                <el-date-picker v-model="form.end_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
        </template>
      </el-dialog>

      <!-- 核查记录子弹窗 -->
      <el-dialog v-model="checksDlg.visible" :title="'核查记录 - ' + checksDlg.task.title" width="760px" destroy-on-close>
        <div class="table-toolbar">
          <el-button v-perm="'ins:edit'" type="primary" :icon="Plus" size="small" @click="checkForm.visible = true">新增核查</el-button>
        </div>
        <el-table :data="checksDlg.rows" v-loading="checksDlg.loading" border stripe size="small">
          <el-table-column prop="computer_no" label="计算机编号" width="140" />
          <el-table-column prop="check_date" label="核查日期" width="110" />
          <el-table-column label="核查结果" width="100">
            <template #default="{ row }">
              <el-tag :type="resultTag(row.result)" size="small">{{ enumText(INS_RESULT, row.result) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="problem_desc" label="问题描述" min-width="150" show-overflow-tooltip />
          <el-table-column label="整改状态" width="100">
            <template #default="{ row }">{{ rectifyText(row.rectify_status) }}</template>
          </el-table-column>
          <el-table-column prop="rectify_remark" label="整改说明" min-width="120" show-overflow-tooltip />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button v-perm="'ins:edit'" v-if="Number(row.rectify_status) === 1" link type="warning" @click="openRectify(row)">整改登记</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 新增核查 -->
        <el-dialog v-model="checkForm.visible" title="新增核查" width="480px" append-to-body destroy-on-close>
          <el-form ref="checkFormRef" :model="checkForm" :rules="checkRules" label-width="90px">
            <el-form-item label="计算机" prop="computer_id">
              <el-select v-model="checkForm.computer_id" filterable style="width: 100%">
                <el-option v-for="c in computers" :key="c.id" :label="c.computer_no + ' ' + (c.brand || '')" :value="c.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="核查结果" prop="result">
              <el-select v-model="checkForm.result" style="width: 100%">
                <el-option v-for="(t, k) in INS_RESULT" :key="k" :label="t" :value="Number(k)" />
              </el-select>
            </el-form-item>
            <el-form-item label="问题描述">
              <el-input v-model="checkForm.problem_desc" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="checkForm.visible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="saveCheck">确定</el-button>
          </template>
        </el-dialog>

        <!-- 整改登记 -->
        <el-dialog v-model="rectifyDlg.visible" title="整改登记" width="460px" append-to-body destroy-on-close>
          <el-form label-width="90px">
            <el-form-item label="整改说明" required>
              <el-input v-model="rectifyDlg.remark" type="textarea" :rows="3" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="rectifyDlg.visible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="saveRectify">确定</el-button>
          </template>
        </el-dialog>
      </el-dialog>
    </el-tab-pane>

    <!-- Tab2：正版化评分（FR-10-05） -->
    <el-tab-pane label="正版化评分" name="score">
      <el-card shadow="never" class="page-card score-card" v-loading="score.loading">
        <template #header>
          <div class="score-header">
            <span class="card-title">正版化工作评分（满分 100 分）</span>
            <el-button v-perm="'stats:view'" :icon="Refresh" :loading="score.loading" @click="loadScore">重新评分</el-button>
          </div>
        </template>
        <el-row v-if="score.loaded" :gutter="24">
          <el-col :md="8" :xs="24">
            <div class="score-left">
              <el-progress type="dashboard" :percentage="score.total" :width="200" :stroke-width="14" :color="scoreColor">
                <template #default="{ percentage }">
                  <span class="score-num">{{ percentage }}</span>
                  <span class="score-cap">综合得分</span>
                </template>
              </el-progress>
              <div class="score-grade">
                <span>评级：</span>
                <el-tag :type="gradeTag(score.grade)" size="large">{{ score.grade }}</el-tag>
              </div>
            </div>
          </el-col>
          <el-col :md="16" :xs="24">
            <div v-for="d in score.dims" :key="d.key" class="dim-row">
              <div class="dim-head">
                <span class="dim-name">{{ d.name }}</span>
                <span class="dim-score">{{ d.score }} / {{ d.max }} 分</span>
              </div>
              <el-progress :percentage="dimPercent(d)" :stroke-width="12" :color="scoreColor" />
              <div class="dim-detail">{{ d.detail }}</div>
            </div>
          </el-col>
        </el-row>
        <el-empty v-else description="暂无评分数据" />
      </el-card>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup>
// 督查管理：Tab1 任务列表 + 核查记录子弹窗 + 整改登记（ins:view / ins:edit）
//           Tab2 正版化工作评分（GET /api/score，五维度量化评价）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'
import { CHECK_TYPE, TASK_STATUS, INS_RESULT, enumText } from '../../constants'

const activeTab = ref('task')
const tableRef = ref()
const orgTree = ref([])
const computers = ref([])
const formRef = ref()
const checkFormRef = ref()
const saving = ref(false)
const query = reactive({ kw: '', status: null, year: '', checkType: null })

const dlg = reactive({ visible: false, title: '新建任务', editId: null })
const form = reactive({ title: '', check_type: 1, year: new Date().getFullYear(), org_id: null, start_date: '', end_date: '', remark: '' })
const rules = {
  title: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  check_type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const checksDlg = reactive({ visible: false, task: {}, rows: [], loading: false })
const checkForm = reactive({ visible: false, computer_id: null, result: 1, problem_desc: '' })
const checkRules = {
  computer_id: [{ required: true, message: '请选择计算机', trigger: 'change' }],
  result: [{ required: true, message: '请选择核查结果', trigger: 'change' }]
}
const rectifyDlg = reactive({ visible: false, row: {}, remark: '' })

// 正版化评分：首次切到评分 Tab 懒加载
const score = reactive({ loaded: false, loading: false, total: 0, grade: '-', dims: [] })

async function loadScore() {
  score.loading = true
  try {
    const d = (await get('/score')) || {}
    score.total = Number(d.total) || 0
    score.grade = d.grade || '-'
    score.dims = d.dims || []
    score.loaded = true
  } finally {
    score.loading = false
  }
}

function onTabChange(tab) {
  if (tab === 'score' && !score.loaded) loadScore()
}

/** 分值 → 颜色：优秀绿/良好蓝/合格橙/需整改红 */
function scoreColor(p) {
  const n = Number(p) || 0
  return n >= 90 ? '#67c23a' : n >= 75 ? '#409eff' : n >= 60 ? '#e6a23c' : '#f56c6c'
}

function gradeTag(g) {
  return { 优秀: 'success', 良好: 'primary', 合格: 'warning', 需整改: 'danger' }[g] || 'info'
}

/** 维度得分百分比（score/max） */
function dimPercent(d) {
  return d.max ? Math.round((Number(d.score) * 100) / Number(d.max)) : 0
}

async function fetchData({ page, pageSize }) {
  return get('/inspections', {
    kw: query.kw || undefined,
    status: query.status === null ? undefined : query.status,
    year: query.year || undefined,
    checkType: query.checkType === null ? undefined : query.checkType,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', status: null, year: '', checkType: null })
}

function resultTag(r) {
  return { 1: 'success', 2: 'danger', 3: 'warning', 4: 'warning' }[Number(r)] || 'info'
}

function rectifyText(s) {
  return { 0: '无需整改', 1: '待整改', 2: '已整改' }[Number(s)] || '无需整改'
}

function openAdd() {
  dlg.title = '新建任务'
  dlg.editId = null
  Object.assign(form, { title: '', check_type: 1, year: new Date().getFullYear(), org_id: null, start_date: '', end_date: '', remark: '' })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑任务'
  dlg.editId = row.id
  Object.assign(form, {
    title: row.title || '',
    check_type: Number(row.check_type),
    year: Number(row.year) || new Date().getFullYear(),
    org_id: row.org_id ? Number(row.org_id) : null,
    start_date: row.start_date || '',
    end_date: row.end_date || '',
    remark: row.remark || ''
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/inspections/' + dlg.editId, { ...form })
    } else {
      await post('/inspections', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onFinish(row) {
  await put('/inspections/' + row.id + '/finish')
  ElMessage.success('任务已完成')
  reloadTable()
}

async function openChecks(row) {
  checksDlg.task = row
  checksDlg.visible = true
  checksDlg.loading = true
  try {
    checksDlg.rows = (await get('/inspections/checks/by-task/' + row.id)) || []
  } finally {
    checksDlg.loading = false
  }
}

async function saveCheck() {
  await checkFormRef.value.validate()
  saving.value = true
  try {
    await post('/inspections/checks', { task_id: checksDlg.task.id, computer_id: checkForm.computer_id, result: checkForm.result, problem_desc: checkForm.problem_desc })
    ElMessage.success('核查记录已保存')
    checkForm.visible = false
    Object.assign(checkForm, { computer_id: null, result: 1, problem_desc: '' })
    openChecks(checksDlg.task)
  } finally {
    saving.value = false
  }
}

function openRectify(row) {
  rectifyDlg.row = row
  rectifyDlg.remark = ''
  rectifyDlg.visible = true
}

async function saveRectify() {
  if (!rectifyDlg.remark) {
    ElMessage.warning('请填写整改说明')
    return
  }
  saving.value = true
  try {
    await put('/inspections/checks/' + rectifyDlg.row.id + '/rectify', { rectify_remark: rectifyDlg.remark })
    ElMessage.success('整改已登记')
    rectifyDlg.visible = false
    openChecks(checksDlg.task)
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/inspections/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(async () => {
  orgTree.value = (await get('/orgs/tree')) || []
  computers.value = (await get('/computers/options')) || []
})
</script>

<style scoped>
.inspect-tabs :deep(.el-tabs__content) {
  overflow: visible;
}
.score-card {
  min-height: 420px;
}
.score-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  font-weight: bold;
  color: #1f2d3d;
}
.score-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
}
.score-num {
  font-size: 44px;
  font-weight: bold;
  color: #1f2d3d;
  line-height: 1.1;
}
.score-cap {
  font-size: 13px;
  color: #909399;
}
.score-grade {
  font-size: 15px;
  color: #606266;
}
.dim-row {
  padding: 10px 0 14px;
  border-bottom: 1px dashed #ebeef5;
}
.dim-row:last-child {
  border-bottom: none;
}
.dim-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.dim-name {
  font-weight: bold;
  color: #303133;
}
.dim-score {
  color: #606266;
}
.dim-detail {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
