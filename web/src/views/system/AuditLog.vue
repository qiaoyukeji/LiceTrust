<template>
  <CrudTable ref="tableRef" :fetcher="fetchData" @reset="resetQuery">
    <template #query>
      <el-form-item label="关键字">
        <el-input v-model="query.kw" placeholder="用户/路径/操作" clearable style="width: 200px" @keyup.enter="reloadTable" />
      </el-form-item>
      <el-form-item label="功能模块">
        <el-input v-model="query.module" placeholder="如 auth / computers" clearable style="width: 160px" />
      </el-form-item>
      <el-form-item label="日期范围">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 240px"
        />
      </el-form-item>
    </template>
    <el-table-column prop="op_time" label="操作时间" width="170">
      <template #default="{ row }">{{ str(row.op_time) }}</template>
    </el-table-column>
    <el-table-column prop="username" label="操作账号" width="120" />
    <el-table-column prop="module" label="功能模块" width="140" />
    <el-table-column prop="operation" label="操作" min-width="140" show-overflow-tooltip />
    <el-table-column prop="method" label="请求方式" width="90">
      <template #default="{ row }">
        <el-tag size="small" type="info">{{ row.method }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="path" label="请求路径" min-width="200" show-overflow-tooltip />
    <el-table-column prop="detail" label="详情" min-width="180" show-overflow-tooltip />
    <el-table-column prop="ip" label="IP 地址" width="130" />
  </CrudTable>
</template>

<script setup>
// 审计日志：只读列表（audit:view）
import { reactive, ref, watch } from 'vue'
import CrudTable from '../../components/CrudTable.vue'
import { get } from '../../api/request'

const tableRef = ref()
const query = reactive({ kw: '', module: '' })
const dateRange = ref(null)

/** 只读列表数据加载 */
function fetchData({ page, pageSize }) {
  const from = dateRange.value && dateRange.value[0] ? dateRange.value[0] : undefined
  const to = dateRange.value && dateRange.value[1] ? dateRange.value[1] : undefined
  return get('/audit-logs', {
    kw: query.kw || undefined,
    module: query.module || undefined,
    dateFrom: from,
    dateTo: to,
    page,
    pageSize
  })
}

function reloadTable() {
  tableRef.value && tableRef.value.reload()
}

function resetQuery() {
  Object.assign(query, { kw: '', module: '' })
  dateRange.value = null
}

function str(v) {
  return String(v || '').slice(0, 19)
}

watch(dateRange, () => reloadTable())
</script>
