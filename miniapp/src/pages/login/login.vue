<!--
  登录页（预留 stub，二期实现）
  对应 mobile 页面：mobile/src/views/login/Login.vue
  涉及接口：
    - POST /api/auth/login {username,password} → {token,user}（账号密码方式）
    - 二期微信单点登录：uni.login 取 code → 后端换取 token（后端新增 /api/auth/wx-login）
    - 登录后调 GET /api/auth/me 刷新用户信息（含 perms/dataScope）
  实现要点：token 存 licetrust_token；登录守卫逻辑对应 mobile/src/router/index.js
-->
<template>
  <view class="stub-card">
    <view class="stub-title">登录页占位</view>
    <view class="stub-desc">
      一期未实现。二期接入微信登录（wx.login 单点登录），接口与移动端 Login.vue 保持一致（POST /api/auth/login、GET /api/auth/me）。
    </view>
  </view>
</template>

<script setup>
</script>
