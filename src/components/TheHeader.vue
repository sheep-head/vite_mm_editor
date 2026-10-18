<template>
  <div>
    <header class="yt-header" :class="{ 'is-editor': isEditor }">
      <div v-if="isEditor" class="yt-toolbar">
        <!-- 保存 -->
        <button type="button" class="tb-btn" title="保存 (Ctrl+S)" @click="saveMap">
          <el-icon><DocumentChecked /></el-icon>
        </button>

        <span class="tb-sep" />

        <!-- 剪切 / 复制 / 粘贴 -->
        <button type="button" class="tb-btn" title="剪切 (Ctrl+X)" @click="cutClip">
          <el-icon><Scissor /></el-icon>
        </button>
        <button type="button" class="tb-btn" title="复制 (Ctrl+C)" @click="copyClip">
          <el-icon><CopyDocument /></el-icon>
        </button>
        <button type="button" class="tb-btn" title="粘贴 (Ctrl+V)" @click="pasteClip">
          <el-icon><DocumentAdd /></el-icon>
        </button>

        <span class="tb-sep" />

        <!-- 撤销 / 重做 -->
        <button type="button" class="tb-btn" title="撤销 (Ctrl+Z)" @click="undoMap">
          <el-icon><RefreshLeft /></el-icon>
        </button>
        <button type="button" class="tb-btn" title="重做 (Ctrl+Y)" @click="redoMap">
          <el-icon><RefreshRight /></el-icon>
        </button>

        <span class="tb-sep" />

        <!-- 地图 / 事件模式 -->
        <button
          type="button"
          class="tb-btn"
          :class="{ active: mode === 'map' }"
          title="地图模式"
          @click="setMode('map')">
          <el-icon><MapLocation /></el-icon>
        </button>
        <button
          type="button"
          class="tb-btn"
          :class="{ active: mode === 'event' }"
          title="事件模式"
          @click="setMode('event')">
          <el-icon><Avatar /></el-icon>
        </button>

        <template v-if="mode === 'map'">
          <span class="tb-sep" />

          <!-- 图层 -->
          <button
            v-for="l in layerButtons"
            :key="'layer-' + String(l.id)"
            type="button"
            class="tb-btn"
            :class="{ active: editLayer === l.id }"
            :title="l.title"
            @click="setLayer(l.id)">
            <span class="tb-layer" :data-layer="l.mark">
              <span class="tb-layer-bar b0" />
              <span class="tb-layer-bar b1" />
              <span class="tb-layer-bar b2" />
              <span class="tb-layer-bar b3" />
            </span>
          </button>

          <span class="tb-sep" />

          <!-- 画笔 -->
          <button
            v-for="t in paintTools"
            :key="t.id"
            type="button"
            class="tb-btn"
            :class="{ active: paintTool === t.id }"
            :title="t.title"
            @click="setPaintTool(t.id)">
            <el-icon><component :is="t.icon" /></el-icon>
          </button>
        </template>

        <span class="tb-sep" />

        <!-- 缩放：放大 / 缩小 / 实际大小 / 适应窗口 -->
        <button type="button" class="tb-btn" title="放大" @click="zoom('in')">
          <el-icon><ZoomIn /></el-icon>
        </button>
        <button type="button" class="tb-btn" title="缩小" @click="zoom('out')">
          <el-icon><ZoomOut /></el-icon>
        </button>
        <button type="button" class="tb-btn" title="实际大小 (100%)" @click="zoom('reset')">
          <el-icon><ScaleToOriginal /></el-icon>
        </button>
        <button type="button" class="tb-btn" title="适应窗口" @click="zoom('fit')">
          <el-icon><FullScreen /></el-icon>
        </button>
        <span class="yt-zoom-label" :title="'当前缩放 ' + zoomPercent + '%'">{{ zoomPercent }}%</span>

        <span class="tb-sep" />

        <!-- 数据库 / 插件 -->
        <button type="button" class="tb-btn" title="数据库" @click="openDatabase">
          <el-icon><Coin /></el-icon>
        </button>
        <button type="button" class="tb-btn" title="插件管理" @click="pluginsVisible = true">
          <el-icon><SetUp /></el-icon>
        </button>

        <span class="tb-sep" />

        <!-- 声音测试 / 事件查找（地图工具） -->
        <button type="button" class="tb-btn" title="声音测试" @click="soundVisible = true">
          <el-icon><Headset /></el-icon>
        </button>
        <button
          type="button"
          class="tb-btn"
          :class="{ active: mapToolsVisible }"
          title="事件查找 / 地图工具"
          @click="toggleMapTools">
          <el-icon><Search /></el-icon>
        </button>

        <span class="tb-sep" />

        <!-- 测试游戏 -->
        <button type="button" class="tb-btn tb-play" title="测试游戏" @click="playtest">
          <el-icon><VideoPlay /></el-icon>
        </button>
      </div>
      <div v-else class="yt-header-spacer">
        <el-button text type="primary" @click="goEditor">← 返回主窗</el-button>
      </div>

      <div class="profile">
        <el-dropdown trigger="hover" placement="bottom-end">
          <span class="profile-trigger">
            <img
              class="profile-img"
              src="https://q2.qlogo.cn/headimg_dl?dst_uin=761303761&amp;spec=40"
              alt="" />
            <span class="profile-name">羊头</span>
            <yt-icon name="el-icon-arrow-down" class="profile-arrow"></yt-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="settingsVisible = true">设置</el-dropdown-item>
              <el-dropdown-item @click="changeWorkspace">更换工作空间</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <editor-settings-dialog v-model="settingsVisible" />
    <plugin-manager-dialog v-model="pluginsVisible" />
    <audio-file-picker-dialog v-model="soundVisible" tester />
  </div>
