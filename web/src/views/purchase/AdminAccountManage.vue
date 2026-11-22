<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="账号/软件名称" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
      <el-form-item label="软件">
        <el-select v-model="query.softwareId" clearable filterable placeholder="全部" style="width: 180px">
          <el-option v-for="s in softwareOptions" :key="s.id" :label="s.software_name" :value="s.id" />
        </el-select>
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'adminaccount:edit'" type="primary" :icon="Plus" @click="openAdd">新增账号</el-button>
    </template>
    <el-table-column prop="software_name" label="所属软件" min-width="150" show-overflow-tooltip />
    <el-table-column prop="account_name" label="管理员账号" width="160" />
    <el-table-column prop="account_pwd" label="密码（掩码）" width="120">
      <template #default="{ row }">
        <span class="pwd-mask">{{ row.account_pwd }}</span>
      </template>
    </el-table-column>
    <el-table-column label="保管人" width="110">
      <template #default="{ row }">{{ holderName(row.holder_id) }}</template>
    </el-table-column>
    <el-table-column prop="holder_phone" label="保管人电话" width="130" />
    <el-table-column prop="permission_desc" label="权限说明" min-width="150" show-overflow-tooltip />
    <el-table-column prop="change_date" label="变更日期" width="110" />
    <el-table-column label="操作" width="170" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'adminaccount:edit'" link type="warning" @click="onReveal(row)">查看密码</el-button>
        <el-button v-perm="'adminaccount:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'adminaccount:edit'" title="确定删除该账号吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 新增/编辑 -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="560px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="所属软件" prop="software_id">
        <el-select v-model="form.software_id" filterable style="width: 100%">
          <el-option v-for="s in softwareOptions" :key="s.id" :label="s.software_name + '（' + s.software_no + '）'" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="管理员账号" prop="account_name">
        <el-input v-model="form.account_name" />
      </el-form-item>
      <el-form-item label="登录密码">
        <el-input v-model="form.account_pwd" type="password" show-password placeholder="输入明文将加密保存；留空则不变更" />
      </el-form-item>
      <el-form-item label="保管人">
        <el-select v-model="form.holder_id" clearable filterable style="width: 100%">
          <el-option v-for="u in userOptions" :key="u.id" :label="u.real_name + '（' + u.username + '）'" :value="u.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="保管人电话">
        <el-input v-model="form.holder_phone" />
      </el-form-item>
      <el-form-item label="权限说明">
        <el-input v-model="form.permission_desc" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="变更日期">
        <el-date-picker v-model="form.change_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
    </template>
  </el-dialog>

  <!-- 二次认证查看明文 -->
  <RevealDialog v-model="reveal.visible" :url="reveal.url" @revealed="onRevealed" />

  <!-- 明文结果 -->
  <el-dialog v-model="result.visible" title="账号密码（明文）" width="480px">
    <el-alert title="请妥善保管，该操作已记录审计日志" type="error" :closable="false" show-icon class="mb12" />
    <el-form label-width="90px">
      <el-form-item label="账号">
        <el-input :model-value="result.data.account_name" readonly />
      </el-form-item>
      <el-form-item label="密码">
        <el-input :model-value="result.data.account_pwd" readonly />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="result.visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 管理员账号：密码掩码 + 二次认证查看明文（adminaccount:view / adminaccount:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import RevealDialog from '../../components/RevealDialog.vue'
import { get, post, put, del } from '../../api/request'

const tableRef = ref()
const formRef = ref()
const softwareOptions = ref([])
const userOptions = ref([])
const saving = ref(false)
const query = reactive({ kw: '', softwareId: null })

const dlg = reactive({ visible: false, title: '新增账号', editId: null })
const form = reactive({ software_id: null, account_name: '', account_pwd: '', holder_id: null, holder_phone: '', permission_desc: '', change_date: '' })
const rules = {
  software_id: [{ required: true, message: '请选择软件', trigger: 'change' }],
  account_name: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }]
}

const reveal = reactive({ visible: false, url: '' })
const result = reactive({ visible: false, data: {} })

async function fetchData({ page, pageSize }) {
  return get('/admin-accounts', {
    kw: query.kw || undefined,
    softwareId: query.softwareId || undefined,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', softwareId: null })
}

function holderName(id) {
  const u = userOptions.value.find((x) => Number(x.id) === Number(id))
  return u ? u.real_name : '-'
}

function onReveal(row) {
  reveal.url = '/admin-accounts/' + row.id + '/reveal'
  reveal.visible = true
}

function onRevealed(data) {
  result.data = data || {}
  result.visible = true
}

function openAdd() {
  dlg.title = '新增账号'
  dlg.editId = null
  Object.assign(form, { software_id: null, account_name: '', account_pwd: '', holder_id: null, holder_phone: '', permission_desc: '', change_date: '' })
  dlg.visible = true
}

async function openEdit(row) {
  dlg.title = '编辑账号'
  dlg.editId = row.id
  Object.assign(form, {
    software_id: Number(row.software_id),
    account_name: row.account_name || '',
    account_pwd: '',
    holder_id: row.holder_id ? Number(row.holder_id) : null,
    holder_phone: row.holder_phone || '',
    permission_desc: row.permission_desc || '',
    change_date: row.change_date || ''
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/admin-accounts/' + dlg.editId, { ...form })
    } else {
      await post('/admin-accounts', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/admin-accounts/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(async () => {
  softwareOptions.value = (await get('/softwares/options')) || []
  const users = await get('/users', { page: 1, pageSize: 200 })
  userOptions.value = (users && users.list) || []
})
</script>

<style scoped>
.pwd-mask {
  color: #909399;
  letter-spacing: 2px;
}
.mb12 {
  margin-bottom: 12px;
}
</style>
