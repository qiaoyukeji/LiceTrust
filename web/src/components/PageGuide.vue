<template>
  <!-- 板块使用说明：从 PAGE_GUIDES 按当前路由取文案，无文案时不渲染 -->
  <el-alert
    v-if="text"
    :key="route.path"
    type="info"
    show-icon
    closable
    title="使用说明"
    :description="text"
    class="page-guide"
  />
</template>

<script setup>
// 每板块使用说明横幅：读取当前路由 path，从 constants/pageGuides.js 取文案
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PAGE_GUIDES } from '../constants/pageGuides'

const route = useRoute()
const text = computed(() => PAGE_GUIDES[route.path] || '')
</script>

<style scoped>
.page-guide {
  margin-bottom: 12px;
}
</style>