</template>
<script>
import { mapGetters } from 'vuex'
import { ElMessage } from 'element-plus'
import {
  DocumentChecked,
  Scissor,
  CopyDocument,
  DocumentAdd,
  RefreshLeft,
  RefreshRight,
  MapLocation,
  Avatar,
  EditPen,
  Crop,
  Aim,
  Brush,
  MagicStick,
  ZoomIn,
  ZoomOut,
  ScaleToOriginal,
  FullScreen,
  Coin,
  SetUp,
  Headset,
  Search,
  VideoPlay,
} from '@element-plus/icons-vue'
import EditorSettingsDialog from '@/components/settings/EditorSettingsDialog.vue'
import PluginManagerDialog from '@/components/plugins/PluginManagerDialog.vue'
import AudioFilePickerDialog from '@/components/map/pickers/AudioFilePickerDialog.vue'
import DataManager from '@/utils/DataManager'
import { isNw, nwRequire } from '@/utils/nw'

export default {
  name: 'YtHeader',
  components: {
    EditorSettingsDialog,
    PluginManagerDialog,
    AudioFilePickerDialog,
    DocumentChecked,
    Scissor,
    CopyDocument,
    DocumentAdd,
    RefreshLeft,
    RefreshRight,
    MapLocation,
    Avatar,
    EditPen,
    Crop,
    Aim,
    Brush,
    MagicStick,
    ZoomIn,
    ZoomOut,
    ScaleToOriginal,
    FullScreen,
    Coin,
    SetUp,
    Headset,
    Search,
    VideoPlay,
  },
  data() {
    return {
      settingsVisible: false,
      pluginsVisible: false,
      soundVisible: false,
      layerButtons: [
        { id: 'auto', title: '自动图层', mark: 'auto' },
        { id: 0, title: '第 1 层', mark: '0' },
        { id: 1, title: '第 2 层', mark: '1' },
        { id: 2, title: '第 3 层', mark: '2' },
        { id: 3, title: '第 4 层', mark: '3' },
      ],
      paintTools: [
        { id: 'pencil', title: '铅笔', icon: 'EditPen' },
        { id: 'rect', title: '矩形（填充）', icon: 'Crop' },
        { id: 'ellipse', title: '椭圆（填充）', icon: 'Aim' },
        { id: 'fill', title: '油漆桶（填充连通同类）', icon: 'Brush' },
        { id: 'shadow', title: '阴影笔（四象限）', icon: 'MagicStick' },
      ],
    }
  },
  computed: {
    ...mapGetters([
      'editorMode',
      'editLayer',
      'zoomPercent',
      'mapToolsVisible',
      'paintTool',
      'editorUi',
    ]),
    mode() {
      return this.editorMode
    },
    isEditor() {
      return this.$route.path === '/' || this.$route.path === '/editor'
    },
  },
  methods: {
    saveMap() {
      window.dispatchEvent(new CustomEvent('editor-map-save'))
    },
    cutClip() {
      window.dispatchEvent(new CustomEvent('editor-map-cut'))
    },
    copyClip() {
      window.dispatchEvent(new CustomEvent('editor-map-copy'))
    },
    pasteClip() {
      window.dispatchEvent(new CustomEvent('editor-map-paste'))
    },
    toggleMapTools() {
      this.$store.dispatch('toggleMapTools')
    },
    setMode(mode) {
      this.$store.commit('setEditorMode', mode)
      if (mode === 'event') this.$store.commit('setShowEvents', true)
    },
    setLayer(id) {
      this.$store.commit('setEditLayer', id)
    },
    setPaintTool(id) {
      this.$store.commit('setPaintTool', id)
    },
    zoom(kind) {
      this.$store.dispatch('requestZoom', kind)
    },
    openDatabase() {
      this.$store.commit('setDatabaseVisible', true)
    },
    playtest() {
      const ui = this.editorUi || {}
      const cmd = String(ui.playtestCommand || '').trim()
      if (!cmd) {
        ElMessage.warning('请先在设置中配置「测试游戏命令」')
        this.settingsVisible = true
        return
      }
      if (!isNw) {
        ElMessage.warning('仅 NW.js 环境可启动测试游戏')
        return
      }
      try {
        const root = (DataManager.$config && DataManager.$config.workSpace) || ''
        const cwd = String(ui.playtestCwd || '').trim() || root
        if (!cwd) {
          ElMessage.warning('无工作目录')
          return
        }
        const { exec } = nwRequire('child_process')
        exec(cmd, { cwd, windowsHide: false }, (err) => {
          if (err) {
            console.error(err)
            ElMessage.error('启动失败：' + (err.message || String(err)))
          }
        })
        ElMessage.success('已启动测试游戏')
      } catch (e) {
        console.error(e)
        ElMessage.error('启动失败')
      }
    },
    undoMap() {
      window.dispatchEvent(new CustomEvent('editor-map-undo'))
    },
    redoMap() {
      window.dispatchEvent(new CustomEvent('editor-map-redo'))
    },
    changeWorkspace() {
      this.$router.push({ path: '/workspace', query: { change: '1' } }).catch(() => true)
    },
    goEditor() {
      this.$router.push('/editor').catch(() => true)
    },
  },
}
</script>
<style scoped>
.yt-header {
  height: 52px;
  border-bottom: 1px solid var(--app-header-border);
  background-color: var(--app-header-bg);
  color: var(--app-header-text);
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  padding-right: 140px;
}
.yt-header-spacer {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 12px;
}
.yt-toolbar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 2px;
  padding: 4px 10px;
  overflow-x: auto;
}
.tb-sep {
  width: 1px;
  height: 22px;
  margin: 0 6px;
  background: var(--app-header-border, #ccc);
  flex-shrink: 0;
}
.tb-btn {
  width: 32px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 16px;
}
.tb-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.08);
}
.tb-btn.active {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.18);
  box-shadow: inset 0 0 0 1px rgba(42, 93, 176, 0.35);
  color: #2a5db0;
}
.tb-play {
  color: #1a7f37;
}
.tb-layer {
  width: 16px;
  height: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1px;
}
.tb-layer-bar {
  display: block;
  height: 2px;
  border-radius: 1px;
  background: rgba(120, 120, 120, 0.45);
}
.tb-layer[data-layer='auto'] .tb-layer-bar {
  background: #3b82f6;
}
.tb-layer[data-layer='0'] .b0,
.tb-layer[data-layer='1'] .b1,
.tb-layer[data-layer='2'] .b2,
.tb-layer[data-layer='3'] .b3 {
  background: #3b82f6;
}
.tb-btn.active .tb-layer-bar {
  background: rgba(42, 93, 176, 0.35);
}
.tb-btn.active .tb-layer[data-layer='auto'] .tb-layer-bar,
.tb-btn.active .tb-layer[data-layer='0'] .b0,
.tb-btn.active .tb-layer[data-layer='1'] .b1,
.tb-btn.active .tb-layer[data-layer='2'] .b2,
.tb-btn.active .tb-layer[data-layer='3'] .b3 {
  background: #2a5db0;
}
.yt-zoom-label {
  font-size: 11px;
  color: var(--app-text-muted);
  min-width: 36px;
  margin: 0 2px;
  flex-shrink: 0;
}
.profile {
  padding: 0 16px;
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
}
.profile-trigger {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  outline: none;
}
.profile-img {
  vertical-align: middle;
  width: 30px;
  height: 30px;
  margin-right: 8px;
  border-radius: 50%;
  border: 1px solid var(--app-border);
}
.profile-name {
  margin-right: 4px;
}
.profile-arrow {
  font-size: 12px;
  opacity: 0.75;
}
</style>
