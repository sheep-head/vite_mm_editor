import { createRouter, createWebHashHistory } from 'vue-router'

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
  { path: '/', redirect: '/base/Items' },
]

export const routeMenu = [
  {
    id: '1',
    name: '基础功能',
    icon: 'el-icon-s-data',
    children: [
      { id: "1", path: '/base/Items', name: '物品(只读)' },
      { id: "2", path: '/base/Weapons', name: '武器(只读)' },
      { id: "3", path: '/base/Armors', name: '防具(只读)' },
    ]
  },
  {
    id: '2',
    name: '扩展功能',
    icon: 'el-icon-s-data',
    children: [
      {
        groupName: '传送',
        list: [
          { id: "1", path: '/extra/fax/Fax', name: '传真', icon: 'el-icon-map-location' },
          { id: "2", path: '/extra/fax/TownFax', name: '城镇时空机', icon: 'el-icon-sort' },
          { id: "2", path: '/extra/fax/Cave', name: '洞穴设定', icon: 'el-icon-warning-outline' },
          { id: "2", path: '/extra/fax/Map', name: '地图设定', icon: 'el-icon-location' },
          { id: "2", path: '/extra/fax/Config', name: '小地图设定', icon: 'el-icon-location' },
        ]
      },
    ]
  },
  {
    id: '3',
    name: '战车',
    icon: 'el-icon-setting',
    children: [
      { id: "1", path: '/extra/tank/TankData', name: '战车数据' },
      { id: "2", path: '/extra/tank/TankShell', name: '战车炮弹' },
    ]
  },
  {
    id: 'spirit',
    name: '精灵伴游',
    icon: 'el-icon-s-data',
    children: [
      { id: '1', path: '/extra/spirit/Global', name: '全局' },
      { id: '2', path: '/extra/spirit/Traits', name: '特性库' },
      { id: '3', path: '/extra/spirit/Trails', name: '拖尾库' },
      { id: '4', path: '/extra/spirit/Spirits', name: '精灵列表' },
    ]
  },
  {
    id: '4',
    name: '任务',
    icon: 'el-icon-tickets',
    children: [
      { id: "1", path: '/extra/tank/TankData1', name: '主线任务' },
      { id: "2", path: '/extra/tank/TankShell2', name: '支线任务' },
    ]
  },
  {
    id: '6',
    name: '成就',
    icon: 'el-icon-s-check',
    children: [
      { id: "1", path: '/extra/tank/TankData3', name: '帐号成就' },
      { id: "2", path: '/extra/tank/TankShell4', name: '游戏成就' },
    ]
  },
  {
    id: '1231231231231233',
    name: '授权1',
    icon: 'el-icon-s-home',
    children: [
      { id: "1", path: '/login', name: '登录' },
    ]
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  // 浏览器直接 yarn dev：不强制工作空间页，便于调样式
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
    next({ path: '/base/Items' })
    return
  }

  next()
})

export default router
