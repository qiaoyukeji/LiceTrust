<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="姓名/分工" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'leader:edit'" type="primary" :icon="Plus" @click="openAdd">新增成员</el-button>
    </template>
    <el-table-column prop="division" label="分工" width="140" />
    <el-table-column prop="dept" label="部门" min-width="150" />
    <el-table-column prop="position" label="职务" width="130" />
    <el-table-column prop="name" label="姓名" width="100" />
    <el-table-column prop="phone" label="联系电话" width="140" />
    <el-table-column prop="fax" label="传真" width="140" />
    <el-table-column prop="sort_no" label="排序" width="80" />
    <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'leader:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'leader:edit'" title="确定删除该成员吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <el-dialog v-model="dlg.visible" :title="dlg.title" width="520px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="分工" prop="division">
        <el-input v-model="form.division" placeholder="如 组长 / 副组长 / 成员" />
      </el-form-item>
      <el-form-item label="部门" prop="dept">
        <el-input v-model="form.dept" />
      </el-form-item>
      <el-form-item label="职务">
        <el-input v-model="form.position" />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input v-model="form.phone" />
      </el-form-item>
      <el-form-item label="传真">
        <el-input v-model="form.fax" />
      </el-form-item>
      <el-form-item label="排序号">
        <el-input-number v-model="form.sort_no" :min="0" style="width: 100%" />
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
// 领导小组（附件1）：成员维护（leader:view / leader:edit）
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'

const tableRef = ref()
const formRef = ref()
const saving = ref(false)
const query = reactive({ kw: '' })

const dlg = reactive({ visible: false, title: '新增成员', editId: null })
const form = reactive({ division: '', dept: '', position: '', name: '', phone: '', fax: '', sort_no: 0, remark: '' })
const rules = {
  division: [{ required: true, message: '请输入分工', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

async function fetchData({ page, pageSize }) {
  return get('/leaders', { kw: query.kw || undefined, page, pageSize })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function openAdd() {
  dlg.title = '新增成员'
  dlg.editId = null
  Object.assign(form, { division: '', dept: '', position: '', name: '', phone: '', fax: '', sort_no: 0, remark: '' })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑成员'
  dlg.editId = row.id
  Object.assign(form, {
    division: row.division || '',
    dept: row.dept || '',
    position: row.position || '',
    name: row.name || '',
    phone: row.phone || '',
    fax: row.fax || '',
    sort_no: Number(row.sort_no) || 0,
    remark: row.remark || ''
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/leaders/' + dlg.editId, { ...form })
    } else {
      await post('/leaders', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/leaders/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}
</script>
