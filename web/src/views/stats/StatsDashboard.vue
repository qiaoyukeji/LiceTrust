<template>
  <div class="stats-page">
    <el-row :gutter="16">
      <el-col :md="12" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">四类软件安装分布</span></template>
          <div ref="pieRef" class="chart-box" />
        </el-card>
      </el-col>
      <el-col :md="12" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">各单位安装数量排名</span></template>
          <div ref="barRef" class="chart-box" />
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="16" class="mt16">
      <el-col :md="12" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">近 12 个月安装趋势</span></template>
          <div ref="lineRef" class="chart-box" />
        </el-card>
      </el-col>
      <el-col :md="12" :xs="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">90 天内到期授权</span></template>
          <el-table :data="expiring" v-loading="expLoading" border stripe size="small" max-height="300">
            <el-table-column prop="software_name" label="软件名称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="auth_type" label="授权类型" width="95" />
            <el-table-column prop="license_qty" label="许可数" width="80" align="center" />
            <el-table-column prop="install_count" label="已安装" width="80" align="center" />
            <el-table-column prop="expire_date" label="到期日期" width="105" />
            <el-table-column label="剩余天数" width="95" align="center">
              <template #default="{ row }">
                <el-tag :type="daysTag(row.expire_date)" size="small">{{ daysLeft(row.expire_date) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    <!-- 国产化替代（信创）：来源环形图 + 分厂商柱图 -->
    <el-row class="mt16">
      <el-col :span="24">
        <el-card shadow="never" class="page-card">
          <template #header><span class="card-title">国产化替代统计（信创）</span></template>
          <el-row :gutter="16">
            <el-col :md="10" :xs="24">
              <div ref="domPieRef" class="chart-box" />
            </el-col>
            <el-col :md="14" :xs="24">
              <div ref="vendorRef" class="chart-box" />
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
// 统计驾驶舱：四类分布饼图 + 单位安装横柱图 + 月度趋势折线 + 到期授权表 + 国产化替代（stats:view）
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { get } from '../../api/request'
import { CATEGORY } from '../../constants'

const pieRef = ref()
const barRef = ref()
const lineRef = ref()
const domPieRef = ref()
const vendorRef = ref()
const expiring = ref([])
const expLoading = ref(false)
let pieChart = null
let barChart = null
let lineChart = null
let domPieChart = null
let vendorChart = null

/** 距到期天数（负数已过期） */
function daysLeft(d) {
  const t = new Date(String(d)).getTime()
  if (!Number.isFinite(t)) return '-'
  return Math.floor((t - Date.now()) / 86400000) + ' 天'
}

function daysTag(d) {
  const t = new Date(String(d)).getTime()
  if (!Number.isFinite(t)) return 'info'
  const days = Math.floor((t - Date.now()) / 86400000)
  return days < 0 ? 'danger' : days <= 30 ? 'danger' : days <= 60 ? 'warning' : 'info'
}

function initPie(data) {
  pieChart = echarts.init(pieRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '软件分类',
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '46%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}: {c}' },
        data: (data || []).map((r) => ({ name: CATEGORY[Number(r.category)] || String(r.category), value: Number(r.n) || 0 }))
      }
    ]
  })
}

function initBar(data) {
  barChart = echarts.init(barRef.value)
  const rows = (data || []).slice(0, 12)
  barChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 110, right: 30, top: 16, bottom: 26 },
    xAxis: { type: 'value', name: '安装数' },
    yAxis: { type: 'category', data: rows.map((r) => r.org_name || '') },
    series: [
      {
        type: 'bar',
        data: rows.map((r) => Number(r.n) || 0),
        barMaxWidth: 18,
        itemStyle: { color: '#1f5aa8' },
        label: { show: true, position: 'right', color: '#606266' }
      }
    ]
  })
}

