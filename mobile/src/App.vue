<template>
  <div class="app-shell" :class="{ 'with-tabbar': showTabbar }">
    <router-view />
  </div>
  <van-tabbar v-if="showTabbar" route safe-area-inset-bottom class="app-tabbar">
    <van-tabbar-item to="/home" icon="wap-home-o">首页</van-tabbar-item>
    <van-tabbar-item to="/computers" icon="search">信息查找</van-tabbar-item>
    <van-tabbar-item to="/register" icon="edit">信息录入</van-tabbar-item>
    <van-tabbar-item to="/mine" icon="contact-o">我的</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showTabbar = computed(() => route.meta && route.meta.tab === true)
</script>

<style>
.app-shell.with-tabbar {
  padding-bottom: 60px;
}
.app-tabbar {
  --van-tabbar-item-active-color: #1a66d0;
}
</style>
