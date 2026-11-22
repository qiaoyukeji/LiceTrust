<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="软件名称/编号/序列号" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
      <el-form-item label="软件">
        <el-select v-model="query.softwareId" clearable filterable placeholder="全部" style="width: 180px">
          <el-option v-for="s in softwareOptions" :key="s.id" :label="s.software_name" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="授权类型">
        <el-select v-model="query.authType" clearable placeholder="全部" style="width: 140px">
          <el-option v-for="t in AUTH_TYPE_LIST" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>
      <el-form-item label="到期于">
        <el-date-picker v-model="query.expireBefore" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 150px" />
      </el-form-item>
    </template>
    <template #toolbar>
      <el-button v-perm="'entitlement:edit'" type="primary" :icon="Plus" @click="openAdd">新增授权</el-button>
    </template>
    <el-table-column prop="software_name" label="软件名称" min-width="150" show-overflow-tooltip />
    <el-table-column prop="software_no" label="软件编号" width="160" show-overflow-tooltip />
    <el-table-column prop="auth_type" label="授权类型" width="100" />
    <el-table-column prop="license_type" label="许可类型" width="100" />
    <el-table-column label="许可/安装" width="100" align="center">
      <template #default="{ row }">
        <span :class="row.compliance === 'over' ? 'cmp-over' : ''">{{ row.license_qty || 0 }} / {{ row.install_count || 0 }}</span>
      </template>
    </el-table-column>
    <el-table-column label="对账" width="90">
      <template #default="{ row }">
        <el-tag :type="complianceTag(row.compliance)" size="small">{{ COMPLIANCE_TEXT[row.compliance] || '正常' }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="license_term" label="许可期限" width="95" />
    <el-table-column label="到期日期" width="115">
      <template #default="{ row }">
        <span :class="expireCls(row.expire_date)">{{ row.expire_date || '-' }}</span>
      </template>
    </el-table-column>
    <el-table-column prop="serial_no" label="序列号（掩码）" width="140" show-overflow-tooltip />
    <el-table-column prop="activation_code" label="激活码（掩码）" width="140" show-overflow-tooltip />
    <el-table-column label="操作" width="170" fixed="right">
      <template #default="{ row }">
        <el-button v-perm="'entitlement:secret'" link type="warning" @click="onReveal(row)">查看激活码</el-button>
        <el-button v-perm="'entitlement:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-popconfirm v-perm="'entitlement:edit'" title="确定删除该授权吗？" @confirm="onDel(row)">
          <template #reference><el-button link type="danger">删除</el-button></template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </CrudTable>

  <!-- 新增/编辑 -->
  <el-dialog v-model="dlg.visible" :title="dlg.title" width="640px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="软件" prop="software_id">
        <el-select v-model="form.software_id" filterable style="width: 100%">
          <el-option v-for="s in softwareOptions" :key="s.id" :label="s.software_name + '（' + s.software_no + '）'" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="关联合同">
        <el-select v-model="form.contract_id" clearable filterable style="width: 100%">
          <el-option v-for="c in contractOptions" :key="c.id" :label="c.contract_no + ' ' + (c.contract_name || '')" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="授权类型">
            <el-select v-model="form.auth_type" style="width: 100%">
              <el-option v-for="t in AUTH_TYPE_LIST" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="许可类型">
            <el-input v-model="form.license_type" placeholder="如 授权书" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="许可数量">
            <el-input-number v-model="form.license_qty" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="采购方式">
            <el-select v-model="form.purchase_method" style="width: 100%">
              <el-option v-for="(t, k) in PURCHASE_METHOD" :key="k" :label="t" :value="Number(k)" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="采购日期">
            <el-date-picker v-model="form.purchase_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="采购金额">
            <el-input-number v-model="form.purchase_amount" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="可使用版本">
            <el-input v-model="form.usable_version" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="许可期限">
            <el-input v-model="form.license_term" placeholder="如 永久 / 3年" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="到期日期">
        <el-date-picker v-model="form.expire_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="序列号">
        <el-input v-model="form.serial_no" type="textarea" :rows="2" placeholder="输入明文将加密保存；留空则不变更" />
      </el-form-item>
      <el-form-item label="激活码">
        <el-input v-model="form.activation_code" type="textarea" :rows="2" placeholder="输入明文将加密保存；留空则不变更" />
      </el-form-item>
      <el-form-item label="授权文件地址">
        <el-input v-model="form.auth_file_url" />
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

  <!-- 二次认证查看明文 -->
  <RevealDialog v-model="reveal.visible" :url="reveal.url" @revealed="onRevealed" />

  <!-- 明文结果 -->
  <el-dialog v-model="result.visible" title="敏感信息（明文）" width="560px">
    <el-alert title="请妥善保管，截图与外传将追究责任" type="error" :closable="false" show-icon class="mb12" />
    <el-form label-width="90px">
      <el-form-item label="序列号">
        <el-input :model-value="result.data.serial_no" readonly />
      </el-form-item>
      <el-form-item label="激活码">
        <el-input :model-value="result.data.activation_code" readonly type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="result.visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 授权管理：对账 + 掩码 + 密码二次认证查看明文（entitlement:view/edit/secret）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CrudTable from '../../components/CrudTable.vue'
import RevealDialog from '../../components/RevealDialog.vue'
import { get, post, put, del } from '../../api/request'
import { AUTH_TYPE_LIST, PURCHASE_METHOD, COMPLIANCE_TEXT, complianceTag } from '../../constants'

const tableRef = ref()
const formRef = ref()
const softwareOptions = ref([])
const contractOptions = ref([])
const saving = ref(false)
const query = reactive({ kw: '', softwareId: null, authType: null, expireBefore: '' })

const dlg = reactive({ visible: false, title: '新增授权', editId: null })
const form = reactive({
  software_id: null, contract_id: null, auth_type: '数量授权', license_type: '', license_qty: 0,
  purchase_method: 1, purchase_date: '', purchase_amount: 0, usable_version: '', license_term: '',
  expire_date: '', serial_no: '', activation_code: '', auth_file_url: '', remark: ''
})
const rules = {
  software_id: [{ required: true, message: '请选择软件', trigger: 'change' }]
}

const reveal = reactive({ visible: false, url: '' })
const result = reactive({ visible: false, data: {} })

async function fetchData({ page, pageSize }) {
  return get('/entitlements', {
    kw: query.kw || undefined,
    softwareId: query.softwareId || undefined,
    authType: query.authType || undefined,
    expireBefore: query.expireBefore || undefined,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', softwareId: null, authType: null, expireBefore: '' })
}

/** 90 天内到期标红 */
function expireCls(d) {
  if (!d) return ''
  const t = new Date(String(d)).getTime()
  if (!Number.isFinite(t)) return ''
  const days = Math.floor((t - Date.now()) / 86400000)
  return days <= 90 ? 'expire-soon' : ''
}

function onReveal(row) {
  reveal.url = '/entitlements/' + row.id + '/reveal'
  reveal.visible = true
}

function onRevealed(data) {
  result.data = data || {}
  result.visible = true
}

function openAdd() {
  dlg.title = '新增授权'
  dlg.editId = null
  Object.assign(form, {
    software_id: null, contract_id: null, auth_type: '数量授权', license_type: '', license_qty: 0,
    purchase_method: 1, purchase_date: '', purchase_amount: 0, usable_version: '', license_term: '',
    expire_date: '', serial_no: '', activation_code: '', auth_file_url: '', remark: ''
  })
  dlg.visible = true
}

async function openEdit(row) {
  dlg.title = '编辑授权'
  dlg.editId = row.id
  const e = await get('/entitlements/' + row.id)
  Object.assign(form, {
    software_id: Number(e.software_id),
    contract_id: e.contract_id ? Number(e.contract_id) : null,
    auth_type: e.auth_type || '',
    license_type: e.license_type || '',
    license_qty: Number(e.license_qty) || 0,
    purchase_method: Number(e.purchase_method) || 1,
    purchase_date: e.purchase_date || '',
    purchase_amount: Number(e.purchase_amount) || 0,
    usable_version: e.usable_version || '',
    license_term: e.license_term || '',
    expire_date: e.expire_date || '',
    serial_no: '',
    activation_code: '',
    auth_file_url: e.auth_file_url || '',
    remark: e.remark || ''
  })
  dlg.visible = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dlg.editId) {
      await put('/entitlements/' + dlg.editId, { ...form })
    } else {
      await post('/entitlements', { ...form })
    }
    ElMessage.success('保存成功')
    dlg.visible = false
    reloadTable()
  } finally {
    saving.value = false
  }
}

async function onDel(row) {
  await del('/entitlements/' + row.id)
  ElMessage.success('删除成功')
  reloadTable()
}

onMounted(async () => {
  softwareOptions.value = (await get('/softwares/options')) || []
  const contracts = await get('/contracts', { page: 1, pageSize: 200 })
  contractOptions.value = (contracts && contracts.list) || []
})
</script>

<style scoped>
.cmp-over {
  color: #f56c6c;
  font-weight: bold;
}
.expire-soon {
  color: #f56c6c;
}
.mb12 {
  margin-bottom: 12px;
}
</style>
