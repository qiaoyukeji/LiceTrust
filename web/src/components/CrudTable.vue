<template>
  <el-card shadow="never" class="page-card crud-table">
    <el-form inline class="query-form" @submit.prevent>
      <slot name="query"></slot>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>
    <div v-if="$slots.toolbar" class="table-toolbar">
      <slot name="toolbar"></slot>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <slot></slot>
    </el-table>
    <div class="pager">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="size"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>
  </el-card>
</template>

<script setup>
// 列表页通用组件：查询栏 + 工具栏 + 表格 + 分页
// 用法：fetcher 传 async ({ page, pageSize }) => { list, total }；查询按钮自动重载；
//      重置按钮 emit('reset')（页面里清空筛选条件）后自动重查。
import { onMounted, ref } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  /** 数据加载函数 (page, pageSize) => Promise<{list,total}> */
  fetcher: { type: Function, required: true }
})
const emit = defineEmits(['reset'])

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(10)

/** 拉取当前页数据 */
async function load() {
  loading.value = true
  try {
    const data = await props.fetcher({ page: page.value, pageSize: size.value })
    list.value = (data && data.list) || []
    total.value = Number((data && data.total) || 0)
  } finally {
    loading.value = false
  }
}

/** 回到第 1 页并加载（查询按钮） */
function reload() {
  page.value = 1
  load()
}

function onPageChange(p) {
  page.value = p
  load()
}

function onSizeChange(s) {
  size.value = s
  page.value = 1
  load()
}

function onReset() {
  emit('reset')
  page.value = 1
  load()
}

onMounted(load)

defineExpose({ reload, load })
</script>
