<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="账号/姓名" clearable style="width: 180px" @keyup.enter="reloadTable" />
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
          @change="onOrgChange"
        />
      </el-form-item>
      <el-form-item label="所属部门">
        <el-tree-select
          v-model="query.deptId"
          :data="deptTree"
          node-key="id"
          :props="{ label: 'dept_name', children: 'children' }"
          check-strictly
          clearable
          placeholder="全部"
          style="width: 180px"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'user:edit'" type="primary" :icon="Plus" @click="openAdd">新增用户</el-button>
    </template>
    <el-table-column prop="username" label="登录账号" width="120" />
    <el-table-column prop="real_name" label="姓名" width="100" />
    <el-table-column prop="emp_no" label="工号" width="100" />
    <el-table-column prop="org_name" label="所属单位" min-width="140" show-overflow-tooltip />
    <el-table-column prop="dept_name" label="所属部门" min-width="120" show-overflow-tooltip />
    <el-table-column prop="position" label="职务" width="110" show-overflow-tooltip />
    <el-table-column prop="phone" label="联系电话" width="130" />
    <el-table-column label="使用计算机" width="100">
      <template #default="{ row }">
        <el-tag :type="Number(row.use_computer) === 1 ? 'success' : 'info'">{{ Number(row.use_computer) === 1 ? '是' : '否' }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="状态" width="80">
      <template #default="{ row }">
        <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">{{ Number(row.status) === 1 ? '启用' : '停用' }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="220" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'user:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button v-perm="'user:edit'" link type="warning" @click="openResetPwd(row)">重置密码</el-button>
        <el-button v-perm="'user:edit'" link type="primary" @click="openRoles(row)">分配角色</el-button>
        <el-popconfirm v-perm="'user:edit'" title="确定删除该用户吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 新增/编辑对话框 -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="560px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="登录账号" prop="username">
        <el-input v-model="form.username" :disabled="dlg.editId != null" placeholder="登录账号" />
      </el-form-item>
      <el-form-item v-if="dlg.editId == null" label="初始密码">
        <el-input v-model="form.password" placeholder="默认 123456" />
      </el-form-item>
      <el-form-item label="姓名" prop="real_name">
        <el-input v-model="form.real_name" />
      </el-form-item>
      <el-form-item label="工号">
        <el-input v-model="form.emp_no" />
      </el-form-item>
      <el-form-item label="所属单位">
        <el-tree-select
          v-model="form.org_id"
          :data="orgTree"
          node-key="id"
          :props="{ label: 'org_name', children: 'children' }"
          check-strictly
          clearable
          style="width: 100%"
          @change="form.dept_id = null"
        />
      </el-form-item>
      <el-form-item label="所属部门">
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
      <el-form-item label="职务">
        <el-input v-model="form.position" />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input v-model="form.phone" />
      </el-form-item>
      <el-form-item label="使用计算机">
        <el-switch v-model="form.use_computer" :active-value="1" :inactive-value="0" />
      </el-form-item>
      <el-form-item v-if="dlg.editId != null" label="状态">
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

  <!-- 重置密码 -->
  <el-dialog v-model="pwdDlg.visible" title="重置密码" width="420px" destroy-on-close>
    <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
      <el-form-item label="用户">
        <span>{{ pwdDlg.realName }}</span>
      </el-form-item>
      <el-form-item label="新密码" prop="password">
        <el-input v-model="pwdForm.password" placeholder="请输入新密码（不少于6位）" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="pwdDlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="savePwd">确定</el-button>
    </template>
  </el-dialog>

  <!-- 分配角色 -->
  <el-dialog v-model="roleDlg.visible" title="分配角色" width="460px" destroy-on-close>
    <el-checkbox-group v-model="roleDlg.roleIds">
      <el-checkbox v-for="r in roleOptions" :key="r.id" :value="r.id" class="role-check">
        {{ r.role_name }}（{{ r.role_code }}）
      </el-checkbox>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="roleDlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveRoles">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 用户管理：列表/新增/编辑/重置密码/分配角色（user:view / user:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'

const tableRef = ref()
const orgTree = ref([])
const deptTree = ref([])
const dlgDepts = ref([])
const roleOptions = ref([])
const saving = ref(false)
const formRef = ref()
const pwdFormRef = ref()

const query = reactive({ kw: '', orgId: null, deptId: null, status: null })

const dlg = reactive({ visible: false, title: '新增用户', editId: null })
const form = reactive({ username: '', password: '', real_name: '', emp_no: '', org_id: null, dept_id: null, position: '', phone: '', use_computer: 1, status: 1, remark: '' })
const rules = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  real_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const pwdDlg = reactive({ visible: false, id: null, realName: '' })
const pwdForm = reactive({ password: '' })
const pwdRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码不少于6位', trigger: 'blur' }
  ]
}

const roleDlg = reactive({ visible: false, userId: null, roleIds: [] })

/** 列表数据加载 */
async function fetchData({ page, pageSize }) {
  return get('/users', {
    kw: query.kw || undefined,
    orgId: query.orgId || undefined,
    deptId: query.deptId || undefined,
    status: query.status === null ? undefined : query.status,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', orgId: null, deptId: null, status: null })
  deptTree.value = []
}

function onOrgChange(v) {
  query.deptId = null
  deptTree.value = []
  if (v) get('/depts/tree', { orgId: v }).then((t) => (deptTree.value = t || []))
}

function openAdd() {
  dlg.title = '新增用户'
  dlg.editId = null
  Object.assign(form, { username: '', password: '', real_name: '', emp_no: '', org_id: null, dept_id: null, position: '', phone: '', use_computer: 1, status: 1, remark: '' })
  dlgDepts.value = []
  dlg.visible = true
}

async function openEdit(row) {
  dlg.title = '编辑用户'
  dlg.editId = row.id
  const u = await get('/users/' + row.id)
  Object.assign(form, {
    username: u.username,
    real_name: u.real_name,
    emp_no: u.emp_no || '',
    org_id: u.org_id ? Number(u.org_id) : null,
    dept_id: u.dept_id ? Number(u.dept_id) : null,
    position: u.position || '',
    phone: u.phone || '',
    use_computer: Number(u.use_computer),
    status: Number(u.status),
    remark: u.remark || ''
  })
  if (form.org_id) {
    dlgDepts.value = (await get('/depts/tree', { orgId: form.org_id })) || []
  }
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/users/' + dlg.editId, { ...form })
    } else {
      await post('/users', { ...form, password: form.password || '123456' })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

function openResetPwd(row) {
  pwdDlg.id = row.id
  pwdDlg.realName = row.real_name
  pwdForm.password = ''
  pwdDlg.visible = true
}

async function savePwd() {
  await pwdFormRef.value.validate()
  saving.value = true
  try {
    await put('/users/' + pwdDlg.id + '/password', { password: pwdForm.password })
    ElMessage.success('密码已重置')
    pwdDlg.visible = false
  } finally {
    saving.value = false
  }
}

async function openRoles(row) {
  roleDlg.userId = row.id
  const u = await get('/users/' + row.id)
  roleDlg.roleIds = (u.role_ids || []).map(Number)
  roleDlg.visible = true
}

async function saveRoles() {
  saving.value = true
  try {
    await put('/users/' + roleDlg.userId, { role_ids: roleDlg.roleIds })
    ElMessage.success('角色分配成功')
    roleDlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/users/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(async () => {
  orgTree.value = (await get('/orgs/tree')) || []
  roleOptions.value = (await get('/roles/all')) || []
})
</script>

<style scoped>
.role-check {
  display: block;
  margin-right: 0;
}
</style>
