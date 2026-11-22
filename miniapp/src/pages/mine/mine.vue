<!--
  我的页（预留 stub，二期实现）
  对应 mobile 页面：mobile/src/views/mine/Mine.vue
  涉及接口：
    - GET /api/auth/me              用户信息（roles/perms/dataScope/单位部门）
    - PUT /api/auth/password        修改密码 {oldPassword,newPassword}
  实现要点：退出登录清除 licetrust_token；另可挂预警消息入口（GET /api/alerts，对应 mobile Alerts.vue）
-->
<template>
  <view class="stub-card">
    <view class="stub-title">我的页占位</view>
    <view class="stub-desc">
      用户卡（GET /auth/me）+ 修改密码（PUT /auth/password）+ 退出登录，对应 mobile Mine.vue。
    </view>
  </view>
</template>

<script setup>
</script>
