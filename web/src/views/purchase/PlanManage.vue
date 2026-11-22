<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="计划编号/名称" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px">
          <el-option v-for="(t, k) in REQ_STATUS" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="年度">
        <el-input v-model="query.year" placeholder="如 2026" clearable style="width: 110px" />
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'plan:edit'" type="primary" :icon="Plus" @click="openAdd">编制计划</el-button>
    </template>
    <el-table-column prop="plan_no" label="计划编号" width="170" />
    <el-table-column prop="title" label="计划名称" min-width="180" show-overflow-tooltip />
    <el-table-column prop="year" label="年度" width="80" />
    <el-table-column label="总金额（元）" width="130" align="right">
      <template #default="{ row }">{{ formatAmount(row.total_amount) }}</template>
    </el-table-column>
    <el-table-column label="状态" width="90">
      <template #default="{ row }">
        <el-tag :type="reqStatusTag(row.status)" size="small">{{ enumText(REQ_STATUS, row.status) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="audit_opinion" label="审核意见" min-width="130" show-overflow-tooltip />
    <el-table-column label="操作" width="190" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="openView(row)">查看</el-button>
        <el-button v-perm="'plan:edit'" v-if="canEdit(row)" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button v-perm="'plan:edit'" v-if="Number(row.status) === 1" link type="warning" @click="openAudit(row)">审核</el-button>
        <el-popconfirm v-perm="'plan:edit'" v-if="canEdit(row)" title="确定删除该计划吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 新增/编辑（items 明细子表格） -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="760px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-row>
        <el-col :span="16">
          <el-form-item label="计划名称" prop="title">
            <el-input v-model="form.title" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="年度" prop="year">
            <el-input v-model="form.year" placeholder="如 2026" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="采购明细">
        <div class="items-box">
          <el-button size="small" type="primary" plain :icon="Plus" class="items-add" @click="addItem">添加明细</el-button>
          <el-table :data="form.items" border size="small">
            <el-table-column label="软件/品目名称" min-width="180">
              <template #default="{ row }">
                <el-input v-model="row.software_name" placeholder="名称" />
              </template>
            </el-table-column>
            <el-table-column label="规格/版本" width="120">
              <template #default="{ row }">
                <el-input v-model="row.spec" placeholder="规格" />
              </template>
            </el-table-column>
            <el-table-column label="数量" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.qty" :min="1" size="small" style="width: 100%" controls-position="right" />
              </template>
            </el-table-column>
            <el-table-column label="单价（元）" width="130">
              <template #default="{ row }">
                <el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width: 100%" controls-position="right" />
              </template>
            </el-table-column>
            <el-table-column label="金额（元）" width="110" align="right">
              <template #default="{ row }">{{ itemAmount(row) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ $index }">
                <el-button link type="danger" size="small" @click="form.items.splice($index, 1)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form-item>
      <el-form-item label="总金额">
        <span class="total-line">合计：{{ formatAmount(itemsTotal()) }} 元</span>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button :loading="saving" @click="onSubmit(0)">存草稿</el-button>
      <el-button type="primary" :loading="saving" @click="onSubmit(1)">提交审核</el-button>
    </template>
  </el-dialog>

  <!-- 审核 -->
  <el-dialog v-model="auditDlg.visible" title="计划审核" width="480px" destroy-on-close>
    <el-descriptions :column="1" border class="mb12">
      <el-descriptions-item label="计划名称">{{ auditDlg.row.title }}</el-descriptions-item>
      <el-descriptions-item label="总金额">{{ formatAmount(auditDlg.row.total_amount) }} 元</el-descriptions-item>
    </el-descriptions>
    <el-form label-width="90px">
      <el-form-item label="审核结果">
        <el-radio-group v-model="auditDlg.status">
          <el-radio :value="2">通过</el-radio>
          <el-radio :value="3">驳回</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="审核意见">
        <el-input v-model="auditDlg.opinion" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="auditDlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveAudit">确定</el-button>
    </template>
  </el-dialog>

  <!-- 查看 -->
  <el-dialog v-model="viewDlg.visible" :title="viewDlg.row.plan_no || '计划详情'" width="700px">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="计划名称">{{ viewDlg.row.title }}</el-descriptions-item>
      <el-descriptions-item label="年度">{{ viewDlg.row.year }}</el-descriptions-item>
      <el-descriptions-item label="总金额">{{ formatAmount(viewDlg.row.total_amount) }} 元</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="reqStatusTag(viewDlg.row.status)" size="small">{{ enumText(REQ_STATUS, viewDlg.row.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="审核意见" :span="2">{{ viewDlg.row.audit_opinion || '-' }}</el-descriptions-item>
    </el-descriptions>
    <el-table :data="viewItems" border size="small" class="mt12">
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column prop="software_name" label="软件/品目名称" min-width="180" />
      <el-table-column prop="spec" label="规格/版本" width="120" />
      <el-table-column prop="qty" label="数量" width="80" align="center" />
      <el-table-column prop="price" label="单价（元）" width="110" align="right" />
      <el-table-column label="金额（元）" width="110" align="right">
        <template #default="{ row }">{{ itemAmount(row) }}</template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="viewDlg.visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 采购计划（附件4）：items 明细子表格编辑 + 审核（plan:view / plan:edit）
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'
import { REQ_STATUS, enumText, reqStatusTag } from '../../constants'

const tableRef = ref()
const formRef = ref()
const saving = ref(false)
const query = reactive({ kw: '', status: null, year: '' })

const dlg = reactive({ visible: false, title: '编制计划', editId: null })
const form = reactive({ title: '', year: String(new Date().getFullYear()), items: [], remark: '' })
const rules = {
  title: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  year: [{ required: true, message: '请输入年度', trigger: 'blur' }]
}

const auditDlg = reactive({ visible: false, row: {}, status: 2, opinion: '' })
const viewDlg = reactive({ visible: false, row: {} })
const viewItems = computed(() => (Array.isArray(viewDlg.row.items) ? viewDlg.row.items : []))

async function fetchData({ page, pageSize }) {
  return get('/plans', {
    kw: query.kw || undefined,
    status: query.status === null ? undefined : query.status,
    year: query.year || undefined,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', status: null, year: '' })
}

function formatAmount(v) {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function canEdit(row) {
  const s = Number(row.status)
  return s === 0 || s === 3
}

function itemAmount(row) {
  const qty = Number(row.qty) || 0
  const price = Number(row.price) || 0
  return (qty * price).toFixed(2)
}

function itemsTotal() {
  return form.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
}

function addItem() {
  form.items.push({ software_name: '', spec: '', qty: 1, price: 0 })
}

function openAdd() {
  dlg.title = '编制计划'
  dlg.editId = null
  Object.assign(form, { title: '', year: String(new Date().getFullYear()), items: [], remark: '' })
  dlg.visible = true
}

async function openEdit(row) {
  dlg.title = '编辑计划'
  dlg.editId = row.id
  const p = await get('/plans/' + row.id)
  Object.assign(form, {
    title: p.title || '',
    year: String(p.year || ''),
    items: Array.isArray(p.items) ? p.items.map((it) => ({ software_name: it.software_name || '', spec: it.spec || '', qty: Number(it.qty) || 1, price: Number(it.price) || 0 })) : [],
    remark: p.remark || ''
  })
  dlg.visible = true
}

/** 保存（status 0 草稿 / 1 提交审核） */
async function onSubmit(status) {
  await formRef.value.validate()
  if (!form.items.length) {
    ElMessage.warning('请至少添加一条采购明细')
    return
  }
  saving.value = true
  try {
    const body = { title: form.title, year: form.year, items: form.items, remark: form.remark, status }
    if (dlg.editId) {
      await put('/plans/' + dlg.editId, body)
    } else {
      await post('/plans', body)
    }
    ElMessage.success(status === 1 ? '提交成功' : '草稿已保存')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

function openAudit(row) {
  auditDlg.row = row
  auditDlg.status = 2
  auditDlg.opinion = ''
  auditDlg.visible = true
}

async function saveAudit() {
  saving.value = true
  try {
    await put('/plans/' + auditDlg.row.id + '/audit', { status: auditDlg.status, audit_opinion: auditDlg.opinion })
    ElMessage.success(auditDlg.status === 2 ? '审核通过' : '已驳回')
    auditDlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function openView(row) {
  viewDlg.row = await get('/plans/' + row.id)
  viewDlg.visible = true
}

async function onDel(row) {
  await del('/plans/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}
</script>

<style scoped>
.items-box {
  width: 100%;
}
.items-add {
  margin-bottom: 8px;
}
.total-line {
  color: #1f5aa8;
  font-weight: bold;
}
.mb12 {
  margin-bottom: 12px;
}
.mt12 {
  margin-top: 12px;
}
</style>
