<template>
  <div class="tenant-page">
    <el-card shadow="never" class="page-card">
      <el-form inline class="query-form" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="kw"
            placeholder="公司名称/联系人"
            clearable
            style="width: 220px"
            @keyup.enter="load"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredRows" v-loading="loading" border stripe row-key="id" @expand-change="onExpandChange">
        <!-- 行展开：企业组织架构（单位/部门/用户三段，懒加载 GET /platform/tenants/:id） -->
        <el-table-column type="expand">
          <template #default="{ row }">
            <div v-loading="detailLoading[row.id]" class="expand-box">
              <template v-if="detailMap[row.id]">
                <div class="section-title">组织单位（{{ detailMap[row.id].orgs.length }}）</div>
                <el-table v-if="detailMap[row.id].orgs.length" :data="detailMap[row.id].orgs" size="small" border>
                  <el-table-column prop="org_name" label="单位名称" min-width="200" />
                  <el-table-column prop="org_code" label="单位编码" min-width="120" />
                  <el-table-column label="单位层级" width="110">
                    <template #default="s">{{ enumText(ORG_LEVEL, s.row.org_level) }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="80">
                    <template #default="s">
                      <el-tag :type="Number(s.row.status) === 1 ? 'success' : 'info'" size="small">
                        {{ Number(s.row.status) === 1 ? '启用' : '停用' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
                <div v-else class="empty-line">暂无组织单位</div>

                <div class="section-title">部门（{{ detailMap[row.id].depts.length }}）</div>
                <el-table v-if="detailMap[row.id].depts.length" :data="detailMap[row.id].depts" size="small" border>
                  <el-table-column prop="dept_name" label="部门名称" min-width="200" />
                  <el-table-column prop="dept_code" label="部门编码" min-width="120" />
                  <el-table-column label="所属单位" min-width="160">
                    <template #default="s">{{ orgNameOf(detailMap[row.id], s.row.org_id) }}</template>
                  </el-table-column>
                  <el-table-column prop="sort_no" label="排序" width="80" />
                  <el-table-column label="状态" width="80">
                    <template #default="s">
                      <el-tag :type="Number(s.row.status) === 1 ? 'success' : 'info'" size="small">
                        {{ Number(s.row.status) === 1 ? '启用' : '停用' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
                <div v-else class="empty-line">暂无部门</div>

                <div class="section-title">用户（{{ detailMap[row.id].users.length }}）</div>
                <el-table v-if="detailMap[row.id].users.length" :data="detailMap[row.id].users" size="small" border>
                  <el-table-column prop="username" label="登录账号" min-width="120" />
                  <el-table-column prop="real_name" label="姓名" min-width="100" />
                  <el-table-column label="所属单位" min-width="150">
                    <template #default="s">{{ orgNameOf(detailMap[row.id], s.row.org_id) }}</template>
                  </el-table-column>
                  <el-table-column label="所属部门" min-width="130">
                    <template #default="s">{{ deptNameOf(detailMap[row.id], s.row.dept_id) }}</template>
                  </el-table-column>
                  <el-table-column prop="position" label="职务" min-width="100" />
                  <el-table-column prop="phone" label="联系电话" min-width="120" />
                  <el-table-column label="状态" width="80">
                    <template #default="s">
                      <el-tag :type="Number(s.row.status) === 1 ? 'success' : 'info'" size="small">
                        {{ Number(s.row.status) === 1 ? '正常' : '停用' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
                <div v-else class="empty-line">暂无用户</div>
              </template>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="tenant_name" label="公司名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="contact_person" label="联系人" width="110" show-overflow-tooltip />
        <el-table-column prop="contact_phone" label="联系电话" width="130" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">
              {{ Number(row.status) === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="统计（用户/单位/电脑/软件/安装）" min-width="240">
          <template #default="{ row }">
            <div class="stat-line">
              <span class="stat-chip">用户 {{ statOf(row, 'users') }}</span>
              <span class="stat-chip">单位 {{ statOf(row, 'orgs') }}</span>
              <span class="stat-chip">电脑 {{ statOf(row, 'computers') }}</span>
              <span class="stat-chip">软件 {{ statOf(row, 'softwares') }}</span>
              <span class="stat-chip">安装 {{ statOf(row, 'installs') }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="管理员" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ adminsText(row) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑资料</el-button>
            <el-button link type="primary" @click="openQuota(row)">消息配额</el-button>
            <el-popconfirm
              :title="row.status === 1 ? '停用后该企业用户将无法登录，确定停用吗？' : '确定启用该企业吗？'"
              width="240"
              @confirm="onToggleStatus(row)"
            >
              <template #reference>
                <el-button link :type="Number(row.status) === 1 ? 'danger' : 'success'">
                  {{ Number(row.status) === 1 ? '停用' : '启用' }}
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑企业资料对话框（PUT /platform/tenants/:id） -->
    <el-dialog v-model="dlg.visible" :title="dlg.title" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="公司名称" prop="tenant_name">
          <el-input v-model="form.tenant_name" maxlength="150" placeholder="企业全称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact_person">
          <el-input v-model="form.contact_person" maxlength="50" placeholder="企业信息化负责人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contact_phone">
          <el-input v-model="form.contact_phone" maxlength="30" />
        </el-form-item>
        <el-form-item label="公司地址" prop="address">
          <el-input v-model="form.address" maxlength="200" />
        </el-form-item>
        <el-form-item label="所属行业" prop="industry">
          <el-input v-model="form.industry" maxlength="50" placeholder="如：制造业 / 能源 / 金融" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- 消息配额分配对话框（PUT /platform/tenants/:id/quota） -->
    <el-dialog v-model="quotaDlg.visible" title="消息配额分配" width="520px" destroy-on-close>
      <el-form label-width="150px">
        <el-form-item label="短信已用">
          <span class="quota-used">{{ quotaForm.sms_used }} 条</span>
        </el-form-item>
        <el-form-item label="允许使用平台短信">
          <el-switch v-model="quotaForm.use_platform_sms" />
          <span class="quota-tip">关闭后该企业将无法通过平台通道发送短信</span>
        </el-form-item>
        <el-form-item label="短信配额总数">
          <el-input-number v-model="quotaForm.sms_quota" :min="0" :max="1000000" :step="100" />
        </el-form-item>
        <el-form-item label="邮箱已用">
          <span class="quota-used">{{ quotaForm.email_used }} 封</span>
        </el-form-item>
        <el-form-item label="允许使用平台邮箱">
          <el-switch v-model="quotaForm.use_platform_email" />
          <span class="quota-tip">关闭后该企业将无法通过平台通道发送邮件</span>
        </el-form-item>
        <el-form-item label="邮箱配额总数">
          <el-input-number v-model="quotaForm.email_quota" :min="0" :max="1000000" :step="100" />
        </el-form-item>
      </el-form>
      <p class="quota-note">配额为该企业可使用平台消息通道的累计总量；企业启用自有通道后发送优先走自有通道，不占用平台配额。</p>
      <template #footer>
        <el-button @click="quotaDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="quotaDlg.saving" @click="onSaveQuota">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
// 企业管理（平台专属，tenant_id=0）：全部租户列表 + 统计 + 组织架构行展开 + 资料代管 + 启停
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { get, put } from '../../api/request'
import { ORG_LEVEL, enumText } from '../../constants'

const loading = ref(false)
const rows = ref([])
const kw = ref('')
const statusFilter = ref(null)

const formRef = ref()
const saving = ref(false)
const dlg = reactive({ visible: false, title: '编辑企业资料', editId: null })
const form = reactive({ tenant_name: '', contact_person: '', contact_phone: '', address: '', industry: '', remark: '' })
const rules = {
  tenant_name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }]
}

/** 行展开详情缓存（tenantId → { orgs, depts, users }） */
const detailMap = reactive({})
const detailLoading = reactive({})

/** 前端过滤（kw + 状态） */
const filteredRows = computed(() => {
  const k = (kw.value || '').trim().toLowerCase()
  return rows.value.filter((r) => {
    if (statusFilter.value !== null && statusFilter.value !== '' && Number(r.status) !== Number(statusFilter.value)) return false
    if (!k) return true
    return (
      String(r.tenant_name || '').toLowerCase().includes(k) ||
      String(r.contact_person || '').toLowerCase().includes(k)
    )
  })
})

/** 加载全部企业（含行内 stats 统计与管理员） */
async function load() {
  loading.value = true
  try {
    rows.value = (await get('/platform/tenants')) || []
  } finally {
    loading.value = false
  }
}

function onReset() {
  kw.value = ''
  statusFilter.value = null
  load()
}

function statOf(row, key) {
  const s = row.stats || {}
  return s[key] === undefined ? 0 : s[key]
}

function adminsText(row) {
  const arr = row.admins || []
  return arr.length ? arr.join('、') : '-'
}

/** 展开行时懒加载企业组织架构详情 */
async function onExpandChange(row, expanded) {
  if (!expanded || !expanded.length) return
  if (detailMap[row.id]) return
  detailLoading[row.id] = true
  try {
    const d = await get('/platform/tenants/' + row.id)
    detailMap[row.id] = {
      tenant: (d && d.tenant) || {},
      orgs: (d && d.orgs) || [],
      depts: (d && d.depts) || [],
      users: (d && d.users) || []
    }
  } finally {
    detailLoading[row.id] = false
  }
}

function orgNameOf(detail, orgId) {
  const o = detail.orgs.find((x) => Number(x.id) === Number(orgId))
  return o ? o.org_name : '-'
}

function deptNameOf(detail, deptId) {
  const dpt = detail.depts.find((x) => Number(x.id) === Number(deptId))
  return dpt ? dpt.dept_name : '-'
}

function openEdit(row) {
  dlg.title = '编辑企业资料'
  dlg.editId = row.id
  Object.assign(form, {
    tenant_name: row.tenant_name || '',
    contact_person: row.contact_person || '',
    contact_phone: row.contact_phone || '',
    address: row.address || '',
    industry: row.industry || '',
    remark: row.remark || ''
  })
  dlg.visible = true
}

async function onSave() {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    await put('/platform/tenants/' + dlg.editId, { ...form })
    ElMessage.success('企业信息已更新')
    dlg.visible = false
    load()
  } finally {
    saving.value = false
  }
}

/** 启用/停用企业（PUT /platform/tenants/:id/status） */
async function onToggleStatus(row) {
  const next = Number(row.status) === 1 ? 0 : 1
  await put('/platform/tenants/' + row.id + '/status', { status: next })
  ElMessage.success(next === 1 ? '企业已启用' : '企业已停用（其用户将无法登录）')
  load()
}

/* ---------- 消息配额分配 ---------- */
const quotaDlg = reactive({ visible: false, saving: false, id: null })
const quotaForm = reactive({
  use_platform_sms: false,
  sms_quota: 0,
  use_platform_email: false,
  email_quota: 0,
  sms_used: 0,
  email_used: 0
})

/** 打开配额对话框（当前额度取自企业行数据） */
function openQuota(row) {
  quotaDlg.id = row.id
  quotaForm.use_platform_sms = Number(row.use_platform_sms) === 1
  quotaForm.sms_quota = Number(row.sms_quota || 0)
  quotaForm.use_platform_email = Number(row.use_platform_email) === 1
  quotaForm.email_quota = Number(row.email_quota || 0)
  quotaForm.sms_used = Number(row.sms_used || 0)
  quotaForm.email_used = Number(row.email_used || 0)
  quotaDlg.visible = true
}

/** 保存配额分配，成功后用返回值更新行内额度显示 */
async function onSaveQuota() {
  quotaDlg.saving = true
  try {
    const d = await put('/platform/tenants/' + quotaDlg.id + '/quota', {
      use_platform_sms: quotaForm.use_platform_sms,
      sms_quota: quotaForm.sms_quota,
      use_platform_email: quotaForm.use_platform_email,
      email_quota: quotaForm.email_quota
    })
    const row = rows.value.find((r) => Number(r.id) === Number(quotaDlg.id))
    if (row && d) Object.assign(row, d)
    ElMessage.success('消息通道分配已更新')
    quotaDlg.visible = false
  } finally {
    quotaDlg.saving = false
  }
}

onMounted(load)
</script>

<style scoped>
.stat-line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}
.stat-chip {
  font-size: 12px;
  color: #606266;
  background: #f4f6f9;
  border-radius: 3px;
  padding: 1px 6px;
}
.expand-box {
  padding: 8px 24px 16px 48px;
}
.section-title {
  font-weight: bold;
  color: #303133;
  margin: 12px 0 8px;
}
.section-title:first-child {
  margin-top: 0;
}
.empty-line {
  color: #909399;
  font-size: 13px;
  padding: 4px 0;
}
.quota-used {
  color: #303133;
  font-weight: bold;
}
.quota-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
.quota-note {
  margin: 0;
  color: #909399;
  font-size: 12px;
}
</style>
