<template>
  <el-card shadow="never" class="page-card">
    <el-form inline class="query-form" @submit.prevent>
      <el-form-item label="关键字">
        <el-input v-model="kw" placeholder="单位名称/编码" clearable style="width: 200px" @keyup.enter="load" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        <el-button :icon="Refresh" @click="kw = ''; load()">重置</el-button>
      </el-form-item>
    </el-form>
    <div class="table-toolbar">
      <el-button v-perm="'org:edit'" type="primary" :icon="Plus" @click="openAdd()">新增单位</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" row-key="id" :tree-props="{ children: 'children' }" default-expand-all border stripe>
      <el-table-column prop="org_name" label="单位名称" min-width="220" />
      <el-table-column prop="org_code" label="单位编码" width="120" />
      <el-table-column label="单位层级" width="110">
        <template #default="{ row }">{{ enumText(ORG_LEVEL, row.org_level) }}</template>
      </el-table-column>
      <el-table-column prop="sort_no" label="排序" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">{{ Number(row.status) === 1 ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button v-perm="'org:edit'" link type="primary" @click="openAdd(row)">添加下级</el-button>
          <el-button v-perm="'org:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm v-perm="'org:edit'" title="确定删除该单位吗？" @confirm="onDel(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级单位">
          <el-tree-select
            v-model="form.parent_id"
            :data="orgTree"
            node-key="id"
            :props="{ label: 'org_name', children: 'children' }"
            check-strictly
            clearable
            placeholder="不选则为顶级单位"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单位名称" prop="org_name">
          <el-input v-model="form.org_name" placeholder="请输入单位名称" />
        </el-form-item>
        <el-form-item label="单位编码" prop="org_code">
          <el-input v-model="form.org_code" placeholder="如 HQ / HFE" />
        </el-form-item>
        <el-form-item label="单位层级" prop="org_level">
          <el-select v-model="form.org_level" style="width: 100%">
            <el-option v-for="(t, k) in ORG_LEVEL" :key="k" :label="t" :value="Number(k)" />
          </el-select>
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
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
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
// 组织单位：树表展示 + 新增/编辑/删除（org:view / org:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { get, post, put, del } from '../../api/request'
import { ORG_LEVEL, enumText } from '../../constants'

const loading = ref(false)
const rows = ref([])
const orgTree = ref([])
const kw = ref('')
const saving = ref(false)
const formRef = ref()

const dialog = reactive({ visible: false, title: '新增单位', editId: null })
const form = reactive({ parent_id: null, org_name: '', org_code: '', org_level: 1, sort_no: 0, status: 1, remark: '' })
const rules = {
  org_name: [{ required: true, message: '请输入单位名称', trigger: 'blur' }],
  org_code: [{ required: true, message: '请输入单位编码', trigger: 'blur' }],
  org_level: [{ required: true, message: '请选择单位层级', trigger: 'change' }]
}

async function load() {
  loading.value = true
  try {
    if (kw.value) {
      const data = await get('/orgs', { kw: kw.value, page: 1, pageSize: 100 })
      rows.value = (data.list || []).map((r) => ({ ...r, children: undefined }))
    } else {
      rows.value = (await get('/orgs/tree')) || []
    }
    orgTree.value = (await get('/orgs/tree')) || []
  } finally {
    loading.value = false
  }
}

function openAdd(parent) {
  dialog.title = '新增单位'
  dialog.editId = null
  Object.assign(form, { parent_id: parent ? parent.id : null, org_name: '', org_code: '', org_level: parent ? Number(parent.org_level) + 1 : 1, sort_no: 0, status: 1, remark: '' })
  dialog.visible = true
}

function openEdit(row) {
  dialog.title = '编辑单位'
  dialog.editId = row.id
  Object.assign(form, { parent_id: row.parent_id || null, org_name: row.org_name, org_code: row.org_code, org_level: Number(row.org_level), sort_no: Number(row.sort_no) || 0, status: Number(row.status), remark: row.remark || '' })
  dialog.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    const body = { ...form, parent_id: form.parent_id || 0 }
    if (dialog.editId) {
      await put('/orgs/' + dialog.editId, body)
    } else {
      await post('/orgs', body)
    }
    ElMessage.success('保存成功')
    dialog.visible = false
    load()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/orgs/' + row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>
