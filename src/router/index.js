import { createRouter, createWebHashHistory } from 'vue-router'

import EditorMain from '@/views/editor/EditorMain.vue'
import Login from '@/views/auth/Login.vue'
import WorkspaceSelect from '@/views/workspace/WorkspaceSelect.vue'
import { hasValidWorkspace } from '@/utils/appSettings'
import { isNw } from '@/utils/nw'

const routes = [
  { path: '/workspace', component: WorkspaceSelect },
  { path: '/editor', component: EditorMain },
  { path: '/', redirect: '/editor' },
  { path: '/login', component: Login },
  // 旧 /base/*、/extra/* 已迁入数据库弹窗「扩展」标签
  { path: '/base/:rest(.*)*', redirect: '/editor' },
  { path: '/extra/:rest(.*)*', redirect: '/editor' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  if (!isNw) {
    next()
    return
  }

  const ok = hasValidWorkspace()
  const isWorkspace = to.path === '/workspace'
  const forceChange = to.path === '/workspace' && to.query.change === '1'

  if (!ok && !isWorkspace) {
    next({ path: '/workspace' })
    return
  }

  if (ok && isWorkspace && !forceChange) {
    next({ path: '/editor' })
    return
  }

  next()
})

export default router
