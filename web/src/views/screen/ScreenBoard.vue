<template>
  <div class="screen-board">
    <header class="screen-header">
      <router-link to="/" class="screen-back">&larr; 返回系统</router-link>
      <h1 class="screen-title">正版软件管理平台 · 数据驾驶舱</h1>
      <div class="screen-clock">{{ nowText }}</div>
    </header>

    <!-- 指标卡行 -->
    <section class="metric-row">
      <div v-for="m in metrics" :key="m.label" class="metric-card" :style="{ '--glow': m.color }">
        <div class="metric-num" :style="{ color: m.color }">{{ Number(m.value) || 0 }}</div>
        <div class="metric-label">{{ m.label }}</div>
      </div>
    </section>

    <!-- 图表区 -->
    <section class="chart-grid">
      <div class="screen-panel">
        <div class="panel-title">四类软件安装分布</div>
        <div ref="catRef" class="panel-chart" />
      </div>
      <div class="screen-panel">
        <div class="panel-title">各单位安装数量排名</div>
        <div ref="orgRef" class="panel-chart" />
      </div>
      <div class="screen-panel">
        <div class="panel-title">国产化替代统计（信创）</div>
        <div ref="domRef" class="panel-chart" />
      </div>
    </section>
  </div>
</template>

<script setup>
// 驾驶舱大屏：全屏独立布局（不挂 AdminLayout），深色风格
// 指标卡（/stats/overview）+ 四类分布环形图（/stats/category）+ 单位排名柱图（/stats/org-install）
// + 国产化替代环形图（/stats/domestic）；时钟每秒刷新，数据 60s 自动刷新（stats:view）
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { get } from '../../api/request'
import { CATEGORY } from '../../constants'

const SCREEN_TEXT = '#cfe3ff'
const SCREEN_LINE = 'rgba(207, 227, 255, 0.15)'

const catRef = ref()
const orgRef = ref()
const domRef = ref()
const nowText = ref('')
const ov = reactive({})
let catChart = null
let orgChart = null
let domChart = null
let clockTimer = null
let refreshTimer = null

/** 七个大数字指标卡（发光色区分） */
const metrics = computed(() => [
  { label: '计算机总数', value: ov.computer_total, color: '#409eff' },
  { label: '登记软件总数', value: ov.software_total, color: '#2fd8a4' },
  { label: '安装记录总数', value: ov.install_total, color: '#3d8bff' },
  { label: '绑定使用人', value: ov.person_total, color: '#ffb64d' },
  { label: '待办流程', value: ov.flow_pending, color: '#ff8c5a' },
  { label: '未处理预警', value: ov.alert_unhandled, color: '#ff6b81' },
  { label: '90天到期授权', value: ov.expiring_90, color: '#c88bff' }
])

/** 实时时钟（每秒更新） */
function tickClock() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  nowText.value =
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) +
    ' 星期' + week
}

/** 四类软件安装分布环形图 */
function renderCategory(data) {
  if (!catChart) catChart = echarts.init(catRef.value)
  catChart.setOption({
    color: ['#3d8bff', '#2fd8a4', '#ffb64d', '#ff6b81'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: SCREEN_TEXT } },
    series: [
      {
        name: '软件分类',
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#0b1c3f', borderWidth: 2 },
        label: { color: SCREEN_TEXT, formatter: '{b}: {c}' },
        labelLine: { lineStyle: { color: SCREEN_LINE } },
        data: (data || []).map((r) => ({ name: CATEGORY[Number(r.category)] || String(r.category), value: Number(r.n) || 0 }))
      }
    ]
  })
}

/** 各单位安装数量排名横向柱图 */
function renderOrg(data) {
  if (!orgChart) orgChart = echarts.init(orgRef.value)
  const rows = (data || []).slice(0, 10)
  orgChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 44, top: 20, bottom: 26 },
    xAxis: {
      type: 'value',
      name: '安装数',
      nameTextStyle: { color: SCREEN_TEXT },
      axisLabel: { color: SCREEN_TEXT },
      splitLine: { lineStyle: { color: SCREEN_LINE } }
    },
    yAxis: { type: 'category', axisLabel: { color: SCREEN_TEXT }, data: rows.map((r) => r.org_name || '') },
    series: [
      {
        name: '安装数',
        type: 'bar',
        barMaxWidth: 16,
        itemStyle: { color: '#3d8bff', borderRadius: [0, 8, 8, 0] },
        label: { show: true, position: 'right', color: SCREEN_TEXT },
        data: rows.map((r) => Number(r.n) || 0)
      }
    ]
  })
}

