<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="授权记录">
        <el-select v-model="query.entitlementId" clearable filterable remote :remote-method="searchEntitlements" placeholder="搜索软件授权" style="width: 240px">
          <el-option
            v-for="e in entitlementOptions"
            :key="e.id"
            :label="(e.software_name || '') + ' ' + (e.auth_type || '')"
            :value="e.id"
          />
        </el-select>
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'alloc:edit'" type="primary" :icon="Plus" @click="openAdd">新增分配</el-button>
    </template>
    <el-table-column label="软件" min-width="160" show-overflow-tooltip>
      <template #default="{ row }">{{ swName(row.entitlement_id) }}</template>
    </el-table-column>
    <el-table-column label="分配对象类型" width="120">
      <template #default="{ row }">{{ enumText(TARGET_TYPE, row.target_type) }}</template>
    </el-table-column>
    <el-table-column prop="target_name" label="分配对象" min-width="140" show-overflow-tooltip />
    <el-table-column prop="qty" label="分配数量" width="100" align="center" />
    <el-table-column label="降级使用" width="100">
      <template #default="{ row }">
        <el-tag :type="Number(row.downgrade_flag) === 1 ? 'warning' : 'info'" size="small">
          {{ Number(row.downgrade_flag) === 1 ? '允许' : '不允许' }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'alloc:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'alloc:edit'" title="确定删除该分配吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <el-dialog v-model="dlg.visible" :title="dlg.title" width="520px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="授权记录" prop="entitlement_id">
        <el-select v-model="form.entitlement_id" clearable filterable remote :remote-method="searchEntitlements" placeholder="搜索软件授权" style="width: 100%">
          <el-option
            v-for="e in entitlementOptions"
            :key="e.id"
            :label="(e.software_name || '') + '（许可 ' + (e.license_qty || 0) + '）'"
            :value="e.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="对象类型" prop="target_type">
        <el-select v-model="form.target_type" style="width: 100%">
          <el-option v-for="(t, k) in TARGET_TYPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="对象名称" prop="target_name">
        <el-input v-model="form.target_name" placeholder="如 第一分公司 / 信息化部" />
      </el-form-item>
      <el-form-item label="分配数量" prop="qty">
        <el-input-number v-model="form.qty" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="降级使用">
        <el-switch v-model="form.downgrade_flag" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 许可分配：按授权记录分配数量（alloc:view / alloc:edit，后端校验总量不超许可）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'
import { enumText } from '../../constants'

const TARGET_TYPE = { 1: '单位', 2: '部门', 3: '个人' }

const tableRef = ref()
const formRef = ref()
const entitlementOptions = ref([])
const saving = ref(false)
const query = reactive({ entitlementId: null })

const dlg = reactive({ visible: false, title: '新增分配', editId: null })
const form = reactive({ entitlement_id: null, target_type: 1, target_name: '', qty: 1, downgrade_flag: 0 })
const rules = {
  entitlement_id: [{ required: true, message: '请选择授权记录', trigger: 'change' }],
  target_type: [{ required: true, message: '请选择对象类型', trigger: 'change' }],
  target_name: [{ required: true, message: '请输入对象名称', trigger: 'blur' }],
  qty: [{ required: true, message: '请输入分配数量', trigger: 'blur' }]
}

async function fetchData({ page, pageSize }) {
  return get('/license-allocs', {
    entitlementId: query.entitlementId || undefined,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  query.entitlementId = null
}

/** 授权 → 软件名映射 */
function swName(entId) {
  const e = entitlementOptions.value.find((x) => Number(x.id) === Number(entId))
  return e ? e.software_name || e.software_no || String(entId) : String(entId)
}

async function searchEntitlements(kw) {
  const data = await get('/entitlements', { kw: kw || undefined, page: 1, pageSize: 50 })
  entitlementOptions.value = (data && data.list) || []
}

function openAdd() {
  dlg.title = '新增分配'
  dlg.editId = null
  Object.assign(form, { entitlement_id: query.entitlementId, target_type: 1, target_name: '', qty: 1, downgrade_flag: 0 })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑分配'
  dlg.editId = row.id
  Object.assign(form, {
    entitlement_id: Number(row.entitlement_id),
    target_type: Number(row.target_type),
    target_name: row.target_name || '',
    qty: Number(row.qty) || 1,
    downgrade_flag: Number(row.downgrade_flag) || 0
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/license-allocs/' + dlg.editId, { ...form })
    } else {
      await post('/license-allocs', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/license-allocs/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(() => {
  searchEntitlements('')
})
</script>
