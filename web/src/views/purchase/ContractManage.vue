<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="query.kw = ''">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="合同编号/名称/供应商" clearable style="width: 220px" @keyup.enter="reloadTable" />
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'contract:edit'" type="primary" :icon="Plus" @click="openAdd">新增合同</el-button>
    </template>
    <el-table-column prop="contract_no" label="合同编号" width="160" />
    <el-table-column prop="contract_name" label="合同名称" min-width="200" show-overflow-tooltip />
    <el-table-column prop="supplier" label="供应商" min-width="140" show-overflow-tooltip />
    <el-table-column prop="sign_date" label="签订日期" width="110" />
    <el-table-column prop="effective_date" label="生效日期" width="110" />
    <el-table-column prop="expire_date" label="到期日期" width="110" />
    <el-table-column label="金额（元）" width="130" align="right">
      <template #default="{ row }">{{ formatAmount(row.amount) }}</template>
    </el-table-column>
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="openView(row)">查看</el-button>
        <el-button v-perm="'contract:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'contract:edit'" title="确定删除该合同吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 新增/编辑 -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="620px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="合同名称" prop="contract_name">
        <el-input v-model="form.contract_name" />
      </el-form-item>
      <el-form-item label="供应商">
        <el-input v-model="form.supplier" />
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="签订日期">
            <el-date-picker v-model="form.sign_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="生效日期">
            <el-date-picker v-model="form.effective_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="到期日期">
            <el-date-picker v-model="form.expire_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="金额（元）">
            <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="关联合同文件">
        <el-input v-model="form.file_url" placeholder="文件地址（可通过上传接口获得）" />
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

  <!-- 查看 -->
  <el-dialog v-model="viewDlg.visible" :title="viewDlg.row.contract_name || '合同详情'" width="640px">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="合同编号">{{ viewDlg.row.contract_no }}</el-descriptions-item>
      <el-descriptions-item label="供应商">{{ viewDlg.row.supplier || '-' }}</el-descriptions-item>
      <el-descriptions-item label="签订日期">{{ viewDlg.row.sign_date || '-' }}</el-descriptions-item>
      <el-descriptions-item label="生效日期">{{ viewDlg.row.effective_date || '-' }}</el-descriptions-item>
      <el-descriptions-item label="到期日期">{{ viewDlg.row.expire_date || '-' }}</el-descriptions-item>
      <el-descriptions-item label="金额（元）">{{ formatAmount(viewDlg.row.amount) }}</el-descriptions-item>
      <el-descriptions-item label="合同文件" :span="2">
        <el-link v-if="viewDlg.row.file_url" type="primary" :href="viewDlg.row.file_url" target="_blank">查看附件</el-link>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ viewDlg.row.remark || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="viewDlg.visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 合同管理：列表/查看/新增/编辑/删除（contract:view / contract:edit）
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'

const tableRef = ref()
const formRef = ref()
const saving = ref(false)
const query = reactive({ kw: '' })

const dlg = reactive({ visible: false, title: '新增合同', editId: null })
const form = reactive({ contract_name: '', supplier: '', sign_date: '', effective_date: '', expire_date: '', amount: 0, file_url: '', remark: '' })
const rules = {
  contract_name: [{ required: true, message: '请输入合同名称', trigger: 'blur' }]
}

const viewDlg = reactive({ visible: false, row: {} })

async function fetchData({ page, pageSize }) {
  return get('/contracts', { kw: query.kw || undefined, page, pageSize })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function formatAmount(v) {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function openAdd() {
  dlg.title = '新增合同'
  dlg.editId = null
  Object.assign(form, { contract_name: '', supplier: '', sign_date: '', effective_date: '', expire_date: '', amount: 0, file_url: '', remark: '' })
  dlg.visible = true
}

async function openEdit(row) {
  dlg.title = '编辑合同'
  dlg.editId = row.id
  const c = await get('/contracts/' + row.id)
  Object.assign(form, {
    contract_name: c.contract_name || '',
    supplier: c.supplier || '',
    sign_date: c.sign_date || '',
    effective_date: c.effective_date || '',
    expire_date: c.expire_date || '',
    amount: Number(c.amount) || 0,
    file_url: c.file_url || '',
    remark: c.remark || ''
  })
  dlg.visible = true
}

async function openView(row) {
  viewDlg.row = await get('/contracts/' + row.id)
  viewDlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/contracts/' + dlg.editId, { ...form })
    } else {
      await post('/contracts', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/contracts/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}
</script>
