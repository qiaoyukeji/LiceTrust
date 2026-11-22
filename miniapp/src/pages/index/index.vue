<!--
  工作台页（预留 stub，二期实现）
  对应 mobile 页面：mobile/src/views/home/Home.vue
  涉及接口：
    - GET /api/workbench/summary  平台概览指标（overview/todos/flowStatus）
    - GET /api/workbench/todos    我的待办（按 perms 组合四类，各前 10 条）
    - GET /api/workbench/alerts   未处理预警前 10 条
    - GET /api/workbench/notices  最新 5 条已发布公告
  实现要点：指标卡对应 mobile 的 van-grid；按 perms 显隐待办分区
-->
<template>
  <view class="stub-card">
    <view class="stub-title">工作台占位</view>
    <view class="stub-desc">
      指标卡 + 待办 + 未处理预警 + 公告，接口：GET /workbench/summary、/workbench/todos、/workbench/alerts、/workbench/notices（对应 mobile Home.vue）。
    </view>
  </view>
</template>

<script setup>
</script>
