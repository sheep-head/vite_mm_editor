# 羊头专用编辑器 · vite_mm_editor

由原 `mm_editor/`（Vue2 + Element UI + httpVueLoader + 手写 script 引入）**完整重构**为
**Vite + Vue 3 + Element Plus + Vue Router 4 + Vuex 4**，全部组件保持 **Options API** 写法，
页面逻辑与原项目保持一致，并保留 NW.js（node 环境）能力。

---

## 一、运行环境

| 依赖 | 版本 |
| --- | --- |
| Node | 18+（实测 v22） |
| 包管理 | **yarn** |
| 运行时 | NW.js（`%NW_HOME%\nw.exe`） |

## 二、安装与常用命令

```bash
yarn install          # 安装依赖
yarn dev              # 启动 vite 开发服务器 http://127.0.0.1:5173/
yarn build            # 打包到 dist/
yarn preview          # 预览打包结果（浏览器，无 NW.js 能力）
yarn pack             # 调用 nwjc.exe 打包 JS（沿用原 packJs.js）
```

## 三、两种运行方式

### 1. 生产运行（和原项目一模一样）

```bash
yarn build
```

然后双击 **`dist/start.bat`** 或 **`dist/start2.bat`** 用 NW.js 打开 `dist/`。

`yarn build` 会自动把 `nwjs/` 目录下的 NW.js 运行文件复制到 `dist/` 根目录：

```
dist/
├── index.html          # 入口（内置 window.nwRequire = require）
├── assets/             # js / css
├── package.json        # NW.js 清单（main: index.html）
├── config.js           # 工作区配置（NW.js require('config') 读取的就是这个）
├── icon/icon.png
├── start.bat / start2.bat
```

### 2. 开发运行（Vite HMR + 完整 NW.js 能力）

```bash
yarn dev              # 1. 起开发服务器
```

再双击 **`nwjs-dev/start-dev.bat`**，用 NW.js 打开 `http://127.0.0.1:5173/`。
（`nwjs-dev/package.json` 的 `main` 指向开发服务器，`node-remote` 已放开 localhost）

> 直接用浏览器打开 `http://127.0.0.1:5173/` 也能看到界面，但浏览器里没有 node，
> 读不到 `config.js` / 本地 json 数据，页面会提示"当前不是 NW.js 运行环境"。

## 四、NW.js 兼容：`require` → `nwRequire`

Vite 打包出来的是 ES module，模块内部没有 `require`，
所以入口 `index.html`最前面加了：

```html
<script>
  try { window.nwRequire = require; } catch (e) { window.nwRequire = null; }
</script>
```

原项目里所有 `require('xxx')` 一律改写成 **`nwRequire('xxx')`**：

| 原位置 | 原写法 | 现写法 |
| --- | --- | --- |
| `js/DataManager.js` | `require('fs')` / `require('path')` / `require('config')` / `require('net')` | 统一封装在 `src/utils/nw.js`，导出 `fs` / `path` / `config` / `net` / `clipboard` |
| `js/vueComponent.js` | `Vue.prototype.$fs = require('fs')` 等 | `src/plugins/globalProperties.js` 里挂到 `app.config.globalProperties` |
| `js/vueComponent.js` | `nw.Clipboard.get()` | `src/utils/nw.js` 里 `window.nw` 或 `nwRequire('nw.gui')` |

非 NW.js 环境下 `window.nwRequire` 为 `null`，`nw.js` 会退化成会抛异常的兜底函数，
页面本身仍能正常加载（方便浏览器里调样式）。

## 五、深浅色皮肤

右上角头像左侧有一个开关（`el-switch`，月亮/太阳图标），点击即切换：

* **明亮色**（默认）
* **深暗色**

实现要点：

* 皮肤变量定义在 `src/styles/theme.css`（`:root` 与 `html.dark` 两套）；
* HTML 根节点加 `.dark` 类启用深暗色，同时配合 Element Plus 自带的
  `element-plus/theme-chalk/dark/css-vars.css`，所有 Element Plus 组件一起变暗；
* 菜单皮肤通过覆盖 `--el-menu-*` 变量实现，折叠后的弹出子菜单也一并跟随；
* 选择结果写入 `localStorage`（key: `editor-theme`），下次打开保持上次的皮肤。

## 六、目录结构

