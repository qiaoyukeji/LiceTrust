<template>
  <router-view />
</template>

<script setup>
// 应用根组件：仅承载路由出口，全局样式在 main 流程内引入
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Microsoft YaHei', 'PingFang SC', Helvetica, Arial, sans-serif;
  background-color: #f0f2f5;
  color: #303133;
}
.page-card {
  border-radius: 4px;
}
.query-form .el-form-item {
  margin-bottom: 12px;
  margin-right: 16px;
}
.table-toolbar {
  margin-bottom: 12px;
}
.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
.cell-tag {
  margin-right: 4px;
}
</style>
