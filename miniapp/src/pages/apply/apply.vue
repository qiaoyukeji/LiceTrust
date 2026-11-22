<!--
  申请页（预留 stub，二期实现）
  对应 mobile 页面：mobile/src/views/apply/MyApplies.vue
  涉及接口：
    - GET  /api/maint-applies/my           我的申请分页列表
    - GET  /api/computers/options          选电脑下拉
    - POST /api/maint-applies              新建申请 {computer_id,apply_type,software_name,reason}（直接提交至部门审核）
  实现要点：申请类型枚举 1安装 2卸载 3升级（见 conventions §4）；表单校验同 mobile 版
-->
<template>
  <view class="stub-card">
    <view class="stub-title">申请页占位</view>
    <view class="stub-desc">
      我的申请列表（GET /maint-applies/my）+ 新申请表单（选电脑 GET /computers/options、类型、软件名、原因 → POST /maint-applies），对应 mobile MyApplies.vue。
    </view>
  </view>
</template>

<script setup>
</script>
