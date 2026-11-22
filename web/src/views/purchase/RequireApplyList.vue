<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="申请编号/软件名称" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px">
          <el-option v-for="(t, k) in REQ_STATUS" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'require:edit'" type="primary" :icon="Plus" @click="openAdd">提出申请</el-button>
    </template>
    <el-table-column prop="apply_no" label="申请编号" width="170" />
    <el-table-column label="软件分类" width="110">
      <template #default="{ row }">{{ enumText(CATEGORY, row.software_category) }}</template>
    </el-table-column>
    <el-table-column prop="software_name" label="软件名称" min-width="150" show-overflow-tooltip />
    <el-table-column prop="software_use" label="软件用途" min-width="130" show-overflow-tooltip />
    <el-table-column prop="apply_qty" label="申请数量" width="90" align="center" />
    <el-table-column label="状态" width="90">
      <template #default="{ row }">
        <el-tag :type="reqStatusTag(row.status)" size="small">{{ enumText(REQ_STATUS, row.status) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="audit_opinion" label="审核意见" min-width="130" show-overflow-tooltip />
    <el-table-column prop="apply_time" label="申请时间" width="170">
      <template #default="{ row }">{{ str(row.apply_time) }}</template>
    </el-table-column>
    <el-table-column label="操作" width="190" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="openView(row)">查看</el-button>
        <el-button v-perm="'require:edit'" v-if="canEdit(row)" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button v-perm="'require:edit'" v-if="Number(row.status) === 1" link type="warning" @click="openAudit(row)">审核</el-button>
        <el-popconfirm v-perm="'require:edit'" v-if="Number(row.status) === 0" title="确定删除该申请吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 新增/编辑 -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="600px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="软件分类" prop="software_category">
        <el-select v-model="form.software_category" style="width: 100%">
          <el-option v-for="(t, k) in CATEGORY" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="软件名称" prop="software_name">
        <el-input v-model="form.software_name" />
      </el-form-item>
      <el-form-item label="软件用途">
        <el-input v-model="form.software_use" />
      </el-form-item>
      <el-form-item label="功能需求">
        <el-input v-model="form.function_req" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="申请数量">
        <el-input-number v-model="form.apply_qty" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button v-if="!dlg.editId" @click="onSubmit(0)" :loading="saving">存草稿</el-button>
      <el-button type="primary" @click="onSubmit(1)" :loading="saving">提交审核</el-button>
    </template>
  </el-dialog>

  <!-- 审核 -->
  <el-dialog v-model="auditDlg.visible" title="需求审核" width="480px" destroy-on-close>
    <el-descriptions :column="1" border class="mb12">
      <el-descriptions-item label="软件名称">{{ auditDlg.row.software_name }}</el-descriptions-item>
      <el-descriptions-item label="申请数量">{{ auditDlg.row.apply_qty }}</el-descriptions-item>
      <el-descriptions-item label="功能需求">{{ auditDlg.row.function_req || '-' }}</el-descriptions-item>
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
  <el-dialog v-model="viewDlg.visible" :title="viewDlg.row.apply_no || '申请详情'" width="600px">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="软件分类">{{ enumText(CATEGORY, viewDlg.row.software_category) }}</el-descriptions-item>
      <el-descriptions-item label="软件名称">{{ viewDlg.row.software_name }}</el-descriptions-item>
      <el-descriptions-item label="软件用途">{{ viewDlg.row.software_use || '-' }}</el-descriptions-item>
      <el-descriptions-item label="申请数量">{{ viewDlg.row.apply_qty }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="reqStatusTag(viewDlg.row.status)" size="small">{{ enumText(REQ_STATUS, viewDlg.row.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="申请时间">{{ str(viewDlg.row.apply_time) }}</el-descriptions-item>
      <el-descriptions-item label="功能需求" :span="2">{{ viewDlg.row.function_req || '-' }}</el-descriptions-item>
      <el-descriptions-item label="审核意见" :span="2">{{ viewDlg.row.audit_opinion || '-' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ viewDlg.row.remark || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="viewDlg.visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 需求申请（附件5）：申请/草稿/审核（require:view / require:edit）
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'
import { CATEGORY, REQ_STATUS, enumText, reqStatusTag } from '../../constants'

const tableRef = ref()
const formRef = ref()
const saving = ref(false)
const query = reactive({ kw: '', status: null })

const dlg = reactive({ visible: false, title: '提出申请', editId: null, pendingStatus: 1 })
const form = reactive({ software_category: 2, software_name: '', software_use: '', function_req: '', apply_qty: 1, remark: '' })
const rules = {
  software_category: [{ required: true, message: '请选择软件分类', trigger: 'change' }],
  software_name: [{ required: true, message: '请输入软件名称', trigger: 'blur' }]
}

const auditDlg = reactive({ visible: false, row: {}, status: 2, opinion: '' })
const viewDlg = reactive({ visible: false, row: {} })

async function fetchData({ page, pageSize }) {
  return get('/require-applies', {
    kw: query.kw || undefined,
    status: query.status === null ? undefined : query.status,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', status: null })
}

function str(v) {
  return String(v || '').slice(0, 19)
}

function canEdit(row) {
  const s = Number(row.status)
  return s === 0 || s === 3
}

function openAdd() {
  dlg.title = '提出申请'
  dlg.editId = null
  Object.assign(form, { software_category: 2, software_name: '', software_use: '', function_req: '', apply_qty: 1, remark: '' })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑申请'
  dlg.editId = row.id
  Object.assign(form, {
    software_category: Number(row.software_category),
    software_name: row.software_name || '',
    software_use: row.software_use || '',
    function_req: row.function_req || '',
    apply_qty: Number(row.apply_qty) || 1,
    remark: row.remark || ''
  })
  dlg.visible = true
}

/** 保存（status 0 草稿 / 1 提交审核） */
async function onSubmit(status) {
  await formRef.value.validate()
  saving.value = true
  try {
    const body = { ...form, status }
    if (dlg.editId) {
      await put('/require-applies/' + dlg.editId, body)
    } else {
      await post('/require-applies', body)
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
    await put('/require-applies/' + auditDlg.row.id + '/audit', { status: auditDlg.status, audit_opinion: auditDlg.opinion })
    ElMessage.success(auditDlg.status === 2 ? '审核通过' : '已驳回')
    auditDlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function openView(row) {
  viewDlg.row = await get('/require-applies/' + row.id)
  viewDlg.visible = true
}

async function onDel(row) {
  await del('/require-applies/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}
</style>
