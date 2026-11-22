<template>
  <div class="register-page">
    <van-nav-bar title="登记电脑档案" />

    <div v-if="!canEdit" class="perm-tip">
      <van-empty image="error" description="当前账号无登记权限，请联系管理员分配" />
    </div>

    <div v-else class="form-wrap">
      <div class="sec-title">一、使用人员信息</div>
      <van-cell-group inset border class="form-card">
        <van-field label="登记方式">
          <template #input>
            <van-radio-group v-model="mode" direction="horizontal">
              <van-radio name="exist">选择已有人员</van-radio>
              <van-radio name="new">新增人员</van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <template v-if="mode === 'exist'">
          <van-field
            v-model="pickedUserText"
            label="使用人员"
            placeholder="点击选择人员（姓名/账号）"
            readonly
            is-link
            @click="showUserPicker = true"
          />
        </template>
        <template v-else>
          <van-field v-model="form.real_name" label="姓名" placeholder="使用人姓名" required />
          <van-field v-model="form.phone" label="联系电话" placeholder="选填" type="tel" />
          <van-field v-model="form.position" label="岗位" placeholder="选填" />
        </template>

        <van-field
          label="所在单位"
          :model-value="mode === 'exist' ? (pickedUser.org_name || '') : orgText"
          :placeholder="mode === 'exist' ? '随人员带出' : '点击选择单位'"
          :readonly="mode === 'exist'"
          :required="mode === 'new'"
          is-link
          @click="mode === 'new' && (showOrgPicker = true)"
        />
        <van-field
          label="所在部门"
          :model-value="mode === 'exist' ? (pickedUser.dept_name || '') : deptText"
          :placeholder="mode === 'exist' ? '随人员带出' : '请先选单位'"
          :readonly="mode === 'exist'"
          :required="mode === 'new'"
          is-link
          @click="mode === 'new' && orgId && (showDeptPicker = true)"
        />
      </van-cell-group>

      <div class="sec-title">二、电脑信息</div>
      <van-cell-group inset border class="form-card">
        <van-field
          label="电脑类型"
          :model-value="computerTypeText"
          placeholder="点击选择类型"
          readonly
          is-link
          required
          @click="showTypePicker = true"
        />
        <van-field v-model="form.brand" label="电脑品牌" placeholder="如 联想 / 戴尔 / 华为" required />
        <van-field v-model="form.model" label="型号" placeholder="选填" />
        <van-field v-model="form.sn" label="SN 序列号" placeholder="选填" />
        <van-field v-model="form.asset_no" label="固定资产编号" placeholder="非必填：手填 / 扫码枪输入">
          <template #button>
            <van-button size="small" type="primary" plain icon="scan" @click="qrRef && qrRef.open()">扫码</van-button>
          </template>
        </van-field>
        <van-field
          label="采购时间"
          :model-value="form.purchase_date"
          placeholder="选填"
          readonly
          is-link
          @click="showPurchasePicker = true"
        />
        <van-field
          label="填报时间"
          :model-value="form.report_time"
          placeholder="默认当前时间"
          readonly
          is-link
          @click="showReportPicker = true"
        />
        <van-field v-model="form.location" label="存放位置" placeholder="选填，如 信息楼201" />
        <van-field label="启用日期" :model-value="form.enable_date" placeholder="选填" readonly is-link @click="showDatePicker = true" />
      </van-cell-group>

      <div class="submit-wrap">
        <van-button type="primary" round block :loading="saving" @click="submit">生成电脑档案</van-button>
        <p class="submit-tip">提交后将按规则自动生成计算机编号，可在档案中继续登记安装软件</p>
      </div>
    </div>

    <!-- 人员选择弹层 -->
    <van-popup v-model:show="showUserPicker" position="bottom" round style="height: 70%">
      <van-search v-model="userKw" placeholder="输入姓名或账号搜索" />
      <div class="user-list">
        <van-cell
          v-for="u in filteredUsers"
          :key="u.id"
          :title="u.real_name + '（' + u.username + '）'"
          :label="(u.org_name || '') + ' ' + (u.dept_name || '')"
          clickable
          @click="pickUser(u)"
        />
        <van-empty v-if="!filteredUsers.length" description="未找到人员" image-size="60" />
      </div>
    </van-popup>

    <!-- 单位选择弹层 -->
    <van-popup v-model:show="showOrgPicker" position="bottom" round>
      <van-picker :columns="orgColumns" @confirm="onOrgPicked" @cancel="showOrgPicker = false" />
    </van-popup>

    <!-- 部门选择弹层 -->
    <van-popup v-model:show="showDeptPicker" position="bottom" round>
      <van-picker :columns="deptColumns" @confirm="onDeptPicked" @cancel="showDeptPicker = false" />
    </van-popup>

    <!-- 电脑类型弹层 -->
    <van-popup v-model:show="showTypePicker" position="bottom" round>
      <van-picker :columns="typeColumns" @confirm="onTypePicked" @cancel="showTypePicker = false" />
    </van-popup>

    <!-- 启用日期弹层 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        :min-date="new Date(2015, 0, 1)"
        :max-date="new Date(2030, 11, 31)"
        @confirm="onDatePicked"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- 采购时间弹层 -->
    <van-popup v-model:show="showPurchasePicker" position="bottom" round>
      <van-date-picker
        :min-date="new Date(2000, 0, 1)"
        :max-date="new Date(2030, 11, 31)"
        @confirm="onPurchasePicked"
        @cancel="showPurchasePicker = false"
      />
    </van-popup>

    <!-- 填报时间弹层（默认当前时间） -->
    <van-popup v-model:show="showReportPicker" position="bottom" round>
      <van-date-picker
        :min-date="new Date(2000, 0, 1)"
        :max-date="new Date(2035, 11, 31)"
        @confirm="onReportPicked"
        @cancel="showReportPicker = false"
      />
    </van-popup>

    <!-- 固定资产二维码扫描 -->
    <QrScanner ref="qrRef" @detected="onQrDetected" />
  </div>
