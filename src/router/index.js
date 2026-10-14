import { createRouter, createWebHashHistory } from 'vue-router'

import EditorMain from '@/views/editor/EditorMain.vue'
import Items from '@/views/base/Items.vue'
import Weapons from '@/views/base/Weapons.vue'
import Armors from '@/views/base/Armors.vue'
import Fax from '@/views/extra/fax/Fax.vue'
import TownFax from '@/views/extra/fax/TownFax.vue'
import Cave from '@/views/extra/fax/Cave.vue'
import Map from '@/views/extra/fax/Map.vue'
import Config from '@/views/extra/fax/Config.vue'
import TankData from '@/views/extra/tank/TankData.vue'
import TankShell from '@/views/extra/tank/TankShell.vue'
import SpiritCompanion from '@/views/extra/spirit/SpiritCompanion.vue'
import Login from '@/views/auth/Login.vue'
import WorkspaceSelect from '@/views/workspace/WorkspaceSelect.vue'
import { hasValidWorkspace } from '@/utils/appSettings'
import { isNw } from '@/utils/nw'

const routes = [
  { path: '/workspace', component: WorkspaceSelect },
  { path: '/editor', component: EditorMain },
  { path: '/', redirect: '/editor' },
  // 旧入口保留，便于书签；内容已迁入数据库弹窗
  { path: '/base/Items', component: Items },
  { path: '/base/Weapons', component: Weapons },
  { path: '/base/Armors', component: Armors },
  { path: '/extra/fax/Fax', component: Fax },
  { path: '/extra/fax/TownFax', component: TownFax },
  { path: '/extra/fax/Cave', component: Cave },
  { path: '/extra/fax/Map', component: Map },
  { path: '/extra/fax/Config', component: Config },
  { path: '/extra/tank/TankData', component: TankData },
  { path: '/extra/tank/TankShell', component: TankShell },
  { path: '/extra/spirit/SpiritCompanion', redirect: '/extra/spirit/Spirits' },
  { path: '/extra/spirit/Global', component: SpiritCompanion, meta: { spiritTab: 'global' } },
  { path: '/extra/spirit/Traits', component: SpiritCompanion, meta: { spiritTab: 'traits' } },
  { path: '/extra/spirit/Trails', component: SpiritCompanion, meta: { spiritTab: 'trails' } },
  { path: '/extra/spirit/Spirits', component: SpiritCompanion, meta: { spiritTab: 'spirits' } },
  { path: '/login', component: Login },
]

/** 扩展路由清单（入口将并入数据库；勿再挂左侧 el-menu） */
export const routeMenu = [
  {
    id: 'extra',
    name: '扩展功能',
    icon: 'el-icon-tickets',
    children: [
      { path: '/extra/fax/Fax', name: '传真' },
      { path: '/extra/fax/TownFax', name: '城镇时空机' },
      { path: '/extra/fax/Cave', name: '洞穴设定' },
      { path: '/extra/fax/Map', name: '地图设定' },
      { path: '/extra/fax/Config', name: '小地图设定' },
      { path: '/extra/tank/TankData', name: '战车数据' },
      { path: '/extra/tank/TankShell', name: '战车炮弹' },
      { path: '/extra/spirit/Spirits', name: '精灵伴游' },
    ],
  },
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
