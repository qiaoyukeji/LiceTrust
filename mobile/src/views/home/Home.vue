<template>
  <div class="home-page">
    <div class="gov-header">
      <p class="header-title">您好，{{ realName }}</p>
      <p class="header-sub">{{ orgDeptText }} · {{ todayText }}</p>
    </div>

    <div class="page-tab">
      <div class="gov-card">
        <p class="card-title">信息录入</p>
        <van-cell-group inset border>
          <van-cell title="登记电脑档案" label="使用人员 + 电脑信息，生成一机一档" icon="records" is-link @click="goRegister" />
          <van-cell title="登记安装软件" label="在电脑档案中添加已安装软件信息" icon="apps-o" is-link
            :to="hasComputer ? '/computers' : '/register'" />
        </van-cell-group>
        <div class="card-note">登记安装软件需先有电脑档案；可先在"电脑查询"中确认。</div>
      </div>

      <div class="gov-card">
        <p class="card-title">信息查找</p>
        <van-cell-group inset border>
          <van-cell title="电脑台账查询" label="按编号 / 品牌 / 使用人查找电脑" icon="search" is-link to="/computers" />
          <van-cell title="一机一档查看" label="电脑档案与已安装软件清单" icon="description-o" is-link to="/computers" />
        </van-cell-group>
      </div>

      <div class="gov-card">
        <p class="card-title">使用说明</p>
        <div class="tip-block">
          <p>1. 登记电脑：先选择使用人员（姓名、单位、部门），再填写电脑信息，提交后自动生成档案。</p>
          <p>2. 登记软件：进入电脑档案，选择软件分类与预置正版软件，填写安装信息提交。</p>
          <p>3. 查找：支持按关键字、类型、状态筛选电脑档案。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 移动端首页：仅保留 信息录入 / 信息查找 两大功能入口
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { get } from '../../api/request'
import { useUser, hasPerm } from '../../composables/user'

const router = useRouter()
const user = useUser()
const hasComputer = ref(false)

const realName = computed(() => (user.user && user.user.real_name) || '用户')
const orgDeptText = computed(() => {
  if (!user.user) return ''
  const org = user.user.org_name || ''
  const dept = user.user.dept_name || ''
  return org && dept ? org + ' / ' + dept : org || dept || '欢迎使用'
})
const todayText = computed(() => {
  const d = new Date()
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
})

function goRegister() {
  if (!hasPerm('computer:edit')) {
    showTip()
    return
  }
  router.push('/register')
}

function showTip() {
  import('vant').then(({ showFailToast }) => showFailToast('当前账号无登记权限，请联系管理员'))
}

onMounted(async () => {
  // 有电脑档案的用户可直接从"我的电脑"进入登记软件
  try {
    const d = await get('/computers', { page: 1, pageSize: 1 })
    hasComputer.value = !!(d && d.list && d.list.length)
  } catch (ignore) {
    hasComputer.value = false
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}
.card-note {
  padding: 6px 16px 10px;
  color: #8492a6;
  font-size: 12px;
}
.tip-block {
  padding: 8px 16px 12px;
  color: #5a6b87;
  font-size: 12px;
  line-height: 1.9;
}
.tip-block p {
  margin: 0;
}
</style>
