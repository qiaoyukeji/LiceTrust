<template>
  <div class="role-page">
    <el-alert
      v-if="!isPlatform"
      title="系统参数/字典/角色为平台级设置，请联系平台运营方修改"
      type="warning"
      :closable="false"
      show-icon
      class="mb12"
    />
    <CrudTable ref="tableRef" :fetcher="fetchData" @reset="query.kw = ''">
      <template #query>
        <el-form-item label="关键字">
          <el-input v-model="query.kw" placeholder="角色编码/名称" clearable style="width: 200px" @keyup.enter="reloadTable" />
        </el-form-item>
      </template>
      <template #toolbar>
        <el-button v-if="isPlatform" v-perm="'role:edit'" type="primary" :icon="Plus" @click="openAdd">新增角色</el-button>
      </template>
      <el-table-column prop="role_code" label="角色编码" width="150" />
      <el-table-column prop="role_name" label="角色名称" min-width="140" />
      <el-table-column label="数据权限" width="120">
        <template #default="{ row }">
          <el-tag>{{ enumText(DATA_SCOPE, row.data_scope) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="权限点数量" width="110">
        <template #default="{ row }">{{ permCount(row) }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button v-if="isPlatform" v-perm="'role:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm v-if="isPlatform" v-perm="'role:edit'" title="确定删除该角色吗？" @confirm="onDel(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </CrudTable>
  </div>

  <!-- 角色编辑：权限点 el-tree 多选 -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="560px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="角色编码" prop="role_code">
        <el-input v-model="form.role_code" placeholder="如 IT_ADMIN" />
      </el-form-item>
      <el-form-item label="角色名称" prop="role_name">
        <el-input v-model="form.role_name" />
      </el-form-item>
      <el-form-item label="数据权限">
        <el-select v-model="form.data_scope" style="width: 100%">
          <el-option v-for="(t, k) in DATA_SCOPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="权限点">
        <div class="perm-tree-box">
          <el-tree
            ref="treeRef"
            :data="PERM_TREE"
            show-checkbox
            node-key="key"
            :props="{ label: 'label', children: 'children' }"
            default-expand-all
            :default-checked-keys="checkedKeys"
          />
        </div>
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
// 角色管理：CRUD + 权限点 el-tree 多选（role:view / role:edit）
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import { get, post, put, del } from '../../api/request'
import { PERM_TREE, PERM_KEYS, DATA_SCOPE, enumText } from '../../constants'
import { useUserStore } from '../../stores/user'

const store = useUserStore()
/** 写操作仅平台运营账号（tenant_id=0）；普通租户只读展示 */
const isPlatform = !!(store.user && Number(store.user.tenant_id) === 0)

const tableRef = ref()
const treeRef = ref()
const formRef = ref()
const saving = ref(false)
const query = reactive({ kw: '' })

const dlg = reactive({ visible: false, title: '新增角色', editId: null })
const checkedKeys = ref([])
const form = reactive({ role_code: '', role_name: '', data_scope: 4, remark: '' })
const rules = {
  role_code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  role_name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}

async function fetchData({ page, pageSize }) {
  return get('/roles', { kw: query.kw || undefined, page, pageSize })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function permCount(row) {
  try {
    const arr = typeof row.perms === 'string' ? JSON.parse(row.perms || '[]') : row.perms || []
    return arr.filter((p) => PERM_KEYS.includes(p)).length
  } catch (e) {
    return 0
  }
}

function openAdd() {
  dlg.title = '新增角色'
  dlg.editId = null
  Object.assign(form, { role_code: '', role_name: '', data_scope: 4, remark: '' })
  checkedKeys.value = []
  dlg.visible = true
  syncTree()
}

async function openEdit(row) {
  dlg.title = '编辑角色'
  dlg.editId = row.id
  const r = await get('/roles/' + row.id)
  Object.assign(form, { role_code: r.role_code, role_name: r.role_name, data_scope: Number(r.data_scope), remark: r.remark || '' })
  const perms = Array.isArray(r.perms) ? r.perms : []
  checkedKeys.value = perms.filter((p) => PERM_KEYS.includes(p))
  dlg.visible = true
  syncTree()
}

/** 对话框打开后把默认勾选同步进 tree */
function syncTree() {
  nextTick(() => {
    if (treeRef.value) treeRef.value.setCheckedKeys(checkedKeys.value)
  })
}

async function onSave() {
  await formRef.value.validate()
  const keys = treeRef.value ? treeRef.value.getCheckedKeys() : []
  const perms = keys.filter((k) => typeof k === 'string' && PERM_KEYS.includes(k))
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/roles/' + dlg.editId, { ...form, perms })
    } else {
      await post('/roles', { ...form, perms })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/roles/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(() => {})
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}
.perm-tree-box {
  width: 100%;
  max-height: 280px;
  overflow: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 6px;
}
</style>
