<!--
  我的电脑页（预留 stub，二期实现）
  对应 mobile 页面：mobile/src/views/computer/MyComputers.vue 与 ComputerDetail.vue
  涉及接口：
    - GET /api/computers?page&pageSize&kw   分页台账列表（数据权限自动过滤，员工只看本人）
    - GET /api/computers/:id                一机一档详情 {computer,installed,logs}
    - GET /api/computers/options            编号下拉（供申请页选电脑）
  实现要点：列表分页用 onReachBottom 加载下一页；详情页已装软件 + 维护记录时间轴；
  二期接入扫码核查：uni.scanCode 扫编号二维码 → GET /api/computers?kw=编号 定位台账
-->
<template>
  <view class="stub-card">
    <view class="stub-title">我的电脑占位</view>
    <view class="stub-desc">
      台账列表（GET /computers 分页）+ 一机一档（GET /computers/:id：已装软件/维护记录），对应 mobile MyComputers.vue 与 ComputerDetail.vue；二期支持 uni.scanCode 扫码核查。
    </view>
  </view>
</template>

<script setup>
</script>
