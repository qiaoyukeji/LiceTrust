<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="query.kw = ''">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="软件名称/使用部门" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'free:edit'" type="primary" :icon="Plus" @click="openAdd">登记免费软件</el-button>
    </template>
    <el-table-column prop="software_name" label="软件名称" min-width="160" show-overflow-tooltip />
    <el-table-column label="软件类型" width="100">
      <template #default="{ row }">
        <el-tag size="small" type="success">免费软件</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="vendor" label="厂商" min-width="120" show-overflow-tooltip />
    <el-table-column prop="source" label="来源" width="120" />
    <el-table-column prop="use_dept" label="使用部门" width="130" />
    <el-table-column prop="use_reason" label="使用原因" min-width="160" show-overflow-tooltip />
    <el-table-column prop="service_contact" label="客服联系方式" width="150" show-overflow-tooltip />
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'free:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'free:edit'" title="确定删除该记录吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <el-dialog v-model="dlg.visible" :title="dlg.title" width="560px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="软件台账项" prop="software_id">
        <el-select v-model="form.software_id" filterable style="width: 100%" placeholder="选择软件资产库中的免费软件">
          <el-option v-for="s in softwareOptions" :key="s.id" :label="s.software_name + '（' + s.software_no + '）'" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="厂商">
        <el-input v-model="form.vendor" />
      </el-form-item>
      <el-form-item label="来源">
        <el-input v-model="form.source" placeholder="如 官网下载 / 随机预装" />
      </el-form-item>
      <el-form-item label="使用部门">
        <el-input v-model="form.use_dept" />
      </el-form-item>
      <el-form-item label="使用原因">
        <el-input v-model="form.use_reason" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="客服联系方式">
        <el-input v-model="form.service_contact" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 免费软件清单（附件6）：维护（free:view / free:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'

const tableRef = ref()
const formRef = ref()
const softwareOptions = ref([])
const saving = ref(false)
const query = reactive({ kw: '' })

const dlg = reactive({ visible: false, title: '登记免费软件', editId: null })
const form = reactive({ software_id: null, vendor: '', source: '', use_dept: '', use_reason: '', service_contact: '' })
const rules = {
  software_id: [{ required: true, message: '请选择软件', trigger: 'change' }]
}

async function fetchData({ page, pageSize }) {
  return get('/free-softwares', { kw: query.kw || undefined, page, pageSize })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function openAdd() {
  dlg.title = '登记免费软件'
  dlg.editId = null
  Object.assign(form, { software_id: null, vendor: '', source: '', use_dept: '', use_reason: '', service_contact: '' })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑免费软件'
  dlg.editId = row.id
  Object.assign(form, {
    software_id: Number(row.software_id),
    vendor: row.vendor || '',
    source: row.source || '',
    use_dept: row.use_dept || '',
    use_reason: row.use_reason || '',
    service_contact: row.service_contact || ''
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/free-softwares/' + dlg.editId, { ...form })
    } else {
      await post('/free-softwares', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/free-softwares/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(async () => {
  softwareOptions.value = (await get('/softwares/options')) || []
})
</script>