</template>

<script setup>
// 信息录入：登记电脑档案（使用人员信息 → 电脑信息 → 生成档案）
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { get, post } from '../../api/request'
import { useUser, hasPerm } from '../../composables/user'
import { COMPUTER_TYPE_MAP } from '../../constants'
import QrScanner from '../../components/QrScanner.vue'

const router = useRouter()
const user = useUser()
const canEdit = computed(() => hasPerm('computer:edit'))

const mode = ref('exist')
const saving = ref(false)
const users = ref([])
const userKw = ref('')
const showUserPicker = ref(false)
const pickedUserId = ref(null)

const orgTree = ref([])
const deptList = ref([])
const showOrgPicker = ref(false)
const showDeptPicker = ref(false)
const showTypePicker = ref(false)
const showDatePicker = ref(false)
const showPurchasePicker = ref(false)
const showReportPicker = ref(false)
const qrRef = ref(null)

const form = reactive({
  real_name: '',
  phone: '',
  position: '',
  org_id: null,
  dept_id: null,
  computer_type: null,
  brand: '',
  model: '',
  sn: '',
  asset_no: '',
  location: '',
  enable_date: '',
  purchase_date: '',
  report_time: nowStr()
})

function nowStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  )
}

function onQrDetected(code) {
  form.asset_no = code
  showToast('已识别固定资产编号：' + code)
}

function onPurchasePicked({ selectedValues }) {
  form.purchase_date = selectedValues.join('-')
  showPurchasePicker.value = false
}

function onReportPicked({ selectedValues }) {
  const v = selectedValues.join('-')
  form.report_time = v.length > 10 ? v : v + ' 00:00:00'
  showReportPicker.value = false
}

const pickedUser = computed(() => users.value.find((u) => u.id === pickedUserId.value) || {})
const pickedUserText = computed(() => (pickedUser.value.real_name ? pickedUser.value.real_name + '（' + pickedUser.value.username + '）' : ''))
const filteredUsers = computed(() => {
  const kw = userKw.value.trim()
  if (!kw) return users.value
  return users.value.filter((u) => (u.real_name || '').includes(kw) || (u.username || '').includes(kw))
})

const orgText = computed(() => {
  const o = orgTree.value.find((x) => x.id === form.org_id)
  return o ? o.org_name : ''
})
const deptText = computed(() => {
  const d = deptList.value.find((x) => x.id === form.dept_id)
  return d ? d.dept_name : ''
})
const computerTypeText = computed(() => (form.computer_type ? COMPUTER_TYPE[form.computer_type] : ''))

