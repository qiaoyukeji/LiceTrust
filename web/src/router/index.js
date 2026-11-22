// 路由表：全部页面 + 登录守卫 + meta.perms 权限过滤
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

/** 登录后的页面统一挂在 AdminLayout 下 */
const layoutChildren = [
  { path: '', name: 'Workbench', component: () => import('../views/dashboard/Workbench.vue'), meta: { title: '工作台', perms: ['dashboard'], tenantOnly: true } },
  // 基础管理
  { path: 'orgs', name: 'OrgManage', component: () => import('../views/system/OrgManage.vue'), meta: { title: '组织单位', perms: ['org:view'], tenantOnly: true } },
  { path: 'depts', name: 'DeptManage', component: () => import('../views/system/DeptManage.vue'), meta: { title: '部门管理', perms: ['dept:view'], tenantOnly: true } },
  { path: 'users', name: 'UserManage', component: () => import('../views/system/UserManage.vue'), meta: { title: '用户管理', perms: ['user:view'], tenantOnly: true } },
  { path: 'roles', name: 'RoleManage', component: () => import('../views/system/RoleManage.vue'), meta: { title: '角色管理', perms: ['role:view'] } },
  { path: 'dicts', name: 'DictManage', component: () => import('../views/system/DictManage.vue'), meta: { title: '数据字典', perms: ['dict:view'] } },
  { path: 'configs', name: 'ConfigManage', component: () => import('../views/system/ConfigManage.vue'), meta: { title: '系统参数', perms: ['config:view'] } },
  { path: 'tenant-profile', name: 'TenantProfile', component: () => import('../views/system/TenantProfile.vue'), meta: { title: '企业信息', perms: ['config:edit'], tenantOnly: true } },
  { path: 'backup', name: 'BackupCenter', component: () => import('../views/system/BackupCenter.vue'), meta: { title: '数据备份', perms: ['config:edit'], tenantOnly: true } },
  { path: 'msg-config', name: 'TenantMsgConfig', component: () => import('../views/system/TenantMsgConfig.vue'), meta: { title: '消息配置', perms: ['config:edit'], tenantOnly: true } },
  { path: 'audit-logs', name: 'AuditLog', component: () => import('../views/system/AuditLog.vue'), meta: { title: '审计日志', perms: ['audit:view'] } },
  // 平台管理（tenant_id=0 平台运营账号专属，路由守卫按 user.tenant_id 重定向）
  { path: 'platform/overview', name: 'PlatformOverview', component: () => import('../views/platform/Overview.vue'), meta: { title: '平台总览', platformOnly: true } },
  { path: 'platform/tenants', name: 'TenantList', component: () => import('../views/platform/TenantList.vue'), meta: { title: '企业管理', platformOnly: true } },
  { path: 'platform/msg-config', name: 'PlatformMsgConfig', component: () => import('../views/platform/PlatformMsgConfig.vue'), meta: { title: '平台消息配置', platformOnly: true } },
  { path: 'platform/softwares', name: 'PlatformSoftwares', component: () => import('../views/asset/SoftwareList.vue'), meta: { title: '通用软件库', perms: ['software:view'], platformOnly: true } },
  // 台账管理
  { path: 'computers', name: 'ComputerList', component: () => import('../views/asset/ComputerList.vue'), meta: { title: '计算机台账', perms: ['computer:view'], tenantOnly: true } },
  { path: 'computers/:id', name: 'ComputerDetail', component: () => import('../views/asset/ComputerDetail.vue'), meta: { title: '一机一档', perms: ['computer:view'], tenantOnly: true } },
  { path: 'softwares', name: 'SoftwareList', component: () => import('../views/asset/SoftwareList.vue'), meta: { title: '软件资产库', perms: ['software:view'], tenantOnly: true } },
  { path: 'install-records', name: 'InstallRecordList', component: () => import('../views/asset/InstallRecordList.vue'), meta: { title: '安装明细', perms: ['install:view'], tenantOnly: true } },
  { path: 'free-softwares', name: 'FreeSoftwareList', component: () => import('../views/asset/FreeSoftwareList.vue'), meta: { title: '免费软件清单', perms: ['free:view'], tenantOnly: true } },
  { path: 'leaders', name: 'LeaderList', component: () => import('../views/system/LeaderList.vue'), meta: { title: '领导小组', perms: ['leader:view'], tenantOnly: true } },
  // 采购与授权
  { path: 'contracts', name: 'ContractManage', component: () => import('../views/purchase/ContractManage.vue'), meta: { title: '合同管理', perms: ['contract:view'], tenantOnly: true } },
  { path: 'entitlements', name: 'EntitlementManage', component: () => import('../views/purchase/EntitlementManage.vue'), meta: { title: '授权管理', perms: ['entitlement:view'], tenantOnly: true } },
  { path: 'admin-accounts', name: 'AdminAccountManage', component: () => import('../views/purchase/AdminAccountManage.vue'), meta: { title: '管理员账号', perms: ['adminaccount:view'], tenantOnly: true } },
  { path: 'license-allocs', name: 'LicenseAllocManage', component: () => import('../views/purchase/LicenseAllocManage.vue'), meta: { title: '许可分配', perms: ['alloc:view'], tenantOnly: true } },
  { path: 'require-applies', name: 'RequireApplyList', component: () => import('../views/purchase/RequireApplyList.vue'), meta: { title: '需求申请', perms: ['require:view'], tenantOnly: true } },
  { path: 'plans', name: 'PlanManage', component: () => import('../views/purchase/PlanManage.vue'), meta: { title: '采购计划', perms: ['plan:view'], tenantOnly: true } },
  // 流程与监管
  { path: 'maint-applies', name: 'MaintApply', component: () => import('../views/flow/MaintApply.vue'), meta: { title: '安装维护流程', perms: ['apply:view'], tenantOnly: true } },
  { path: 'reports', name: 'ReportCenter', component: () => import('../views/report/ReportCenter.vue'), meta: { title: '报表中心', perms: ['report:view'], tenantOnly: true } },
  { path: 'alerts', name: 'AlertCenter', component: () => import('../views/alert/AlertCenter.vue'), meta: { title: '预警中心', perms: ['alert:view'], tenantOnly: true } },
  { path: 'inspections', name: 'InspectionManage', component: () => import('../views/inspect/InspectionManage.vue'), meta: { title: '督查管理', perms: ['ins:view'], tenantOnly: true } },
  { path: 'stats', name: 'StatsDashboard', component: () => import('../views/stats/StatsDashboard.vue'), meta: { title: '统计驾驶舱', perms: ['stats:view'] } },
  // 个人
  { path: 'profile', name: 'Profile', component: () => import('../views/profile/Profile.vue'), meta: { title: '个人中心' } }
]

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/login/Login.vue'), meta: { title: '登录' } },
  // 企业注册：独立路由（不进 AdminLayout），注册成功自动登录
  { path: '/register', name: 'RegisterCompany', component: () => import('../views/login/RegisterCompany.vue'), meta: { title: '注册企业账号' } },
  // 驾驶舱大屏：独立全屏布局（不挂 AdminLayout）
  { path: '/screen', name: 'ScreenBoard', component: () => import('../views/screen/ScreenBoard.vue'), meta: { title: '驾驶舱大屏', perms: ['stats:view'] } },
  {
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    children: layoutChildren
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 登录守卫 + 权限点校验（/login、/register 无需登录）
router.beforeEach((to) => {
  const store = useUserStore()
  if (to.path === '/login' || to.path === '/register') {
    if (store.isLogin) return '/'
    return true
  }
  if (!store.isLogin) return { path: '/login', query: { redirect: to.fullPath } }
  const need = (to.meta && to.meta.perms) || []
  if (need.length && !store.canAny(need)) return '/'
  // 平台管理页面仅 tenant_id=0 的平台运营账号可见，其余用户重定向到工作台
  const isPlatform = !!(store.user && Number(store.user.tenant_id) === 0)
  if (to.meta && to.meta.platformOnly && !isPlatform) return '/'
  // 企业租户业务页面不对平台运营账号开放（重定向到平台总览）
  if (to.meta && to.meta.tenantOnly && isPlatform) return { path: '/platform/overview' }
  return true
})

router.afterEach((to) => {
  const title = (to.meta && to.meta.title) || ''
  document.title = title ? title + ' - 正版软件管理平台' : '正版软件管理平台'
})

export default router
