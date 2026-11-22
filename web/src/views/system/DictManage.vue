<template>
  <el-card shadow="never" class="page-card">
    <el-alert
      v-if="!isPlatform"
      title="系统参数/字典/角色为平台级设置，请联系平台运营方修改"
      type="warning"
      :closable="false"
      show-icon
      class="mb12"
    />
    <el-tabs v-model="activeType" @tab-change="loadRows">
      <el-tab-pane v-for="t in DICT_TYPES" :key="t.type" :label="t.label" :name="t.type" />
    </el-tabs>
    <div class="table-toolbar">
      <el-button v-if="isPlatform" v-perm="'dict:edit'" type="primary" :icon="Plus" @click="openAdd">新增字典项</el-button>
      <span class="type-hint">字典类型：{{ activeType }}</span>
    </div>
    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column label="来源" width="100">
        <template #default="{ row }">
          <el-tag :type="Number(row.tenant_id) === 0 ? 'success' : 'primary'" size="small">{{ row.scope || (Number(row.tenant_id) === 0 ? '平台通用' : '企业自有') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="dict_label" label="标签" min-width="140" />
      <el-table-column prop="dict_value" label="键值" min-width="120" />
      <el-table-column prop="sort_no" label="排序" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">{{ Number(row.status) === 1 ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button v-if="isPlatform" v-perm="'dict:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm v-if="isPlatform" v-perm="'dict:edit'" title="确定删除该字典项吗？" @confirm="onDel(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg.visible" :title="dlg.title" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="字典类型">
          <el-input :model-value="activeType" disabled />
        </el-form-item>
        <el-form-item label="标签" prop="dict_label">
          <el-input v-model="form.dict_label" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="键值" prop="dict_value">
          <el-input v-model="form.dict_value" placeholder="存储值" />
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
        <el-button @click="dlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
// 数据字典：按 dictType 的 tab 展示与维护（dict:view / dict:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { get, post, put, del } from '../../api/request'
import { DICT_TYPES } from '../../constants'
import { useUserStore } from '../../stores/user'

const store = useUserStore()
/** 写操作仅平台运营账号（tenant_id=0）；普通租户只读展示 */
const isPlatform = !!(store.user && Number(store.user.tenant_id) === 0)

const activeType = ref(DICT_TYPES[0].type)
const loading = ref(false)
const rows = ref([])
const saving = ref(false)
const formRef = ref()

const dlg = reactive({ visible: false, title: '新增字典项', editId: null })
const form = reactive({ dict_label: '', dict_value: '', sort_no: 0, status: 1, remark: '' })
const rules = {
  dict_label: [{ required: true, message: '请输入标签', trigger: 'blur' }],
  dict_value: [{ required: true, message: '请输入键值', trigger: 'blur' }]
}

async function loadRows() {
  loading.value = true
  try {
    // 后端返回分页结构 {list, total}（含平台通用 + 企业自有，scope 字段标注来源）
    const data = await get('/dicts', { dictType: activeType.value, page: 1, pageSize: 200 })
    rows.value = (data && data.list) || []
  } finally {
    loading.value = false
  }
}

function openAdd() {
  dlg.title = '新增字典项'
  dlg.editId = null
  Object.assign(form, { dict_label: '', dict_value: '', sort_no: 0, status: 1, remark: '' })
  dlg.visible = true
}

function openEdit(row) {
  dlg.title = '编辑字典项'
  dlg.editId = row.id
  Object.assign(form, { dict_label: row.dict_label, dict_value: row.dict_value, sort_no: Number(row.sort_no) || 0, status: Number(row.status), remark: row.remark || '' })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    const body = { ...form, dict_type: activeType.value }
    if (dlg.editId) {
      await put('/dicts/' + dlg.editId, body)
    } else {
      await post('/dicts', body)
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    loadRows()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/dicts/' + row.id)
  ElMessage.success('删除成功')
  loadRows()
}

onMounted(loadRows)
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}
.type-hint {
  color: #909399;
  font-size: 13px;
  margin-left: 12px;
}
</style>
