<template>
  <el-card shadow="never" class="page-card" v-loading="loading">
    <div class="detail-header">
      <el-button :icon="Back" @click="$router.push('/computers')">返回列表</el-button>
      <span class="detail-title">一机一档：{{ computer.computer_no }}</span>
      <el-tag :type="computerStatusTag(computer.status)" class="ml8">{{ enumText(COMPUTER_STATUS, computer.status) }}</el-tag>
      <div class="header-actions">
        <el-button size="small" :icon="Postcard" @click="qrVisible = true">资产标签</el-button>
        <el-button v-if="Number(computer.user_id) > 0" v-perm="'computer:edit'" size="small" type="warning" plain @click="openCheckin">归还入库</el-button>
        <el-button v-else v-perm="'computer:edit'" size="small" type="success" plain @click="openCheckout">领用</el-button>
      </div>
    </div>
    <el-tabs v-model="tab" class="detail-tabs">
      <el-tab-pane label="基本信息" name="base">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="计算机编号">{{ computer.computer_no }}</el-descriptions-item>
          <el-descriptions-item label="品牌">{{ computer.brand || '-' }}</el-descriptions-item>
          <el-descriptions-item label="型号">{{ computer.model || '-' }}</el-descriptions-item>
          <el-descriptions-item label="SN 序列号">{{ computer.sn || '-' }}</el-descriptions-item>
          <el-descriptions-item label="固定资产编号">{{ computer.asset_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计算机类型">{{ enumText(COMPUTER_TYPE, computer.computer_type) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="computerStatusTag(computer.status)">{{ enumText(COMPUTER_STATUS, computer.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属单位">{{ computer.org_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所属部门">{{ computer.dept_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="使用人">{{ computer.user_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="存放位置">{{ computer.location || '-' }}</el-descriptions-item>
          <el-descriptions-item label="启用日期">{{ computer.enable_date || '-' }}</el-descriptions-item>
          <el-descriptions-item label="采购时间">{{ computer.purchase_date || '-' }}</el-descriptions-item>
          <el-descriptions-item label="填报时间">{{ computer.report_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="已装软件数">{{ installed.length }}</el-descriptions-item>
          <el-descriptions-item label="固定资产编号">{{ computer.asset_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前使用人">{{ computer.user_name || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="3">{{ computer.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>
      <el-tab-pane label="已装软件" name="installed">
        <div class="tab-toolbar">
          <el-button v-perm="'install:edit'" type="primary" size="small" :icon="Plus" @click="openAddSw">添加软件</el-button>
          <span class="tab-tip">先选择软件分类，再从该分类的预置正版软件清单中选择</span>
        </div>
        <el-table :data="installed" border stripe>
          <el-table-column type="index" label="序号" width="70" />
          <el-table-column prop="software_no" label="软件编号" width="160" />
          <el-table-column prop="software_name" label="软件名称" min-width="180" show-overflow-tooltip />
          <el-table-column label="分类" width="110">
            <template #default="{ row }">{{ enumText(CATEGORY, row.category) }}</template>
          </el-table-column>
          <el-table-column label="软件类型" width="110">
            <template #default="{ row }">{{ enumText(SOFTWARE_TYPE, row.software_type) }}</template>
          </el-table-column>
          <el-table-column prop="version" label="版本" width="120" />
          <el-table-column prop="license_term" label="许可期限" width="120" />
          <el-table-column prop="install_date" label="安装日期" width="120" />
          <el-table-column prop="install_source" label="安装来源" width="110" />
          <el-table-column label="核查状态" width="100">
            <template #default="{ row }">
              <el-tag :type="inspectTag(row.inspect_status)" size="small">{{ inspectText(row.inspect_status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-perm="'install:edit'" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-popconfirm title="移除该软件的安装记录？" @confirm="removeSw(row)">
                <template #reference><el-button link type="danger">移除</el-button></template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="领用记录" name="checkout">
        <div class="tab-toolbar">
          <el-button v-perm="'computer:edit'" size="small" type="success" plain @click="openCheckout" :disabled="Number(computer.user_id) > 0">领用</el-button>
          <el-button v-perm="'computer:edit'" size="small" type="warning" plain @click="openCheckin" :disabled="Number(computer.user_id) === 0">归还</el-button>
        </div>
        <el-table :data="checkoutLogs" border stripe>
          <el-table-column type="index" label="序号" width="70" />
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-tag :type="Number(row.action) === 1 ? 'success' : 'warning'" size="small">{{ Number(row.action) === 1 ? '领用' : '归还' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="user_name" label="领用人/归还人" width="120" />
          <el-table-column prop="action_time" label="时间" width="170" />
          <el-table-column prop="operator_name" label="经办人" width="110" />
          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        </el-table>
        <div v-if="!checkoutLogs.length" class="empty-line" style="padding: 16px 0; color: #909399; font-size: 13px">暂无领用记录</div>
      </el-tab-pane>

      <el-tab-pane label="维护时间轴" name="logs">
        <el-timeline v-if="logs.length" class="log-timeline">
          <el-timeline-item
            v-for="l in logs"
            :key="l.id"
            :timestamp="str(l.op_date)"
            :type="Number(l.op_type) === 2 ? 'danger' : Number(l.op_type) === 1 ? 'success' : 'primary'"
            placement="top"
          >
            <div class="log-item">
              <el-tag size="small" class="mr8">{{ enumText(OP_TYPE, l.op_type) }}</el-tag>
              <span class="log-software">{{ l.software_name || '-' }}</span>
              <span class="log-operator">操作人：{{ l.operator_name || '-' }}</span>
            </div>
            <div class="log-reason">{{ l.reason || '' }}{{ l.apply_no_display ? '（关联单号 ' + l.apply_no_display + '）' : '' }}</div>
          </el-timeline-item>
        </el-timeline>
        <div v-else class="empty-line">暂无维护记录</div>
      </el-tab-pane>
    </el-tabs>

    <!-- 资产标签二维码（打印贴标签） -->
    <el-dialog v-model="qrVisible" title="资产标签二维码" width="380px" destroy-on-close>
      <div class="qr-label" style="text-align: center">
        <img v-if="qrData" :src="qrData" alt="二维码" style="width: 200px; height: 200px" />
        <p style="font-weight: bold; margin: 10px 0 4px">{{ computer.computer_no }}</p>
        <p style="color: #909399; font-size: 12px; margin: 0">固定资产编号：{{ computer.asset_no || '—' }} · 扫码直达一机一档</p>
      </div>
      <template #footer>
        <el-button @click="qrVisible = false">关闭</el-button>
        <el-button type="primary" @click="printLabel">打印标签</el-button>
      </template>
    </el-dialog>

    <!-- 领用/归还对话框 -->
    <el-dialog v-model="coDlg.visible" :title="coDlg.action === 1 ? '资产领用' : '归还入库'" width="460px" destroy-on-close>
      <el-form ref="coFormRef" :model="coDlg" label-width="90px">
        <el-form-item v-if="coDlg.action === 1" label="领用人" required>
          <el-select v-model="coDlg.user_id" filterable style="width: 100%">
            <el-option v-for="u in coUsers" :key="u.id" :label="u.real_name + '（' + u.username + '）'" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="coDlg.action === 2" label="归还人">
          <el-input :model-value="computer.user_name || ''" disabled />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="coDlg.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="coDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="coDlg.saving" @click="submitCo">{{ coDlg.action === 1 ? '确认领用' : '确认归还' }}</el-button>
      </template>
    </el-dialog>

    <!-- 添加软件对话框（FR-04：分类 → 预置正版软件清单 → 登记安装明细） -->
    <el-dialog v-model="swDlg.visible" title="添加安装软件" width="560px" destroy-on-close>
      <el-form ref="swFormRef" :model="swDlg" :rules="swRules" label-width="100px">
        <el-form-item label="软件分类" prop="category">
          <el-select v-model="swDlg.category" style="width: 100%" @change="onSwCategory">
            <el-option v-for="(t, k) in CATEGORY" :key="k" :label="t" :value="Number(k)" />
          </el-select>
        </el-form-item>
        <el-form-item label="软件名称" prop="software_id">
          <el-select v-model="swDlg.software_id" filterable style="width: 100%" @change="onSwPick">
            <el-option v-for="s in swOptions" :key="s.id" :label="s.software_name + (s.version ? '（' + s.version + '）' : '')" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="安装版本">
              <el-input v-model="swDlg.version" placeholder="可修改" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="许可期限">
              <el-input v-model="swDlg.license_term" placeholder="如 1年 / 长期" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="安装日期" prop="install_date">
              <el-date-picker v-model="swDlg.install_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="安装来源">
              <el-select v-model="swDlg.install_source" style="width: 100%">
                <el-option label="统一部署" value="统一部署" />
                <el-option label="个人申请" value="个人申请" />
                <el-option label="补录" value="补录" />
                <el-option label="自动发现" value="自动发现" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="swDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="swDlg.saving" @click="submitSw">登记到台账</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
// 一机一档详情：基本信息 / 已装软件 / 维护时间轴（computer:view）
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Back, Plus, Postcard } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { get, post, del } from '../../api/request'
import { CATEGORY, SOFTWARE_TYPE, COMPUTER_TYPE, COMPUTER_STATUS, OP_TYPE, INS_RESULT, enumText, computerStatusTag } from '../../constants'

const route = useRoute()
const loading = ref(false)
const tab = ref('base')
const computer = ref({})
const installed = ref([])
const logs = ref([])

// ===== 资产标签二维码 / 领用归还（借鉴 Snipe-IT 生命周期管理）=====
const qrVisible = ref(false)
const qrData = ref('')
const checkoutLogs = ref([])
const coDlg = reactive({ visible: false, saving: false, action: 1, user_id: null, remark: '' })
const coUsers = ref([])
const coFormRef = ref()

async function loadQr() {
  const d = await get('/computers/' + route.params.id + '/qrcode')
  qrData.value = (d && d.qrcode) || ''
}

async function printLabel() {
  const win = window.open('', '_blank', 'width=420,height=520')
  win.document.write(
    '<html><body style="text-align:center;font-family:sans-serif" onload="window.print()">' +
    '<h2 style="margin:8px 0">' + computer.value.computer_no + '</h2>' +
    '<img src="' + qrData.value + '" style="width:220px;height:220px" />' +
    '<p style="color:#666">固定资产编号：' + (computer.value.asset_no || '—') + '</p>' +
    '<p style="color:#999;font-size:12px">扫码直达一机一档</p></body></html>'
  )
  win.document.close()
}

async function loadCheckoutLogs() {
  checkoutLogs.value = (await get('/computers/' + route.params.id + '/checkout-logs')) || []
}

async function openCheckout() {
  coDlg.action = 1
  coDlg.user_id = null
  coDlg.remark = ''
  coUsers.value = ((await get('/users', { page: 1, pageSize: 200 })) || {}).list || []
  coDlg.visible = true
}

function openCheckin() {
  coDlg.action = 2
  coDlg.remark = ''
  coDlg.visible = true
}

async function submitCo() {
  if (coDlg.action === 1 && !coDlg.user_id) {
    ElMessage.warning('请选择领用人')
    return
  }
  coDlg.saving = true
  try {
    if (coDlg.action === 1) {
      await post('/computers/' + route.params.id + '/checkout', { user_id: coDlg.user_id, remark: coDlg.remark })
      ElMessage.success('领用成功，台账已更新')
    } else {
      await post('/computers/' + route.params.id + '/checkin', { remark: coDlg.remark })
      ElMessage.success('归还成功')
    }
    coDlg.visible = false
    await reload()
    await loadCheckoutLogs()
  } finally {
    coDlg.saving = false
  }
}

// ===== 添加软件对话框（先选分类，再从预置正版软件清单选择）=====
const swDlg = reactive({ visible: false, saving: false, category: null, software_id: null, version: '', license_term: '', install_date: '', install_source: '个人申请' })
const swOptions = ref([])
const swFormRef = ref()
const swRules = {
  category: [{ required: true, message: '请选择软件分类', trigger: 'change' }],
  software_id: [{ required: true, message: '请选择软件', trigger: 'change' }],
  install_date: [{ required: true, message: '请选择安装日期', trigger: 'change' }]
}

async function openAddSw() {
  Object.assign(swDlg, { visible: true, saving: false, category: null, software_id: null, version: '', license_term: '', install_date: today(), install_source: '个人申请' })
  swOptions.value = []
}

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

/** 分类联动：加载该分类下的预置正版软件清单（软件资产库） */
async function onSwCategory() {
  swDlg.software_id = null
  const all = (await get('/softwares/options')) || []
  swOptions.value = swDlg.category ? all.filter((s) => Number(s.category) === Number(swDlg.category)) : []
}

function onSwPick() {
  const s = swOptions.value.find((x) => x.id === swDlg.software_id)
  if (s) swDlg.version = s.version || ''
}

async function submitSw() {
  await swFormRef.value.validate()
  swDlg.saving = true
  try {
    await post('/install-records', {
      computer_id: Number(route.params.id),
      software_id: swDlg.software_id,
      version: swDlg.version,
      license_term: swDlg.license_term,
      install_date: swDlg.install_date,
      install_source: swDlg.install_source
    })
    ElMessage.success('软件登记成功，台账已更新')
    swDlg.visible = false
    await reload()
  } finally {
    swDlg.saving = false
  }
}

async function removeSw(row) {
  await del('/install-records/' + row.id)
  ElMessage.success('已移除：' + (row.software_name || ''))
  await reload()
}

async function reload() {
  const data = await get('/computers/' + route.params.id)
  computer.value = (data && data.computer) || {}
  installed.value = (data && data.installed) || []
  logs.value = (data && data.logs) || []
}

function str(v) {
  return String(v || '').slice(0, 19)
}

function inspectText(s) {
  const n = Number(s) || 0
  return n === 0 ? '未核查' : enumText(INS_RESULT, n)
}

function inspectTag(s) {
  return { 0: 'info', 1: 'success', 2: 'danger', 3: 'warning', 4: 'warning' }[Number(s) || 0] || 'info'
}

onMounted(async () => {
  await reload()
  await loadQr()
  await loadCheckoutLogs()
})
</script>

<style scoped>
.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.tab-tip {
  color: #909399;
  font-size: 12px;
}
.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.detail-title {
  font-size: 16px;
  font-weight: bold;
  color: #1f2d3d;
  margin-left: 14px;
}
.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.ml8 {
  margin-left: 8px;
}
.mr8 {
  margin-right: 8px;
}
.detail-tabs {
  margin-top: 12px;
}
.log-timeline {
  padding-left: 6px;
  margin-top: 8px;
}
.log-item {
  display: flex;
  align-items: center;
}
.log-software {
  font-weight: bold;
  color: #303133;
  margin-right: 12px;
}
.log-operator {
  color: #909399;
  font-size: 13px;
}
.log-reason {
  color: #606266;
  font-size: 13px;
  margin-top: 4px;
}
.empty-line {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 30px 0;
}
</style>
