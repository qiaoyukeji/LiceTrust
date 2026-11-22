<template>
  <div class="workbench">
    <!-- 指标卡片组 -->
    <el-row :gutter="16">
      <el-col v-for="c in cards" :key="c.label" :xs="12" :sm="8" :md="6" :lg="4" class="card-col">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <el-icon :size="26" :color="c.color"><component :is="c.icon" /></el-icon>
            <div>
              <div class="stat-value">{{ c.value }}</div>
              <div class="stat-label">{{ c.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt16">
      <!-- 我的待办 -->
      <el-col :md="14" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">我的待办</span></template>
          <el-tabs v-model="todoTab">
            <el-tab-pane label="待部门审核" name="dept_approve">
              <todo-table :rows="todos.dept_approve" empty-text="暂无待部门审核事项" />
            </el-tab-pane>
            <el-tab-pane label="待信息化审核" name="it_approve">
              <todo-table :rows="todos.it_approve" empty-text="暂无待信息化审核事项" />
            </el-tab-pane>
            <el-tab-pane label="待执行" name="to_execute">
              <todo-table :rows="todos.to_execute" empty-text="暂无待执行事项" />
            </el-tab-pane>
            <el-tab-pane label="待我确认" name="to_confirm">
              <todo-table :rows="todos.to_confirm" empty-text="暂无待确认事项" />
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>

      <!-- 预警提醒 + 快捷入口 -->
      <el-col :md="10" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">预警提醒（未处理）</span></template>
          <div v-if="!alerts.length" class="empty-line">暂无未处理预警</div>
          <el-alert
            v-for="a in alerts"
            :key="a.id"
            :title="a.content"
            :type="a.level === 1 ? 'error' : a.level === 2 ? 'warning' : 'info'"
            :closable="false"
            class="alert-line"
            show-icon
          />
        </el-card>

        <el-card shadow="never" class="page-card mt16">
          <template #header><span class="card-title">快捷入口</span></template>
          <div class="quick-grid">
            <el-button v-for="q in quickLinks" :key="q.path" plain class="quick-btn" @click="$router.push(q.path)">
              <el-icon class="quick-icon"><component :is="q.icon" /></el-icon>
              {{ q.title }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
// 工作台：指标卡片 + 四类待办 + 预警 + 快捷入口
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { get } from '../../api/request'
import { useUserStore } from '../../stores/user'
import { FLOW_STATUS } from '../../constants'

const router = useRouter()
const store = useUserStore()

const summary = reactive({ overview: {}, todos: {}, flowStatus: [] })
const todos = reactive({ dept_approve: [], it_approve: [], to_execute: [], to_confirm: [] })
const alerts = ref([])
const todoTab = ref('dept_approve')

/** 指标卡片 */
const cards = computed(() => {
  const o = summary.overview
  return [
    { label: '计算机总数', value: o.computer_total || 0, icon: 'Monitor', color: '#1f5aa8' },
    { label: '在用计算机', value: o.computer_active || 0, icon: 'Cpu', color: '#67c23a' },
    { label: '软件资产', value: o.software_total || 0, icon: 'Box', color: '#e6a23c' },
    { label: '安装记录', value: o.install_total || 0, icon: 'Download', color: '#409eff' },
    { label: '流程在办', value: o.flow_pending || 0, icon: 'Tickets', color: '#f56c6c' },
    { label: '未处理预警', value: o.alert_unhandled || 0, icon: 'Bell', color: '#f56c6c' },
    { label: '90天内到期授权', value: o.expiring_90 || 0, icon: 'AlarmClock', color: '#e6a23c' },
    { label: '员工人数', value: o.person_total || 0, icon: 'User', color: '#909399' }
  ]
})

/** 快捷入口（按权限过滤） */
const quickLinks = computed(() => {
  const all = [
    { path: '/maint-applies', title: '维护申请', icon: 'SetUp', perm: 'apply:view' },
    { path: '/computers', title: '计算机台账', icon: 'Monitor', perm: 'computer:view' },
    { path: '/softwares', title: '软件资产库', icon: 'Box', perm: 'software:view' },
    { path: '/entitlements', title: '授权管理', icon: 'Key', perm: 'entitlement:view' },
    { path: '/alerts', title: '预警中心', icon: 'Bell', perm: 'alert:view' },
    { path: '/reports', title: '报表中心', icon: 'Document', perm: 'report:view' }
  ]
  return all.filter((q) => store.can(q.perm))
})

/** 待办表格（工作台专用内联渲染组件） */
const TodoTable = defineComponent({
  props: { rows: { type: Array, default: () => [] }, emptyText: String },
  setup(props2) {
    return () =>
      h('div', null, [
        props2.rows && props2.rows.length
          ? h(
              'table',
              { class: 'todo-table' },
              [
                h('thead', null, [
                  h('tr', null, [
                    h('th', null, '申请单号'),
                    h('th', null, '计算机编号'),
                    h('th', null, '软件名称'),
                    h('th', null, '申请人'),
                    h('th', null, '当前节点')
                  ])
                ]),
                h(
                  'tbody',
                  null,
                  props2.rows.map((r) =>
                    h('tr', { key: r.id, onClick: () => router.push('/maint-applies'), class: 'todo-row' }, [
                      h('td', null, r.apply_no || ''),
                      h('td', null, r.computer_no || ''),
                      h('td', null, r.software_name || ''),
                      h('td', null, r.applicant_name || ''),
                      h('td', null, FLOW_STATUS[Number(r.status)] || '')
                    ])
                  )
                )
              ]
            )
          : h('div', { class: 'empty-line' }, props2.emptyText || '暂无数据')
      ])
  }
})

onMounted(async () => {
  const s = await get('/workbench/summary')
  summary.overview = s.overview || {}
  summary.todos = s.todos || {}
  summary.flowStatus = s.flowStatus || []
  const t = await get('/workbench/todos')
  Object.assign(todos, {
    dept_approve: t.dept_approve || [],
    it_approve: t.it_approve || [],
    to_execute: t.to_execute || [],
    to_confirm: t.to_confirm || []
  })
  alerts.value = (await get('/workbench/alerts')) || []
})
</script>

<style scoped>
.card-col {
  margin-bottom: 16px;
}
.stat-card {
  cursor: default;
}
.stat-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}
.stat-label {
  font-size: 13px;
  color: #909399;
}
.mt16 {
  margin-top: 16px;
}
.card-title {
  font-weight: bold;
  color: #1f2d3d;
}
.empty-line {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}
.alert-line {
  margin-bottom: 10px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.quick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
}
.quick-icon {
  color: #1f5aa8;
}
</style>

<style>
/* 待办紧凑表格（工作台 TodoTable 渲染） */
.todo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.todo-table th,
.todo-table td {
  border-bottom: 1px solid #ebeef5;
  padding: 8px 6px;
  text-align: left;
}
.todo-table th {
  color: #909399;
  font-weight: normal;
  background: #fafafa;
}
.todo-row {
  cursor: pointer;
}
.todo-row:hover {
  background: #f5f7fa;
}
</style>
