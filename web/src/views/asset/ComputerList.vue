<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="编号/品牌/型号/使用人" clearable style="width: 200px" @keyup.enter="reloadTable" />
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
      <el-form-item label="计算机类型">
        <el-select v-model="query.computerType" clearable placeholder="全部" style="width: 130px">
          <el-option v-for="(t, k) in COMPUTER_TYPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
          <el-option v-for="(t, k) in COMPUTER_STATUS" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'computer:edit'" type="primary" :icon="Plus" @click="openAdd">登记电脑档案</el-button>
    </template>
    <el-table-column prop="computer_no" label="计算机编号" width="140" />
    <el-table-column prop="brand" label="品牌" width="110" />
    <el-table-column prop="model" label="型号" width="110" show-overflow-tooltip />
    <el-table-column label="类型" width="90">
      <template #default="{ row }">{{ enumText(COMPUTER_TYPE, row.computer_type) }}</template>
    </el-table-column>
    <el-table-column prop="org_name" label="所属单位" min-width="140" show-overflow-tooltip />
    <el-table-column prop="dept_name" label="所属部门" min-width="120" show-overflow-tooltip />
    <el-table-column prop="user_name" label="使用人" width="90" />
    <el-table-column prop="location" label="存放位置" width="110" show-overflow-tooltip />
    <el-table-column prop="enable_date" label="启用日期" width="110" />
    <el-table-column label="状态" width="80">
      <template #default="{ row }">
        <el-tag :type="computerStatusTag(row.status)">{{ enumText(COMPUTER_STATUS, row.status) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="install_count" label="已装软件" width="90">
      <template #default="{ row }">
        <el-link type="primary" @click="$router.push('/computers/' + row.id)">{{ row.install_count }}</el-link>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="180" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="$router.push('/computers/' + row.id)">一机一档</el-button>
        <el-button v-perm="'computer:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'computer:edit'" title="确定删除该计算机吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <ComputerWizard ref="wizardRef" @saved="reloadTable" />
  <QrScanner ref="qrRef" @detected="onQrDetected" />

  <el-dialog v-model="dlg.visible" :title="dlg.title" width="620px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="计算机编号">
        <el-input v-model="form.computer_no" placeholder="留空则按规则自动生成" :disabled="dlg.editId != null" />
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="品牌">
            <el-input v-model="form.brand" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="型号">
            <el-input v-model="form.model" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="SN 序列号">
        <el-input v-model="form.sn" />
      </el-form-item>
      <el-form-item label="固定资产编号">
        <el-input v-model="form.asset_no" placeholder="非必填：手填、扫码枪输入或点右侧扫码识别">
          <template #append>
            <el-button :icon="Camera" @click="qrRef && qrRef.open()">扫码</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="采购时间">
            <el-date-picker v-model="form.purchase_date" type="date" value-format="YYYY-MM-DD" placeholder="非必填" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="填报时间">
            <el-date-picker v-model="form.report_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="计算机类型" prop="computer_type">
        <el-select v-model="form.computer_type" style="width: 100%">
          <el-option v-for="(t, k) in COMPUTER_TYPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属单位" prop="org_id">
        <el-tree-select
          v-model="form.org_id"
          :data="orgTree"
          node-key="id"
          :props="{ label: 'org_name', children: 'children' }"
          check-strictly
          style="width: 100%"
          @change="loadDlgDepts"
        />
      </el-form-item>
      <el-form-item label="所属部门" prop="dept_id">
        <el-tree-select
          v-model="form.dept_id"
          :data="dlgDepts"
          node-key="id"
          :props="{ label: 'dept_name', children: 'children' }"
          check-strictly
          clearable
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="使用人">
        <el-select v-model="form.user_id" clearable filterable style="width: 100%">
          <el-option v-for="u in dlgUsers" :key="u.id" :label="u.real_name + '（' + u.username + '）'" :value="u.id" />
        </el-select>
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="存放位置">
            <el-input v-model="form.location" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="启用日期">
            <el-date-picker v-model="form.enable_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio v-for="(t, k) in COMPUTER_STATUS" :key="k" :value="Number(k)">{{ t }}</el-radio>
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
// 计算机台账：多条件筛选列表 + 新增/编辑/删除（computer:view / computer:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Camera } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import ComputerWizard from '../../components/ComputerWizard.vue'
import QrScanner from '../../components/QrScanner.vue'
import { get, post, put, del } from '../../api/request'
import { COMPUTER_TYPE, COMPUTER_STATUS, enumText, computerStatusTag } from '../../constants'

const tableRef = ref()
const wizardRef = ref()
const qrRef = ref()
const orgTree = ref([])
const dlgDepts = ref([])
const dlgUsers = ref([])
const formRef = ref()
const saving = ref(false)

const query = reactive({ kw: '', orgId: null, computerType: null, status: null })

const dlg = reactive({ visible: false, title: '编辑计算机', editId: null })
const form = reactive({
  computer_no: '', asset_no: '', brand: '', model: '', sn: '', computer_type: 2,
  org_id: null, dept_id: null, user_id: null, location: '', enable_date: '',
  purchase_date: '', report_time: '', status: 1, remark: ''
})
const rules = {
  computer_type: [{ required: true, message: '请选择计算机类型', trigger: 'change' }],
  org_id: [{ required: true, message: '请选择所属单位', trigger: 'change' }],
  dept_id: [{ required: true, message: '请选择所属部门', trigger: 'change' }]
}

async function fetchData({ page, pageSize }) {
  return get('/computers', {
    kw: query.kw || undefined,
    orgId: query.orgId || undefined,
    computerType: query.computerType === null ? undefined : query.computerType,
    status: query.status === null ? undefined : query.status,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', orgId: null, computerType: null, status: null })
}

async function loadDlgDepts() {
  form.dept_id = null
  form.user_id = null
  dlgUsers.value = []
  if (form.org_id) {
    dlgDepts.value = (await get('/depts/tree', { orgId: form.org_id })) || []
    const users = await get('/users', { orgId: form.org_id, page: 1, pageSize: 200 })
    dlgUsers.value = (users && users.list) || []
  } else {
    dlgDepts.value = []
  }
}

function openAdd() {
  // 日常登记走分步向导：人员信息 → 电脑信息 → 生成档案
  wizardRef.value && wizardRef.value.open()
}

async function openEdit(row) {
  dlg.title = '编辑计算机'
  dlg.editId = row.id
  Object.assign(form, {
    computer_no: row.computer_no || '',
    asset_no: row.asset_no || '',
    brand: row.brand || '',
    model: row.model || '',
    sn: row.sn || '',
    computer_type: Number(row.computer_type),
    org_id: row.org_id ? Number(row.org_id) : null,
    dept_id: row.dept_id ? Number(row.dept_id) : null,
    user_id: row.user_id ? Number(row.user_id) : null,
    location: row.location || '',
    enable_date: row.enable_date || '',
    purchase_date: row.purchase_date || '',
    report_time: row.report_time || '',
    status: Number(row.status),
    remark: row.remark || ''
  })
  await loadDlgDepts()
  form.dept_id = row.dept_id ? Number(row.dept_id) : null
  form.user_id = row.user_id ? Number(row.user_id) : null
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    await put('/computers/' + dlg.editId, { ...form })
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

function onQrDetected(code) {
  form.asset_no = code
  ElMessage.success('已识别固定资产编号：' + code)
}

async function onDel(row) {
  await del('/computers/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(async () => {
  orgTree.value = (await get('/orgs/tree')) || []
})
</script>
