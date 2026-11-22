<template>
  <el-drawer :model-value="modelValue" size="560px" :title="apply.apply_no || '申请详情'" @update:model-value="(v) => emit('update:modelValue', v)">
    <div v-loading="loading">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="申请单号">{{ apply.apply_no }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="flowStatusTag(apply.status)" size="small">{{ enumText(FLOW_STATUS, apply.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ apply.applicant_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请部门">{{ apply.dept_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="计算机编号">{{ apply.computer_no || apply.computer_no }}</el-descriptions-item>
        <el-descriptions-item label="申请类型">{{ enumText(APPLY_TYPE, apply.apply_type) }}</el-descriptions-item>
        <el-descriptions-item label="软件名称" :span="2">{{ apply.software_name }}</el-descriptions-item>
        <el-descriptions-item label="版本">{{ apply.version || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ str(apply.apply_time) }}</el-descriptions-item>
        <el-descriptions-item v-if="Number(apply.apply_type) === 3" label="升级前版本">{{ apply.upgrade_from || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="Number(apply.apply_type) === 3" label="升级后版本">{{ apply.upgrade_to || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请理由" :span="2">{{ apply.reason || '-' }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="sec-title">审批轨迹</h4>
      <el-timeline v-if="approvals.length" class="approval-line">
        <el-timeline-item
          v-for="(a, i) in approvals"
          :key="i"
          :timestamp="str(a.approve_time)"
          :type="Number(a.result) === 1 ? 'success' : 'danger'"
        >
          <span class="approval-node">{{ a.node }}</span>
          <el-tag :type="Number(a.result) === 1 ? 'success' : 'danger'" size="small" class="ml8">
            {{ APPROVE_RESULT[Number(a.result)] || '-' }}
          </el-tag>
          <div class="approval-opinion">审批人ID：{{ a.approver_id }}{{ a.opinion ? '，意见：' + a.opinion : '' }}</div>
        </el-timeline-item>
      </el-timeline>
      <div v-else class="empty-line">暂无审批记录</div>

      <h4 class="sec-title">确认单</h4>
      <el-descriptions v-if="confirm" :column="2" border size="small">
        <el-descriptions-item label="使用人签名">{{ confirm.user_sign || '待签名' }}</el-descriptions-item>
        <el-descriptions-item label="签名时间">{{ str(confirm.user_sign_time) }}</el-descriptions-item>
        <el-descriptions-item label="操作人签名">{{ confirm.operator_sign || '-' }}</el-descriptions-item>
        <el-descriptions-item label="签名时间">{{ str(confirm.operator_sign_time) }}</el-descriptions-item>
      </el-descriptions>
      <div v-else class="empty-line">流程办结后生成确认单</div>

      <h4 class="sec-title">维护日志</h4>
      <el-table v-if="logs.length" :data="logs" border size="small">
        <el-table-column label="操作" width="100">
          <template #default="{ row }">{{ enumText(OP_TYPE, row.op_type) }}</template>
        </el-table-column>
        <el-table-column prop="op_date" label="时间" width="150">
          <template #default="{ row }">{{ str(row.op_date) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="说明" min-width="140" show-overflow-tooltip />
      </el-table>
      <div v-else class="empty-line">流程办结写回台账后生成维护日志</div>
    </div>
  </el-drawer>
</template>

<script setup>
// 维护申请详情抽屉：主信息 + 审批轨迹 + 确认单 + 维护日志
import { reactive, ref, watch } from 'vue'
import { get } from '../../api/request'
import { FLOW_STATUS, APPLY_TYPE, OP_TYPE, APPROVE_RESULT, enumText, flowStatusTag } from '../../constants'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 申请单 id */
  applyId: { type: [Number, String], default: null }
})
const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const apply = reactive({})
const approvals = ref([])
const confirm = ref(null)
const logs = ref([])

watch(
  () => props.modelValue,
  (v) => {
    if (v && props.applyId) load()
  }
)

async function load() {
  loading.value = true
  try {
    const data = await get('/maint-applies/' + props.applyId)
    Object.assign(apply, (data && data.apply) || {})
    approvals.value = (data && data.approvals) || []
    confirm.value = (data && data.confirm) || null
    logs.value = (data && data.maintLogs) || []
  } finally {
    loading.value = false
  }
}

function str(v) {
  return String(v || '').slice(0, 19)
}
</script>

<style scoped>
.sec-title {
  margin: 16px 0 8px;
  color: #1f2d3d;
}
.approval-line {
  padding-left: 4px;
}
.approval-node {
  font-weight: bold;
  color: #303133;
}
.approval-opinion {
  color: #606266;
  font-size: 13px;
  margin-top: 4px;
}
.ml8 {
  margin-left: 8px;
}
.empty-line {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 12px 0;
}
</style>
