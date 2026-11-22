import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import * as Icons from '@element-plus/icons-vue'
import { useUserStore } from './stores/user'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 全量注册图标组件，模板内可直接使用 <el-icon><Search /></el-icon>
for (const name in Icons) {
  app.component(name, Icons[name])
}

// v-perm 自定义指令：无权限时移除元素（用于按钮级控制）
app.directive('perm', {
  mounted(el, binding) {
    const store = useUserStore()
    if (!store.can(binding.value)) {
      el.parentNode && el.parentNode.removeChild(el)
    }
  }
})

app.mount('#app')
