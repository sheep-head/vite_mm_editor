import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'

import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/index.css'
import '@/styles/vueComponent.css'
import '@/styles/theme.css'

// 全局工具方法（String.prototype.format / padZero 等）
import '@/utils/utils'
// axios 请求实例
import '@/api/common'

import App from '@/App.vue'
import router from '@/router'
import store, { reloadStoreData } from '@/store'
import globalProperties from '@/plugins/globalProperties'
import YtIcon from '@/components/YtIcon.vue'
import YtConfirmDialog from '@/components/YtConfirmDialog.vue'
import YtMask from '@/components/YtMask.vue'
import { resolveWorkspace } from '@/utils/appSettings'

// 启动时从 nw.App.dataPath/settings.json 恢复工作空间并加载基础数据
if (resolveWorkspace()) {
  reloadStoreData(store)
}

const app = createApp(App)

app.use(store)
app.use(router)
app.use(ElementPlus, { locale: zhCn })
// 挂载 $message / $alert / $loading（element-ui 里是 Vue.prototype.$message 等）
app.use(ElMessage)
app.use(ElMessageBox)
app.use(ElLoading)
// 挂载 $fs / $path / $config / $clipboard / $openLoading ...
app.use(globalProperties)

app.component('yt-icon', YtIcon)
app.component('yt-confirm-dialog', YtConfirmDialog)
app.component('yt-mask', YtMask)

app.mount('#app')
