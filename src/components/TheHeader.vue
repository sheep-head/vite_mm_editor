<template>
  <div>
    <header class="yt-header" :class="{ 'is-editor': isEditor }">
      <div v-if="isEditor" class="yt-toolbar">
        <el-button-group>
          <el-button
            size="small"
            :type="mode === 'map' ? 'primary' : 'default'"
            @click="setMode('map')">
            地图
          </el-button>
          <el-button
            size="small"
            :type="mode === 'event' ? 'primary' : 'default'"
            @click="setMode('event')">
            事件
          </el-button>
        </el-button-group>
        <el-divider direction="vertical" />
        <el-button-group>
          <el-button
            v-for="l in layerButtons"
            :key="String(l.id)"
            size="small"
            :type="editLayer === l.id ? 'primary' : 'default'"
            @click="setLayer(l.id)">
            {{ l.label }}
          </el-button>
        </el-button-group>
        <el-divider direction="vertical" />
        <el-button size="small" @click="zoom('out')">缩小</el-button>
        <el-button size="small" @click="zoom('in')">放大</el-button>
        <el-button size="small" @click="zoom('reset')">实际大小</el-button>
        <el-button size="small" @click="zoom('fit')">适应窗口</el-button>
        <span class="yt-zoom-label">{{ zoomPercent }}%</span>
        <el-divider direction="vertical" />
        <el-checkbox :model-value="showGrid" size="small" @change="onGrid">网格</el-checkbox>
        <el-checkbox :model-value="showRegions" size="small" @change="onRegions">Region</el-checkbox>
        <el-checkbox :model-value="showEvents" size="small" @change="onEvents">事件</el-checkbox>
        <el-divider direction="vertical" />
        <el-button size="small" @click="undoMap" title="Ctrl+Z">撤销</el-button>
        <el-button size="small" @click="redoMap" title="Ctrl+Y">重做</el-button>
        <el-divider direction="vertical" />
        <el-button
          size="small"
          :type="mapToolsVisible ? 'primary' : 'default'"
          title="地图工具"
          @click="toggleMapTools">
          <yt-icon name="el-icon-s-tools" />
        </el-button>
        <el-button size="small" type="primary" @click="openDatabase">数据库</el-button>
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

    <el-dialog v-model="settingsVisible" title="设置" width="480px" append-to-body>
      <el-form label-width="180px">
        <el-form-item label="主题">
          <el-radio-group v-model="dark">
            <el-radio :value="false">明亮色</el-radio>
            <el-radio :value="true">深暗色</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="settingsVisible = false">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script>
import { mapGetters } from 'vuex'
import { isDark } from '@/utils/theme'

export default {
  name: 'YtHeader',
  data() {
    return {
      settingsVisible: false,
      layerButtons: [
        { id: 'auto', label: 'Auto' },
        { id: 0, label: '1' },
        { id: 1, label: '2' },
        { id: 2, label: '3' },
        { id: 3, label: '4' },
      ],
    }
  },
  computed: {
    ...mapGetters([
      'editorMode',
      'editLayer',
      'showGrid',
      'showRegions',
      'showEvents',
      'zoomPercent',
      'mapToolsVisible',
    ]),
    mode() {
      return this.editorMode
    },
    isEditor() {
      return this.$route.path === '/' || this.$route.path === '/editor'
    },
    dark: {
      get() {
        return isDark.value
      },
      set(value) {
        isDark.value = value
      },
    },
  },
  methods: {
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
    zoom(kind) {
      this.$store.dispatch('requestZoom', kind)
    },
    onGrid(v) {
      this.$store.commit('setShowGrid', v)
    },
    onRegions(v) {
      this.$store.commit('setShowRegions', v)
    },
    onEvents(v) {
      this.$store.commit('setShowEvents', v)
    },
    openDatabase() {
      this.$store.commit('setDatabaseVisible', true)
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
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 12px;
}
.yt-zoom-label {
  font-size: 12px;
  color: var(--app-text-muted);
  min-width: 40px;
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
