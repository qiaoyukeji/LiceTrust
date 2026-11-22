<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="软件编号/名称/厂商" clearable style="width: 200px" @keyup.enter="reloadTable" />
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
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'software:edit'" type="primary" :icon="Plus" @click="openAdd">新增软件</el-button>
    </template>
    <el-table-column prop="software_no" label="软件编号" width="170" show-overflow-tooltip />
    <el-table-column prop="software_name" label="软件名称" min-width="170" show-overflow-tooltip />
    <el-table-column prop="version" label="版本" width="100" />
    <el-table-column label="分类" width="100">
      <template #default="{ row }">
        <el-tag size="small">{{ enumText(CATEGORY, row.category) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="软件类型" width="100">
      <template #default="{ row }">{{ enumText(SOFTWARE_TYPE, row.software_type) }}</template>
    </el-table-column>
    <el-table-column prop="vendor" label="厂商" width="120" show-overflow-tooltip />
    <el-table-column label="已安装/许可数" width="130" align="center">
      <template #default="{ row }">
        <span :class="complianceCls(row)">{{ row.install_count || 0 }} / {{ row.license_qty || 0 }}</span>
      </template>
    </el-table-column>
    <el-table-column label="合规状态" width="100">
      <template #default="{ row }">
        <el-tag :type="complianceTag(complianceOf(row))" size="small">{{ COMPLIANCE_TEXT[complianceOf(row)] }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="状态" width="80">
      <template #default="{ row }">
        <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" size="small">{{ Number(row.status) === 1 ? '启用' : '停用' }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'software:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'software:edit'" title="确定删除该软件吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <el-dialog v-model="dlg.visible" :title="dlg.title" width="580px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="软件名称" prop="software_name">
        <el-input v-model="form.software_name" />
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="版本">
            <el-input v-model="form.version" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="可使用版本">
            <el-input v-model="form.usable_version" placeholder="如 2021/2019" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="软件分类" prop="category">
        <el-select v-model="form.category" style="width: 100%">
          <el-option v-for="(t, k) in CATEGORY" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="软件类型" prop="software_type">
        <el-select v-model="form.software_type" style="width: 100%">
          <el-option v-for="(t, k) in SOFTWARE_TYPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="厂商">
        <el-input v-model="form.vendor" />
      </el-form-item>
      <el-form-item label="来源">
        <el-input v-model="form.source" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">停用</el-radio>
        </el-radio-group>
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
</template>

<script setup>
// 软件资产库：对账列（已安装/许可数）与合规 Tag（software:view / software:edit）
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'
import { CATEGORY, SOFTWARE_TYPE, COMPLIANCE_TEXT, enumText, complianceTag } from '../../constants'

const tableRef = ref()
const formRef = ref()
const saving = ref(false)
const query = reactive({ kw: '', category: null, softwareType: null, status: null })

const dlg = reactive({ visible: false, title: '新增软件', editId: null })
const form = reactive({ software_name: '', version: '', usable_version: '', category: 2, software_type: 1, vendor: '', source: '', status: 1, remark: '' })
const rules = {
  software_name: [{ required: true, message: '请输入软件名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择软件分类', trigger: 'change' }],
  software_type: [{ required: true, message: '请选择软件类型', trigger: 'change' }]
}

async function fetchData({ page, pageSize }) {
  return get('/softwares', {
    kw: query.kw || undefined,
    category: query.category === null ? undefined : query.category,
    softwareType: query.softwareType === null ? undefined : query.softwareType,
    status: query.status === null ? undefined : query.status,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', category: null, softwareType: null, status: null })
}

/** 对账状态：超装 over / 闲置 idle / 正常 ok（与后端 complianceOf 一致） */
function complianceOf(row) {
  const qty = Number(row.license_qty) || 0
  const used = Number(row.install_count) || 0
  if (qty > 0 && used > qty) return 'over'
  if (qty > 0 && used < qty * 0.5) return 'idle'
  return 'ok'
}

function complianceCls(row) {
  const c = complianceOf(row)
  return { over: 'cmp-over', idle: 'cmp-idle', ok: 'cmp-ok' }[c]
}

function openAdd() {
  dlg.title = '新增软件'
  dlg.editId = null
  Object.assign(form, { software_name: '', version: '', usable_version: '', category: 2, software_type: 1, vendor: '', source: '', status: 1, remark: '' })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑软件'
  dlg.editId = row.id
  Object.assign(form, {
    software_name: row.software_name || '',
    version: row.version || '',
    usable_version: row.usable_version || '',
    category: Number(row.category),
    software_type: Number(row.software_type),
    vendor: row.vendor || '',
    source: row.source || '',
    status: Number(row.status),
    remark: row.remark || ''
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/softwares/' + dlg.editId, { ...form })
    } else {
      await post('/softwares', { ...form })
    }
    ElMessage.success('保存成功（软件编号按规则自动生成）')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/softwares/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}
</script>

<style scoped>
.cmp-over {
  color: #f56c6c;
  font-weight: bold;
}
.cmp-ok {
  color: #67c23a;
}
.cmp-idle {
  color: #909399;
}
</style>