/** 国产化替代环形图（国产绿/国外灰，中心显示国产化率） */
function renderDomestic(data) {
  if (!domChart) domChart = echarts.init(domRef.value)
  const rate = Number(data.rate) || 0
  domChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: SCREEN_TEXT } },
    title: {
      text: rate.toFixed(2) + '%',
      subtext: '国产化率',
      left: 'center',
      top: '32%',
      textStyle: { fontSize: 30, fontWeight: 'bold', color: SCREEN_TEXT },
      subtextStyle: { fontSize: 13, color: '#8fb3dd' }
    },
    series: [
      {
        name: '软件来源',
        type: 'pie',
        radius: ['46%', '66%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#0b1c3f', borderWidth: 2 },
        label: { color: SCREEN_TEXT, formatter: '{b}: {c}' },
        labelLine: { lineStyle: { color: SCREEN_LINE } },
        data: [
          { name: '国产软件', value: Number(data.domestic) || 0, itemStyle: { color: '#67c23a' } },
          { name: '国外软件', value: Number(data.foreign) || 0, itemStyle: { color: '#909399' } }
        ]
      }
    ]
  })
}

/** 全量数据加载（首帧 + 60s 定时刷新共用） */
async function loadAll() {
  const [overview, category, orgInstall, domestic] = await Promise.all([
    get('/stats/overview'),
    get('/stats/category'),
    get('/stats/org-install'),
    get('/stats/domestic')
  ])
  Object.assign(ov, (overview && overview.overview) || {})
  renderCategory(category)
  renderOrg(orgInstall)
  renderDomestic(domestic)
}

function onResize() {
  catChart && catChart.resize()
  orgChart && orgChart.resize()
  domChart && domChart.resize()
}

onMounted(() => {
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
  loadAll()
  refreshTimer = setInterval(loadAll, 60000)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
  window.removeEventListener('resize', onResize)
  catChart && catChart.dispose()
  orgChart && orgChart.dispose()
  domChart && domChart.dispose()
  catChart = orgChart = domChart = null
})
</script>

<style scoped>
.screen-board {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 14px 24px 20px;
  background: radial-gradient(ellipse at top, #10305e 0%, #0b1c3f 55%, #081430 100%);
}

/* 顶部：返回 / 大标题 / 时钟 */
.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0 14px;
}
.screen-title {
  margin: 0;
  font-size: 30px;
  letter-spacing: 4px;
  font-weight: bold;
  color: #e6f1ff;
  text-shadow: 0 0 18px rgba(61, 139, 255, 0.75);
  white-space: nowrap;
}
.screen-back {
  flex-shrink: 0;
  color: #8fb3dd;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 14px;
  border: 1px solid rgba(143, 179, 221, 0.4);
  border-radius: 4px;
  transition: all 0.2s;
}
.screen-back:hover {
  color: #cfe3ff;
  border-color: rgba(207, 227, 255, 0.7);
}
.screen-clock {
  flex-shrink: 0;
  font-size: 16px;
  color: #8fb3dd;
  font-variant-numeric: tabular-nums;
}

/* 指标卡行：发光边框 */
.metric-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}
.metric-card {
  --glow: #409eff;
  padding: 18px 10px 14px;
  text-align: center;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.07);
  border: 1px solid color-mix(in srgb, var(--glow) 55%, transparent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--glow) 30%, transparent), inset 0 0 12px color-mix(in srgb, var(--glow) 12%, transparent);
}
.metric-num {
  font-size: 34px;
  font-weight: bold;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.metric-label {
  margin-top: 6px;
  font-size: 14px;
  color: #8fb3dd;
}

/* 图表区三联面板 */
.chart-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  min-height: 380px;
}
.screen-panel {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: rgba(16, 48, 94, 0.5);
  border: 1px solid rgba(61, 139, 255, 0.35);
  box-shadow: inset 0 0 30px rgba(61, 139, 255, 0.08);
  overflow: hidden;
}
.panel-title {
  padding: 12px 16px;
  font-size: 16px;
  font-weight: bold;
  color: #cfe3ff;
  letter-spacing: 2px;
  border-bottom: 1px solid rgba(61, 139, 255, 0.25);
}
.panel-chart {
  flex: 1;
  min-height: 300px;
}

@media (max-width: 1200px) {
  .metric-row {
    grid-template-columns: repeat(4, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
