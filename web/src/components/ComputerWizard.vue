<template>
  <el-dialog v-model="visible" title="计算机登记（新机建档）" width="780px" destroy-on-close :close-on-click-modal="false">
    <el-steps :active="step" align-center finish-status="success" class="wiz-steps">
      <el-step title="使用人员信息" description="姓名 / 单位 / 部门" />
      <el-step title="电脑信息" description="类型 / 品牌 / 型号" />
      <el-step title="档案生成" description="一机一档" />
    </el-steps>

    <!-- 步骤 1：使用人员信息 -->
    <el-form v-show="step === 0" ref="step1Ref" :model="p" :rules="pRules" label-width="90px" class="wiz-body">
      <el-form-item label="登记方式">
        <el-radio-group v-model="p.mode">
          <el-radio value="exist">选择已有人员</el-radio>
          <el-radio value="new">新增人员</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="p.mode === 'exist'">
        <el-form-item label="使用人员" prop="user_id">
          <el-select v-model="p.user_id" filterable placeholder="输入姓名或账号搜索" style="width: 100%" @change="fillFromUser">
            <el-option v-for="u in users" :key="u.id" :label="u.real_name + '（' + u.username + '）'" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-descriptions :column="3" border size="small" class="mb8">
          <el-descriptions-item label="姓名">{{ selUser.real_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所在单位">{{ selUser.org_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所在部门">{{ selUser.dept_name || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template v-else>
        <el-row>
          <el-col :span="12">
            <el-form-item label="姓名" prop="real_name">
              <el-input v-model="p.real_name" placeholder="使用人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="p.phone" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="所在单位" prop="org_id">
          <el-tree-select
            v-model="p.org_id"
            :data="orgTree"
            node-key="id"
            :props="{ label: 'org_name', children: 'children' }"
            check-strictly
            style="width: 100%"
            @change="onWizardOrg"
          />
        </el-form-item>
        <el-form-item label="所在部门" prop="dept_id">
          <el-tree-select
            v-model="p.dept_id"
            :data="wizDepts"
            node-key="id"
            :props="{ label: 'dept_name', children: 'children' }"
            check-strictly
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="p.position" placeholder="选填" />
        </el-form-item>
      </template>
    </el-form>

    <!-- 步骤 2：电脑信息 -->
    <el-form v-show="step === 1" ref="step2Ref" :model="c" :rules="cRules" label-width="100px" class="wiz-body">
      <el-row>
        <el-col :span="12">
          <el-form-item label="电脑类型" prop="computer_type">
            <el-select v-model="c.computer_type" style="width: 100%">
              <el-option v-for="(t, k) in COMPUTER_TYPE" :key="k" :label="t" :value="Number(k)" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="电脑品牌" prop="brand">
            <el-input v-model="c.brand" placeholder="如 联想 / 戴尔 / 华为" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="型号">
            <el-input v-model="c.model" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="SN 序列号">
            <el-input v-model="c.sn" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="固定资产编号">
        <el-input v-model="c.asset_no" placeholder="非必填：手填、扫码枪输入或点右侧扫码识别">
          <template #append>
            <el-button :icon="Camera" @click="qrRef && qrRef.open()">扫码录入</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item label="采购时间">
            <el-date-picker v-model="c.purchase_date" type="date" value-format="YYYY-MM-DD" placeholder="非必填" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="填报时间">
            <el-date-picker v-model="c.report_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="存放位置">
            <el-input v-model="c.location" placeholder="如 信息楼201" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="启用日期">
            <el-date-picker v-model="c.enable_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="备注">
        <el-input v-model="c.remark" type="textarea" :rows="2" />
      </el-form-item>
      <el-alert type="info" :closable="false" show-icon title="计算机编号将在档案生成时按规则自动分配（也可在下一步前留空由系统生成）" />
    </el-form>

    <QrScanner ref="qrRef" @detected="onQrDetected" />

    <!-- 步骤 3：档案生成 -->
    <div v-if="step === 2" class="wiz-done">
      <el-result icon="success" title="电脑档案已生成" :sub-title="'计算机编号：' + (resultNo || '-')">
        <template #extra>
          <el-button type="primary" @click="goDetail">立即添加软件</el-button>
          <el-button @click="closeAll">返回列表</el-button>
        </template>
      </el-result>
      <div class="wiz-tip">进入一机一档后，可在“已装软件”页签为该电脑添加安装软件信息。</div>
    </div>

    <template #footer>
      <template v-if="step < 2">
        <el-button v-if="step > 0" @click="step--">上一步</el-button>
        <el-button @click="closeAll">取消</el-button>
        <el-button v-if="step === 0" type="primary" @click="next1">下一步</el-button>
        <el-button v-if="step === 1" type="primary" :loading="saving" @click="submit">生成档案</el-button>
      </template>
      <template v-else>
        <el-button type="primary" @click="closeAll">完成</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
// 分步登记向导（FR-03 流程化：人员信息 → 电脑信息 → 生成档案 → 档案内添加软件）
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { get, post } from '../api/request'
import { COMPUTER_TYPE } from '../constants'
import QrScanner from './QrScanner.vue'

const emit = defineEmits(['saved'])
const router = useRouter()
const visible = ref(false)
const step = ref(0)
const saving = ref(false)
const orgTree = ref([])
const users = ref([])
const wizDepts = ref([])
const resultId = ref(null)
const resultNo = ref('')
const qrRef = ref()

const p = reactive({ mode: 'exist', user_id: null, real_name: '', phone: '', position: '', org_id: null, dept_id: null })
const selUser = computed(() => users.value.find((u) => u.id === p.user_id) || {})
const c = reactive({
  computer_no: '', asset_no: '', brand: '', model: '', sn: '', computer_type: 2,
  location: '', enable_date: '', purchase_date: '', report_time: nowStr(), remark: ''
})

function nowStr() {
  const d = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) +
    ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds())
  )
}

function onQrDetected(code) {
  c.asset_no = code
  ElMessage.success('已识别固定资产编号：' + code)
}

const pRules = {
  user_id: [{ required: true, message: '请选择使用人员', trigger: 'change' }],
  real_name: [{ required: true, message: '请填写姓名', trigger: 'blur' }],
  org_id: [{ required: true, message: '请选择所在单位', trigger: 'change' }],
  dept_id: [{ required: true, message: '请选择所在部门', trigger: 'change' }]
}
const cRules = {
  computer_type: [{ required: true, message: '请选择电脑类型', trigger: 'change' }],
  brand: [{ required: true, message: '请填写电脑品牌', trigger: 'blur' }]
}

async function open() {
  visible.value = true
  step.value = 0
  resultId.value = null
  resultNo.value = ''
  Object.assign(p, { mode: 'exist', user_id: null, real_name: '', phone: '', position: '', org_id: null, dept_id: null })
  Object.assign(c, {
    computer_no: '', asset_no: '', brand: '', model: '', sn: '', computer_type: 2,
    location: '', enable_date: '', purchase_date: '', report_time: nowStr(), remark: ''
  })
  orgTree.value = (await get('/orgs/tree')) || []
  users.value = ((await get('/users', { page: 1, pageSize: 200 })) || {}).list || []
}

function fillFromUser() {
  const u = selUser.value
  if (u) ElMessage.info('已带出人员：' + u.real_name + ' / ' + (u.org_name || '') + ' ' + (u.dept_name || ''))
}

async function onWizardOrg() {
  p.dept_id = null
  wizDepts.value = p.org_id ? ((await get('/depts/tree', { orgId: p.org_id })) || []) : []
}

function next1() {
  if (p.mode === 'exist' && !p.user_id) {
    ElMessage.warning('请选择使用人员')
    return
  }
  if (p.mode === 'new' && (!p.real_name || !p.org_id || !p.dept_id)) {
    ElMessage.warning('请完整填写姓名、所在单位、所在部门')
    return
  }
  step.value = 1
}

async function submit() {
  const cForm = { computer_type: c.computer_type, brand: c.brand }
  if (!cForm.computer_type || !cForm.brand) {
    ElMessage.warning('请填写电脑类型与品牌')
    return
  }
  saving.value = true
  try {
    let userId = p.user_id
    if (p.mode === 'new') {
      const stamp = String(Date.now()).slice(-6)
      // 登记场景新增人员仅建立人员档案（不绑定登录角色，使用人无需登录）
      const u = await post('/users', {
        username: 'emp' + stamp,
        password: '123456',
        real_name: p.real_name,
        org_id: p.org_id,
        dept_id: p.dept_id,
        position: p.position,
        phone: p.phone,
        use_computer: 1,
        role_ids: []
      })
      userId = u.id
    }
    const created = await post('/computers', {
      computer_no: c.computer_no || undefined,
      asset_no: c.asset_no || undefined,
      brand: c.brand,
      model: c.model,
      sn: c.sn,
      computer_type: c.computer_type,
      org_id: p.mode === 'exist' ? selUser.value.org_id : p.org_id,
      dept_id: p.mode === 'exist' ? selUser.value.dept_id : p.dept_id,
      user_id: userId,
      location: c.location,
      enable_date: c.enable_date,
      purchase_date: c.purchase_date || undefined,
      report_time: c.report_time || nowStr(),
      status: 1,
      remark: c.remark
    })
    resultId.value = created.id
    resultNo.value = created.computer_no || ''
    step.value = 2
    emit('saved')
  } finally {
    saving.value = false
  }
}

function goDetail() {
  const id = resultId.value
  closeAll()
  router.push('/computers/' + id)
}

function closeAll() {
  visible.value = false
}

defineExpose({ open })
</script>

<style scoped>
.wiz-steps {
  margin: 4px 0 18px;
}
.wiz-body {
  min-height: 240px;
}
.wiz-done {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.wiz-tip {
  text-align: center;
  color: #909399;
  font-size: 12px;
  margin-top: -18px;
  padding-bottom: 8px;
}
.mb8 {
  margin-bottom: 8px;
}
</style>