function initLine(data) {
  lineChart = echarts.init(lineRef.value)
  const rows = (data || []).slice().sort((a, b) => String(a.ym).localeCompare(String(b.ym)))
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 46, right: 26, top: 24, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: rows.map((r) => r.ym || '') },
    yAxis: { type: 'value', name: '安装数' },
    series: [
      {
        type: 'line',
        smooth: true,
        data: rows.map((r) => Number(r.n) || 0),
        areaStyle: { opacity: 0.12 },
        itemStyle: { color: '#1f5aa8' }
      }
    ]
  })
}

/** 合并同厂商多条记录（SQL 按 vendor+is_domestic 分组），国产标记按多数归属 */
function mergeVendors(vendors) {
  const map = new Map()
  for (const v of vendors || []) {
    const name = v.vendor || '未知厂商'
    const cur = map.get(name) || { vendor: name, n: 0, dom: 0 }
    cur.n += Number(v.n) || 0
    if (Number(v.is_domestic) === 1) cur.dom += Number(v.n) || 0
    map.set(name, cur)
  }
  return [...map.values()]
    .map((v) => ({ vendor: v.vendor, n: v.n, is_domestic: v.dom * 2 >= v.n ? 1 : 0 }))
    .sort((a, b) => b.n - a.n)
}

/** 国产化替代环形图（国产绿 / 国外灰，中心显示国产化率） */
function initDomPie(data) {
  domPieChart = echarts.init(domPieRef.value)
  const rate = Number(data.rate) || 0
  domPieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    title: {
      text: rate.toFixed(2) + '%',
      subtext: '国产化率',
      left: 'center',
      top: '36%',
      textStyle: { fontSize: 26, fontWeight: 'bold', color: '#303133' },
      subtextStyle: { fontSize: 13, color: '#909399' }
    },
    series: [
      {
        name: '软件来源',
        type: 'pie',
        radius: ['46%', '68%'],
        center: ['50%', '46%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}: {c}' },
        data: [
          { name: '国产软件', value: Number(data.domestic) || 0, itemStyle: { color: '#67c23a' } },
          { name: '国外软件', value: Number(data.foreign) || 0, itemStyle: { color: '#909399' } }
        ]
      }
    ]
  })
}

/** 分厂商安装横向柱图（顶部 10，国产绿/国外灰着色） */
function initVendorBar(vendors) {
  vendorChart = echarts.init(vendorRef.value)
  const rows = mergeVendors(vendors).slice(0, 10)
  vendorChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 110, right: 40, top: 16, bottom: 26 },
    xAxis: { type: 'value', name: '安装数' },
    yAxis: { type: 'category', data: rows.map((r) => r.vendor) },
    series: [
      {
        name: '安装数',
        type: 'bar',
        barMaxWidth: 18,
        label: { show: true, position: 'right', color: '#606266' },
        data: rows.map((r) => ({
          value: r.n,
          itemStyle: { color: Number(r.is_domestic) === 1 ? '#67c23a' : '#909399' }
        }))
      }
    ]
  })
}

function onResize() {
  pieChart && pieChart.resize()
  barChart && barChart.resize()
  lineChart && lineChart.resize()
  domPieChart && domPieChart.resize()
  vendorChart && vendorChart.resize()
}

onMounted(async () => {
  const [category, orgInstall, trend, domestic] = await Promise.all([
    get('/stats/category'),
    get('/stats/org-install'),
    get('/stats/trend'),
    get('/stats/domestic')
  ])
  initPie(category)
  initBar(orgInstall)
  initLine(trend)
  initDomPie(domestic)
  initVendorBar(domestic && domestic.vendors)
  window.addEventListener('resize', onResize)
  expLoading.value = true
  try {
    expiring.value = (await get('/stats/expiring')) || []
  } finally {
    expLoading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  pieChart && pieChart.dispose()
  barChart && barChart.dispose()
  lineChart && lineChart.dispose()
  domPieChart && domPieChart.dispose()
  vendorChart && vendorChart.dispose()
})
</script>

<style scoped>
.chart-box {
  height: 320px;
  width: 100%;
}
.mt16 {
  margin-top: 16px;
}
.card-title {
  font-weight: bold;
  color: #1f2d3d;
}
</style>
