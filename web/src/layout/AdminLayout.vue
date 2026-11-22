<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="22"><Monitor /></el-icon>
        <span class="logo-text">正版软件管理平台</span>
        <span class="logo-ver">v1.1.0</span>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#1f2d3d"
        text-color="#bfcbd9"
        active-text-color="#ffffff"
        class="menu"
      >
        <template v-for="item in menus" :key="item.path">
          <el-sub-menu v-if="item.children && item.children.length" :index="item.path">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="sub in item.children" :key="sub.path" :index="sub.path">
              {{ sub.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header" height="56px">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-if="$route.meta.title && $route.path !== '/'">{{ $route.meta.title }}</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="header-right">
          <el-dropdown @command="onCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              {{ store.user ? store.user.real_name : '未登录' }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <PageGuide />
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../stores/user'
import PageGuide from '../components/PageGuide.vue'

const router = useRouter()
const store = useUserStore()

// 全量菜单定义（含所需权限点），渲染时按 store.user.perms 过滤
const ALL_MENUS = [
  { path: '/', title: '工作台', icon: 'Odometer', perms: ['dashboard'], tenantOnly: true },
  {
    path: '/base',
    title: '基础管理',
    icon: 'Setting',
    perms: ['org:view', 'dept:view', 'user:view', 'role:view', 'dict:view', 'config:view', 'config:edit', 'audit:view'],
    children: [
      { path: '/orgs', title: '组织单位', perms: ['org:view'], tenantOnly: true },
      { path: '/depts', title: '部门管理', perms: ['dept:view'], tenantOnly: true },
      { path: '/users', title: '用户管理', perms: ['user:view'], tenantOnly: true },
      { path: '/roles', title: '角色管理', perms: ['role:view'] },
      { path: '/dicts', title: '数据字典', perms: ['dict:view'] },
      { path: '/configs', title: '系统参数', perms: ['config:view'], tenantOnly: true },
      { path: '/tenant-profile', title: '企业信息', perms: ['config:edit'], tenantOnly: true },
      { path: '/backup', title: '数据备份', perms: ['config:edit'], tenantOnly: true },
      { path: '/msg-config', title: '消息配置', perms: ['config:edit'], tenantOnly: true },
      { path: '/audit-logs', title: '审计日志', perms: ['audit:view'] }
    ]
  },
  {
    path: '/ledger',
    title: '台账管理',
    icon: 'Files',
    perms: ['computer:view', 'software:view', 'install:view', 'free:view', 'leader:view'],
    tenantOnly: true,
    children: [
      { path: '/computers', title: '计算机台账', perms: ['computer:view'] },
      { path: '/softwares', title: '软件资产库', perms: ['software:view'] },
      { path: '/install-records', title: '安装明细', perms: ['install:view'] },
      { path: '/free-softwares', title: '免费软件清单', perms: ['free:view'] },
      { path: '/leaders', title: '领导小组', perms: ['leader:view'] }
    ]
  },
  {
    path: '/purchase',
    title: '采购与授权',
    icon: 'ShoppingCart',
    perms: ['contract:view', 'entitlement:view', 'adminaccount:view', 'alloc:view', 'require:view', 'plan:view'],
    tenantOnly: true,
    children: [
      { path: '/contracts', title: '合同管理', perms: ['contract:view'] },
      { path: '/entitlements', title: '授权管理', perms: ['entitlement:view'] },
      { path: '/admin-accounts', title: '管理员账号', perms: ['adminaccount:view'] },
      { path: '/license-allocs', title: '许可分配', perms: ['alloc:view'] },
      { path: '/require-applies', title: '需求申请', perms: ['require:view'] },
      { path: '/plans', title: '采购计划', perms: ['plan:view'] }
    ]
  },
  { path: '/maint-applies', title: '安装维护流程', icon: 'SetUp', perms: ['apply:view'], tenantOnly: true },
  {
    path: '/supervise',
    title: '监管分析',
    icon: 'DataAnalysis',
    perms: ['report:view', 'alert:view', 'ins:view', 'stats:view'],
    tenantOnly: true,
    children: [
      { path: '/reports', title: '报表中心', perms: ['report:view'] },
      { path: '/alerts', title: '预警中心', perms: ['alert:view'] },
      { path: '/inspections', title: '督查管理', perms: ['ins:view'] },
      { path: '/stats', title: '统计驾驶舱', perms: ['stats:view'] }
    ]
  },
  {
    // 平台管理分组：仅 tenant_id=0 平台运营账号可见（按 tenant 判断，不走 perms）
    path: '/platform',
    title: '平台管理',
    icon: 'OfficeBuilding',
    platformOnly: true,
    perms: [],
    children: [
      { path: '/platform/overview', title: '平台总览', perms: [] },
      { path: '/platform/tenants', title: '企业管理', perms: [] },
      { path: '/platform/msg-config', title: '平台消息配置', perms: [] }
    ]
  }
]

/** 按 perms 过滤后的菜单（含 * 全通过；分组持有任一权限点即显示；platformOnly 分组仅 tenant_id=0 显示） */
const menus = computed(() => {
  const can = store.can
  const isPlatform = !!(store.user && Number(store.user.tenant_id) === 0)
  const out = []
  for (const m of ALL_MENUS) {
    if (m.platformOnly && !isPlatform) continue
    // 企业租户业务页面不对平台运营账号显示（平台专注通用数据/设置与租户管理）
    if (m.tenantOnly && isPlatform) continue
    if (m.perms && m.perms.length && !m.perms.some((p) => can(p))) continue
    if (m.children) {
      const subs = m.children.filter((c) => {
        if (c.tenantOnly && isPlatform) return false
        return can(c.perms[0])
      })
      if (subs.length) out.push({ path: m.path, title: m.title, icon: m.icon, children: subs })
    } else {
      out.push({ path: m.path, title: m.title, icon: m.icon })
    }
  }
  return out
})

function onCommand(cmd) {
  if (cmd === 'profile') {
    router.push('/profile')
  } else if (cmd === 'logout') {
    ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' })
      .then(() => {
        store.logout()
        router.push('/login')
      })
      .catch(() => {})
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100%;
}
.aside {
  background-color: #1f2d3d;
  overflow-x: hidden;
}
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.logo-text {
  margin-left: 8px;
  letter-spacing: 1px;
}
.logo-ver {
  margin-left: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  vertical-align: middle;
}
.menu {
  border-right: none;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.header-right {
  display: flex;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #303133;
  font-size: 14px;
  gap: 4px;
}
.main {
  background: #f0f2f5;
  padding: 16px;
  overflow: auto;
}
</style>