const orgColumns = computed(() => orgTree.value.map((o) => ({ text: o.org_name, value: o.id })))
const deptColumns = computed(() => deptList.value.map((d) => ({ text: d.dept_name, value: d.id })))
const typeColumns = computed(() => Object.keys(COMPUTER_TYPE_MAP).map((k) => ({ text: COMPUTER_TYPE_MAP[k], value: Number(k) })))

function pickUser(u) {
  pickedUserId.value = u.id
  showUserPicker.value = false
  showToast('已带出：' + u.real_name)
}

function onOrgPicked({ selectedOptions }) {
  if (selectedOptions && selectedOptions[0]) {
    form.org_id = selectedOptions[0].value
    form.dept_id = null
    loadDepts(form.org_id)
  }
  showOrgPicker.value = false
}

function onDeptPicked({ selectedOptions }) {
  if (selectedOptions && selectedOptions[0]) form.dept_id = selectedOptions[0].value
  showDeptPicker.value = false
}

function onTypePicked({ selectedOptions }) {
  if (selectedOptions && selectedOptions[0]) form.computer_type = selectedOptions[0].value
  showTypePicker.value = false
}

function onDatePicked({ selectedValues }) {
  form.enable_date = selectedValues.join('-')
  showDatePicker.value = false
}

async function loadDepts(orgId) {
  const tree = (await get('/depts/tree', { orgId })) || []
  // 扁平化为可选列表（含子部门层级前缀）
  const out = []
  const walk = (nodes, prefix) => {
    for (const n of nodes || []) {
      out.push({ id: n.id, dept_name: prefix + n.dept_name })
      walk(n.children || [], prefix + n.dept_name + ' / ')
    }
  }
  walk(tree, '')
  deptList.value = out
}

async function submit() {
  // 校验
  if (mode.value === 'exist' && !pickedUserId.value) return showToast('请选择使用人员')
  if (mode.value === 'new') {
    if (!form.real_name) return showToast('请填写姓名')
    if (!form.org_id || !form.dept_id) return showToast('请选择所在单位与部门')
  }
  if (!form.computer_type) return showToast('请选择电脑类型')
  if (!form.brand) return showToast('请填写电脑品牌')

  saving.value = true
  try {
    let userId = pickedUserId.value
    if (mode.value === 'new') {
      const stamp = String(Date.now()).slice(-6)
      // 登记场景新增人员仅建立人员档案（不绑定登录角色）
      const u = await post('/users', {
        username: 'emp' + stamp,
        password: '123456',
        real_name: form.real_name,
        org_id: form.org_id,
        dept_id: form.dept_id,
        position: form.position,
        phone: form.phone,
        use_computer: 1,
        role_ids: []
      })
      userId = u.id
    }
    const created = await post('/computers', {
      brand: form.brand,
      model: form.model,
      sn: form.sn,
      asset_no: form.asset_no || undefined,
      computer_type: form.computer_type,
      org_id: mode.value === 'exist' ? pickedUser.value.org_id : form.org_id,
      dept_id: mode.value === 'exist' ? pickedUser.value.dept_id : form.dept_id,
      user_id: userId,
      location: form.location,
      enable_date: form.enable_date,
      purchase_date: form.purchase_date || undefined,
      report_time: form.report_time || nowStr(),
      status: 1
    })
    showToast.success('档案已生成：' + (created.computer_no || ''))
    setTimeout(() => router.push('/computers/' + created.id), 800)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  orgTree.value = (await get('/orgs/tree')) || []
  users.value = ((await get('/users', { page: 1, pageSize: 200 })) || {}).list || []
})
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: #f3f7fc;
  padding-bottom: 24px;
}
.perm-tip {
  padding-top: 60px;
}
.form-wrap {
  padding-top: 8px;
}
.sec-title {
  padding: 12px 20px 6px;
  font-size: 13px;
  font-weight: bold;
  color: #1a66d0;
}
.form-card {
  background: #fff;
}
.submit-wrap {
  padding: 16px;
}
.submit-tip {
  margin-top: 8px;
  text-align: center;
  color: #8492a6;
  font-size: 12px;
}
.user-list {
  height: calc(70vh - 110px);
  overflow-y: auto;
}
</style>
