<template>
  <div class="page">
    <van-nav-bar title="电脑台账查询" fixed placeholder />
    <van-search
      v-model="kw"
      placeholder="输入编号/品牌/SN 搜索"
      show-action
      @search="onReload"
      @clear="onReload"
    >
      <template #action>
        <div @click="onReload">搜索</div>
      </template>
    </van-search>
    <div class="scan-entry">
      <van-button size="small" plain type="primary" icon="scan" @click="qrRef && qrRef.open()">扫资产二维码查档案</van-button>
    </div>
    <QrScanner ref="qrRef" @detected="onScanDetected" />

    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <div v-for="c in list" :key="c.id" class="gov-item" @click="goDetail(c)">
        <p class="item-title">
          <span>{{ c.computer_no }}（{{ mapText(COMPUTER_TYPE_MAP, c.computer_type) }}）</span>
          <van-tag :type="computerStatusType(c.status)">
            {{ mapText(COMPUTER_STATUS_MAP, c.status) }}
          </van-tag>
        </p>
        <p class="item-meta">品牌型号：{{ brandText(c) }}</p>
        <p class="item-meta">使用人：{{ c.user_name || '未分配' }} · {{ c.dept_name || '-' }}</p>
        <p class="item-meta">已装软件：{{ c.install_count }} 款 · SN：{{ c.sn || '-' }}</p>
      </div>
    </van-list>

    <van-empty v-if="finished && !list.length" description="暂无电脑数据" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { get } from '../../api/request'
import {
  COMPUTER_TYPE_MAP,
  COMPUTER_STATUS_MAP,
  mapText,
  computerStatusType
} from '../../constants'
import QrScanner from '../../components/QrScanner.vue'

const router = useRouter()
const qrRef = ref(null)

/** 扫资产二维码直达档案：识别内容支持档案 URL 或直接计算机编号 */
function onScanDetected(code) {
  const m = String(code).match(/\/computers\/(\d+)/)
  if (m) {
    router.push('/computers/' + m[1])
    return
  }
  kw.value = String(code).trim()
  showToast('识别到编号：' + kw.value)
  onReload()
}

const kw = ref('')
const list = ref([])
const total = ref(0)
const page = ref(0)
const pageSize = 10
const loading = ref(false)
const finished = ref(false)

function brandText(c) {
  const brand = c.brand || '-'
  const model = c.model || ''
  return model ? brand + ' ' + model : brand
}

async function onLoad() {
  const next = page.value + 1
  const data = await get('/computers', { page: next, pageSize, kw: kw.value || undefined })
  const rows = (data && data.list) || []
  list.value = list.value.concat(rows)
  total.value = (data && data.total) || 0
  page.value = next
  loading.value = false
  if (!rows.length || list.value.length >= total.value) {
    finished.value = true
  }
}

function onReload() {
  list.value = []
  page.value = 0
  total.value = 0
  finished.value = false
  loading.value = true
  onLoad()
}

function goDetail(c) {
  router.push('/computers/' + c.id)
}
</script>