```
vite_mm_editor/
├── index.html                      # 主入口（NW.js 引导 + #app）
├── vite.config.js                  # 主程序构建配置
├── packJs.cjs                      # 原 packJs.js
├── nwjs/                           # NW.js 运行文件（构建时复制到 dist/）
│   ├── package.json                # NW.js 清单
│   ├── config.js                   # workSpace 配置（改这里！）
│   ├── icon/icon.png
│   └── start.bat / start2.bat
├── nwjs-dev/                       # NW.js 开发模式运行文件
│   ├── package.json                # main 指向 http://127.0.0.1:5173/
│   ├── config.js                   # 复用 ../nwjs/config.js
│   └── start-dev.bat
└── src/
    ├── main.js                     # createApp + 插件 + 全局组件
    ├── App.vue                     # 原 index.html 里的整体布局
    ├── api/common.js               # 原 js/common.js（axios 实例）
    ├── router/index.js             # 原 js/router.js（routes + routeMenu）
    ├── store/index.js              # 原 js/store.js（Vuex）
    ├── mixins/contextmenu.js       # 原 js/vueComponent.js 的 CONTEXTMENU_SLOT
    ├── plugins/globalProperties.js # 原 vueComponent.js 里挂 Vue.prototype 的部分
    ├── utils/
    │   ├── nw.js                   # nwRequire / fs / path / config / clipboard
    │   ├── utils.js                # 原 js/utils.js
    │   ├── DataManager.js          # 原 js/DataManager.js
    │   ├── shortcut.js             # 原 js/shortcut.js
    │   ├── ShortcutManager.js      # 原 js/ShortcutManager.js
    │   └── theme.js                # 新增：深浅色皮肤状态
    ├── components/
    │   ├── TheHeader.vue           # 原 views/components/header.vue（+ 皮肤开关）
    │   ├── MenuSlider.vue          # 原 views/components/menu.vue
    │   ├── Draggable.vue           # 原 views/components/Draggable.vue
    │   ├── YtIcon.vue              # 新增：el-icon-* 图标名 → element-plus svg 图标
    │   ├── YtConfirmDialog.vue     # 原 Vue.component('yt-confirm-dialog')
    │   └── YtMask.vue              # 原 Vue.component('yt-mask')
    ├── views/                      # 与原 views/ 一一对应
    │   ├── base/{Items,Weapons,Armors}.vue
    │   ├── extra/fax/{Fax,TownFax,Cave,Map,Config}.vue
    │   ├── extra/tank/{TankData,TankShell}.vue
    │   └── auth/Login.vue
    ├── styles/{index,vueComponent,theme}.css
```

## 七、迁移时必须做的等价改写（逻辑未变）

1. `module.exports = {...}` → `export default {...}`；`?(window)` 的 IIFE 全局导出 → ES module 导出；
2. `new Vue({...})` → `createApp(App).use(...).mount('#app')`，原 `index.html` 里的布局移到 `App.vue`；
3. `Vue.prototype.$xxx` → `app.config.globalProperties.$xxx`；`Vue.component(...)` → `app.component(...)`；
4. `Vuex.mapState` / `Vuex.Store` → `vuex` 的 `mapState` / `createStore`；
5. `VueRouter` → `createRouter` + `createWebHashHistory()`（保持 hash 模式）；
6. `httpVueLoader` 动态加载组件 → 路由里直接 `import`；
7. `beforeDestroy` → `beforeUnmount`（Vue 3 改名）；
8. `slot="xxx"` → `<template #xxx>`；`v-slot:title` 保持不变；
9. `el-submenu` → `el-sub-menu`（Element Plus 改名）；
10. `:visible.sync` → `v-model`；`@click.native` → `@click`（Vue 3 取消 `.native`）；
11. **`v-for` 与 `v-if` 不能写在同一个标签上**（Vue 3 中 `v-if` 优先级更高，会取不到循环变量），
    统一改成 `<template v-for="..."><tag v-if="..."></template>`；
12. `el-menu-item-group` 的 `#title` 插槽**不能**嵌在 `v-if` 的 `<template>` 里
    （Vue 3 编译器会直接报错），改为把 `v-if` 放到 `el-menu-item-group` 本身；
13. `el-switch` 的 `active-color` / `inactive-color` 在 Element Plus 已移除，
    改为内联 CSS 变量 `--el-switch-on-color` / `--el-switch-off-color`（颜色值与原项目一致）；
14. `el-button` 的 `icon="el-icon-xxx"`（字体类名）→ 组件形式 `<yt-icon name="el-icon-xxx" />`；
15. `this.$set(obj, k, v)` → 直接赋值（Vue 3 无需 `$set`）；
16. `$loading` 的 `spinner: 'el-icon-loading'` 选项在 Element Plus 中语义不同（会被当成 svg 内容），
    去掉该选项，使用 Element Plus 默认的转圈动画；
17. `Login.vue` 里 `components: { test: "url:./test.vue" }` 指向的文件在原项目中也不存在且未被使用，
    已删除该无效注册。

## 八、构建产物在 `file://` 下能跑的关键设置

NW.js 用 `file://` 加载页面时，浏览器会拒绝执行 `type="module"` 的脚本、并且 `crossorigin`
会触发 CORS 校验。因此 `vite.config.js` 做了三件事：

1. `base: './'` —— 全部资源用相对路径；
2. `build.rollupOptions.output.format: 'iife'` + `inlineDynamicImports: true` —— 打成单文件普通脚本；
3. 自定义插件 `nw-classic-script` —— 构建时把 `<script type="module" crossorigin>` 改写成
   `<script ... defer>`（因为 Vite 会把入口脚本放进 `<head>`，普通脚本必须 `defer` 才能等 `#app` 解析完），
   同时去掉 `<link>` 上的 `crossorigin`。

## 九、修改工作区路径

改 **`nwjs/config.js`** 里的 `workSpace`（`nwjs-dev/config.js` 会自动复用同一份）。

```js
module.exports = {
	workSpace: "D:\\workspace\\IdeaProjects\\MM_FR2_MV",
}
```
