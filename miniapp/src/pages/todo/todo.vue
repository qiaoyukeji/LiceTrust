<!--
  待办页（预留 stub，二期实现）
  对应 mobile 页面：mobile/src/views/todo/TodoList.vue
  涉及接口（按 perms 显隐四个分区，同 mobile Tabbar 第 4 项）：
    - GET /api/maint-applies/pending/role1    待部门审核（apply:approve1）→ PUT /api/maint-applies/:id/approve {action,opinion}
    - GET /api/maint-applies/pending/role2    待信息化审核（apply:approve2）→ 同上
    - GET /api/maint-applies/pending/execute  待执行（apply:execute）→ PUT /api/maint-applies/:id/execute
    - GET /api/maint-applies/pending/confirm  待我确认（apply:confirm）→ PUT /api/maint-applies/:id/confirm {userSign}
  实现要点：确认签名=输入姓名文本；操作成功后刷新当前分区
-->
<template>
  <view class="stub-card">
    <view class="stub-title">待办页占位</view>
    <view class="stub-desc">
      待部门审核/待信息化审核/待执行/待我确认四段列表（GET /maint-applies/pending/*）+ 审批、执行、签名确认操作，对应 mobile TodoList.vue。
    </view>
  </view>
</template>

<script setup>
</script>
