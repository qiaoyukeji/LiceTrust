<template>
  <div class="page mine-page">
    <div class="gov-header mine-header">
      <div class="user-row">
        <div class="avatar">
          <van-icon name="manager" size="30" />
        </div>
        <div class="user-info">
          <p class="user-name">{{ realName }}</p>
          <p class="user-sub">{{ accountText }}</p>
        </div>
      </div>
    </div>

    <div class="gov-card role-card">
      <p class="card-title"><span>身份信息</span></p>
      <p class="item-meta">单位：{{ orgName || '-' }}</p>
      <p class="item-meta">部门：{{ deptName || '-' }}</p>
      <p class="item-meta">角色：{{ rolesText }}</p>
      <p class="item-meta">版本：v1.1.0</p>
    </div>

    <div class="gov-card">
      <p class="card-title"><span>使用说明</span></p>
      <p class="item-meta">移动端仅提供信息录入（登记电脑档案、登记安装软件）与信息查找（电脑台账、一机一档）功能。</p>
    </div>

    <div class="logout-wrap">
      <van-button block round type="danger" plain @click="onLogout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup>
// 我的页：仅账号信息与退出（功能已精简为信息录入 + 信息查找）
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { useUser, clearAuth } from '../../composables/user'

const router = useRouter()
const user = useUser()

const realName = computed(() => (user.user && user.user.real_name) || '未知用户')
const orgName = computed(() => (user.user && user.user.org_name) || '')
const deptName = computed(() => (user.user && user.user.dept_name) || '')
const accountText = computed(() => (user.user && user.user.username) || '')
const rolesText = computed(() => {
  if (!user.user || !Array.isArray(user.user.roles) || !user.user.roles.length) return '-'
  return user.user.roles.map((r) => r.name || r.code).join('、')
})

// ------- 退出登录 -------
async function onLogout() {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定退出当前账号吗？'
    })
  } catch (e) {
    return
  }
  clearAuth()
  router.replace('/login')
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
}
.mine-header {
  border-radius: 0 0 16px 16px;
  padding-bottom: 28px;
}
.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.user-info {
  flex: 1;
}
.user-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}
.user-sub {
  font-size: 12px;
  opacity: 0.85;
  margin: 0;
}
.role-card {
  margin-top: -14px;
}
.logout-wrap {
  margin: 20px 16px 0;
}
</style>
