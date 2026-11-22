<template>
  <el-card shadow="never" class="page-card">
    <el-tabs v-model="tab" @tab-change="onTabChange">
      <el-tab-pane label="我的申请" name="my" />
      <el-tab-pane v-if="can('apply:approve1')" label="待部门审核" name="role1" />
      <el-tab-pane v-if="can('apply:approve2')" label="待信息化审核" name="role2" />
      <el-tab-pane v-if="can('apply:execute')" label="待执行" name="execute" />
      <el-tab-pane v-if="can('apply:confirm')" label="待我确认" name="confirm" />
    </el-tabs>

    <el-form inline class="query-form" @submit.prevent>
      <el-form-item label="关键字">
        <el-input v-model="kw" placeholder="单号/软件/编号" clearable style="width: 200px" @keyup.enter="load" />
      </el-form-item>
      <el-form-item v-if="tab === 'my'" label="申请类型">
        <el-select v-model="applyType" clearable placeholder="全部" style="width: 120px">
          <el-option v-for="(t, k) in APPLY_TYPE" :key="k" :label="t" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        <el-button :icon="Refresh" @click="kw = ''; applyType = null; load()">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="table-toolbar">
      <el-button v-perm="'apply:create'" type="primary" :icon="Plus" @click="formDlg.visible = true">新申请</el-button>
    </div>

    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column prop="apply_no" label="申请单号" width="170" />
      <el-table-column prop="computer_no" label="计算机编号" width="130" />
      <el-table-column prop="software_name" label="软件名称" min-width="150" show-overflow-tooltip />
      <el-table-column label="申请类型" width="90">
        <template #default="{ row }">{{ enumText(APPLY_TYPE, row.apply_type) }}</template>
      </el-table-column>
      <el-table-column prop="applicant_name" label="申请人" width="90" />
      <el-table-column prop="dept_name" label="申请部门" width="120" show-overflow-tooltip />
      <el-table-column prop="apply_time" label="申请时间" width="160">
        <template #default="{ row }">{{ str(row.apply_time) }}</template>
      </el-table-column>
      <el-table-column label="当前节点" width="120">
        <template #default="{ row }">
          <el-tag :type="flowStatusTag(row.status)" size="small">{{ enumText(FLOW_STATUS, row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button v-if="canEdit(row)" link type="primary" @click="openEditDraft(row)">编辑</el-button>
          <el-button v-if="canSubmit(row)" link type="warning" @click="onSubmit(row)">提交</el-button>
          <el-button v-if="canApprove(row)" link type="warning" @click="openApprove(row)">审批</el-button>
          <el-button v-if="canExecute(row)" link type="success" @click="onExecute(row)">执行</el-button>
          <el-button v-if="canConfirm(row)" link type="success" @click="openConfirm(row)">确认签名</el-button>
          <el-popconfirm v-if="canDelete(row)" title="确定删除该草稿吗？" @confirm="onDel(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
    <div class="pager">
      <el-pagination background layout="total, prev, pager, next" :total="total" :current-page="page" :page-size="size" @current-change="onPage" />
    </div>
  </el-card>

  <!-- 新申请对话框 -->
  <ApplyFormDialog v-model="formDlg.visible" @saved="load" />

  <!-- 详情抽屉 -->
  <ApplyDetailDrawer v-model="detail.visible" :apply-id="detail.id" />

  <!-- 审批对话框 -->
  <el-dialog v-model="approveDlg.visible" title="审批" width="480px" destroy-on-close>
    <el-descriptions :column="1" border class="mb12">
      <el-descriptions-item label="申请单号">{{ approveDlg.row.apply_no }}</el-descriptions-item>
      <el-descriptions-item label="软件名称">{{ approveDlg.row.software_name }}</el-descriptions-item>
    </el-descriptions>
    <el-form label-width="90px">
      <el-form-item label="审批结果">
        <el-radio-group v-model="approveDlg.action">
          <el-radio value="approve">通过</el-radio>
          <el-radio value="reject">驳回</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="审批意见">
        <el-input v-model="approveDlg.opinion" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="approveDlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveApprove">确定</el-button>
    </template>
  </el-dialog>

  <!-- 确认签名对话框 -->
  <el-dialog v-model="confirmDlg.visible" title="使用人确认签名" width="460px" destroy-on-close>
    <el-alert title="请输入本人姓名完成电子签名，确认后流程办结并写回台账" type="info" :closable="false" show-icon class="mb12" />
    <el-form label-width="90px">
      <el-form-item label="签名姓名">
        <el-input v-model="confirmDlg.userSign" placeholder="输入与本人一致的姓名" @keyup.enter="saveConfirm" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="confirmDlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 安装维护流程中心：五个 Tab（我的申请/待部门审核/待信息化审核/待执行/待我确认）
// 操作按钮按状态与 perms 显隐：apply:create/approve1/approve2/execute/confirm
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import ApplyFormDialog from './ApplyFormDialog.vue'
import ApplyDetailDrawer from './ApplyDetailDrawer.vue'
import { get, put, del } from '../../api/request'
import { useUserStore } from '../../stores/user'
import { FLOW_STATUS, APPLY_TYPE, enumText, flowStatusTag } from '../../constants'

const store = useUserStore()
const can = store.can

const tab = ref('my')
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const kw = ref('')
const applyType = ref(null)
const saving = ref(false)

const formDlg = reactive({ visible: false })
const detail = reactive({ visible: false, id: null })
const approveDlg = reactive({ visible: false, row: {}, action: 'approve', opinion: '' })
const confirmDlg = reactive({ visible: false, row: {}, userSign: '' })

/** 各 Tab 数据源 */
async function fetchRows() {
  const paging = { page: page.value, pageSize: size.value }
  const fkw = kw.value || undefined
  switch (tab.value) {
    case 'my': {
      const data = await get('/maint-applies/my', { ...paging, kw: fkw, applyType: applyType.value === null ? undefined : applyType.value })
      total.value = Number((data && data.total) || 0)
      return (data && data.list) || []
    }
    case 'role1':
      return (await get('/maint-applies/pending/role1', { kw: fkw })) || []
    case 'role2':
      return (await get('/maint-applies/pending/role2', { kw: fkw })) || []
    case 'execute':
      return (await get('/maint-applies/pending/execute', { kw: fkw })) || []
    case 'confirm':
      return (await get('/maint-applies/pending/confirm', { kw: fkw })) || []
    default:
      return []
  }
}

async function load() {
  loading.value = true
  try {
    rows.value = await fetchRows()
    if (tab.value !== 'my') total.value = rows.value.length
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  page.value = 1
  load()
}

function onPage(p) {
  page.value = p
  load()
}

function str(v) {
  return String(v || '').slice(0, 19)
}

/** 状态辅助 */
const st = (row) => Number(row.status)
const canEdit = (row) => tab.value === 'my' && (st(row) === 0 || st(row) === 60) && can('apply:create')
const canSubmit = (row) => tab.value === 'my' && (st(row) === 0 || st(row) === 60) && can('apply:create')
const canDelete = (row) => tab.value === 'my' && st(row) === 0 && can('apply:create')
const canApprove = (row) => can('apply:approve1') && st(row) === 10 && (tab.value === 'role1' || tab.value === 'my')
const canExecute = (row) => can('apply:execute') && st(row) === 30 && (tab.value === 'execute' || tab.value === 'my')
const canConfirm = (row) => can('apply:confirm') && st(row) === 40 && (tab.value === 'confirm' || tab.value === 'my')

function openDetail(row) {
  detail.id = row.id
  detail.visible = true
}

function openEditDraft(row) {
  // 草稿/驳回单编辑：提示通过新申请对话框重填（后端支持 PUT /:id 更新）
  ElMessageBox.confirm('草稿修改将打开新申请表单，确定继续吗？原单据 ' + row.apply_no + ' 的修改请在提交前完成。', '提示', { type: 'info' })
    .then(() => {
      formDlg.visible = true
    })
    .catch(() => {})
}

async function onSubmit(row) {
  await put('/maint-applies/' + row.id + '/submit')
  ElMessage.success('提交成功，待部门负责人审核')
  load()
}

function openApprove(row) {
  approveDlg.row = row
  approveDlg.action = 'approve'
  approveDlg.opinion = ''
  approveDlg.visible = true
}

async function saveApprove() {
  saving.value = true
  try {
    await put('/maint-applies/' + approveDlg.row.id + '/approve', { action: approveDlg.action, opinion: approveDlg.opinion })
    ElMessage.success(approveDlg.action === 'approve' ? '审批通过' : '已驳回')
    approveDlg.visible = false
    load()
  } finally {
    saving.value = false
  }
}

async function onExecute(row) {
  await ElMessageBox.confirm('确认执行该维护任务吗？执行后生成确认单待使用人签名。', '执行确认', { type: 'warning' })
  await put('/maint-applies/' + row.id + '/execute')
  ElMessage.success('执行完成，待使用人确认')
  load()
}

function openConfirm(row) {
  confirmDlg.row = row
  confirmDlg.userSign = ''
  confirmDlg.visible = true
}

async function saveConfirm() {
  if (!confirmDlg.userSign) {
    ElMessage.warning('请输入签名姓名')
    return
  }
  saving.value = true
  try {
    await put('/maint-applies/' + confirmDlg.row.id + '/confirm', { userSign: confirmDlg.userSign })
    ElMessage.success('确认完成，流程已办结并写回台账')
    confirmDlg.visible = false
    load()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/maint-applies/' + row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}
</style>
