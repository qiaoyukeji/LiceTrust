<template>
  <el-card shadow="never" class="page-card">
    <el-form inline class="query-form" @submit.prevent>
      <el-form-item label="所属单位">
        <el-tree-select
          v-model="orgId"
          :data="orgTree"
          node-key="id"
          :props="{ label: 'org_name', children: 'children' }"
          check-strictly
          clearable
          placeholder="全部单位"
          style="width: 220px"
          @change="load"
        />
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="kw" placeholder="部门名称/编码" clearable style="width: 200px" @keyup.enter="load" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        <el-button :icon="Refresh" @click="kw = ''; orgId = null; load()">重置</el-button>
      </el-form-item>
    </el-form>
    <div class="table-toolbar">
      <el-button v-perm="'dept:edit'" type="primary" :icon="Plus" @click="openAdd()">新增部门</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" row-key="id" :tree-props="{ children: 'children' }" default-expand-all border stripe>
      <el-table-column prop="dept_name" label="部门名称" min-width="200" />
      <el-table-column prop="dept_code" label="部门编码" width="130" />
      <el-table-column prop="sort_no" label="排序" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">{{ Number(row.status) === 1 ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button v-perm="'dept:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm v-perm="'dept:edit'" title="确定删除该部门吗？" @confirm="onDel(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属单位" prop="org_id">
          <el-tree-select
            v-model="form.org_id"
            :data="orgTree"
            node-key="id"
            :props="{ label: 'org_name', children: 'children' }"
            check-strictly
            style="width: 100%"
            @change="loadDeptOptions"
          />
        </el-form-item>
        <el-form-item label="上级部门">
          <el-tree-select
            v-model="form.parent_id"
            :data="deptTree"
            node-key="id"
            :props="{ label: 'dept_name', children: 'children' }"
            check-strictly
            clearable
            placeholder="不选则为顶级部门"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="部门名称" prop="dept_name">
          <el-input v-model="form.dept_name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="部门编码">
          <el-input v-model="form.dept_code" placeholder="选填" />
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sort_no" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
// 部门管理：按单位过滤的树表 + 新增/编辑/删除（dept:view / dept:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { get, post, put, del } from '../../api/request'

const loading = ref(false)
const rows = ref([])
const orgTree = ref([])
const deptTree = ref([])
const kw = ref('')
const orgId = ref(null)
const saving = ref(false)
const formRef = ref()

const dialog = reactive({ visible: false, title: '新增部门', editId: null })
const form = reactive({ org_id: null, parent_id: null, dept_name: '', dept_code: '', sort_no: 0, status: 1 })
const rules = {
  org_id: [{ required: true, message: '请选择所属单位', trigger: 'change' }],
  dept_name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    if (kw.value || orgId.value) {
      const data = await get('/depts', { kw: kw.value, orgId: orgId.value || undefined, page: 1, pageSize: 200 })
      rows.value = (data.list || []).map((r) => ({ ...r, children: undefined }))
    } else {
      rows.value = (await get('/depts/tree')) || []
    }
  } finally {
    loading.value = false
  }
}

async function loadDeptOptions() {
  deptTree.value = (await get('/depts/tree', { orgId: form.org_id || undefined })) || []
}

function openAdd() {
  dialog.title = '新增部门'
  dialog.editId = null
  Object.assign(form, { org_id: orgId.value || null, parent_id: null, dept_name: '', dept_code: '', sort_no: 0, status: 1 })
  if (form.org_id) loadDeptOptions()
  dialog.visible = true
}

function openEdit(row) {
  dialog.title = '编辑部门'
  dialog.editId = row.id
  Object.assign(form, { org_id: Number(row.org_id) || null, parent_id: row.parent_id || null, dept_name: row.dept_name, dept_code: row.dept_code || '', sort_no: Number(row.sort_no) || 0, status: Number(row.status) })
  loadDeptOptions()
  dialog.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    const body = { ...form, parent_id: form.parent_id || 0 }
    if (dialog.editId) {
      await put('/depts/' + dialog.editId, body)
    } else {
      await post('/depts', body)
    }
    ElMessage.success('保存成功')
    dialog.visible = false
    load()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/depts/' + row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(async () => {
  orgTree.value = (await get('/orgs/tree')) || []
  load()
})
</script>
