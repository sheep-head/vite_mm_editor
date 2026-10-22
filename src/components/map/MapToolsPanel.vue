<template>
  <div
    v-show="effectiveVisible"
    class="map-tools-panel"
    :style="panelStyle"
    @mousedown.stop>
    <div class="mtp-title">
      <span class="mtp-title-drag" @pointerdown="onDragStart">地图工具</span>
      <button type="button" class="mtp-close" title="关闭" @click="close">×</button>
    </div>
    <div class="mtp-body">
      <div class="mtp-row mtp-view-toggles">
        <el-checkbox :model-value="showGrid" @change="onGrid">网格</el-checkbox>
        <el-checkbox :model-value="showRegions" @change="onRegions">Region</el-checkbox>
        <el-checkbox :model-value="showEvents" @change="onEvents">事件</el-checkbox>
      </div>
      <div class="mtp-row">
        <el-checkbox :model-value="mapCharOriginalSize" @change="onCharSize">
          事件行走图原尺寸渲染
        </el-checkbox>
      </div>
      <div class="mtp-row">
        <el-checkbox :model-value="previewWalkAnim" @change="onWalkAnim">
          预览行走图动作
        </el-checkbox>
      </div>
      <div class="mtp-row mtp-row-tip">
        <el-checkbox :model-value="showHyperlinks" @change="onHyperlinks">
          显示超链接
        </el-checkbox>
        <el-tooltip
          :content="hyperlinkTip"
          placement="top"
          :show-after="200"
          popper-class="map-tools-tip">
          <span class="mtp-q">?</span>
        </el-tooltip>
      </div>
      <div v-if="showHyperlinks" class="mtp-row mtp-row-tip">
        <el-checkbox :model-value="showHyperlinkImages" @change="onHyperlinkImages">
          显示超链接事件图
        </el-checkbox>
        <el-tooltip
          :content="hyperlinkImageTip"
          placement="top"
          :show-after="200"
          popper-class="map-tools-tip">
          <span class="mtp-q">?</span>
        </el-tooltip>
      </div>
      <div class="mtp-row">
        <el-button size="small" type="primary" @click="searcherVisible = true">事件查找器</el-button>
      </div>
    </div>
    <div class="mtp-resize" title="拖拽调整大小" @pointerdown="onResizeStart" />

    <event-searcher-dialog v-model="searcherVisible" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import EventSearcherDialog from './EventSearcherDialog.vue'

const MIN_W = 260
const MIN_H = 180

export default {
  name: 'MapToolsPanel',
  components: { EventSearcherDialog },
  data() {
    return {
      searcherVisible: false,
      drag: null,
      hyperlinkTip:
        '开启后在地图上标记超链接事件（单页仅含注释 $events.ref(n)，模板固定 Map015）。事件编辑器内可「转为超链接」「修改链接」「取消超链接」，也可「查看模板」并跳转。',
      hyperlinkImageTip:
        '开启后，地图上的超链接事件按 Map015 模板事件的图像绘制；场所移动 / 移动路线预览同样生效。',
    }
  },
  computed: {
    ...mapGetters([
      'mapToolsVisible',
      'mapToolsGeom',
      'databaseVisible',
      'mapCharOriginalSize',
      'previewWalkAnim',
      'showHyperlinks',
      'showHyperlinkImages',
      'showGrid',
      'showRegions',
      'showEvents',
    ]),
    effectiveVisible() {
      return this.mapToolsVisible && !this.databaseVisible
    },
    panelStyle() {
      const g = this.mapToolsGeom || {}
      return {
        left: (g.x || 120) + 'px',
        top: (g.y || 60) + 'px',
        width: (g.w || 360) + 'px',
        height: (g.h || 300) + 'px',
      }
    },
  },
  watch: {
    effectiveVisible(v) {
      if (v) this.$nextTick(() => this.ensureOnScreen())
    },
  },
  mounted() {
    if (this.effectiveVisible) this.ensureOnScreen()
  },
  methods: {
    ensureOnScreen() {
      const g = this.mapToolsGeom || {}
      const w = g.w || 360
      const h = g.h || 300
      const x = Number.isFinite(g.x) ? g.x : 120
      const y = Number.isFinite(g.y) ? g.y : 60
      const vw = window.innerWidth || 0
      const vh = window.innerHeight || 0
      if (vw < 64 || vh < 64) return
      const titleH = 28
      const noIntersect = x >= vw || y >= vh || x + w <= 0 || y + h <= 0
      const titleOff = y < 0 || x < 0 || y + titleH > vh || x + Math.min(w, 80) > vw
      if (!noIntersect && !titleOff) return
      this.$store.commit('setMapToolsGeom', {
        x: Math.max(8, vw - w - 8),
        y: Math.max(8, vh - h - 8),
        w,
        h,
      })
      this.$store.dispatch('persistMapTools')
    },
    close() {
      this.$store.commit('setMapToolsVisible', false)
      this.$store.dispatch('persistMapTools')
    },
    onCharSize(v) {
      this.$store.dispatch('setMapCharOriginalSizePersist', v)
    },
    onWalkAnim(v) {
      this.$store.dispatch('setPreviewWalkAnimPersist', v)
    },
    onHyperlinks(v) {
      this.$store.dispatch('setShowHyperlinksPersist', v)
    },
    onHyperlinkImages(v) {
      this.$store.dispatch('setShowHyperlinkImagesPersist', v)
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
    onDragStart(e) {
      if (e.button !== 0) return
      const g = this.mapToolsGeom
      this.drag = {
        kind: 'move',
        startX: e.clientX,
        startY: e.clientY,
        origX: g.x,
        origY: g.y,
        origW: g.w,
        origH: g.h,
      }
      e.currentTarget.setPointerCapture?.(e.pointerId)
      window.addEventListener('pointermove', this.onDragMove)
      window.addEventListener('pointerup', this.onDragEnd)
    },
    onResizeStart(e) {
      if (e.button !== 0) return
      e.stopPropagation()
      const g = this.mapToolsGeom
      this.drag = {
        kind: 'resize',
        startX: e.clientX,
        startY: e.clientY,
        origX: g.x,
        origY: g.y,
        origW: g.w,
        origH: g.h,
      }
      e.currentTarget.setPointerCapture?.(e.pointerId)
      window.addEventListener('pointermove', this.onDragMove)
      window.addEventListener('pointerup', this.onDragEnd)
    },
    onDragMove(e) {
      if (!this.drag) return
      const dx = e.clientX - this.drag.startX
      const dy = e.clientY - this.drag.startY
      if (this.drag.kind === 'move') {
        const x = Math.max(0, this.drag.origX + dx)
        const y = Math.max(0, this.drag.origY + dy)
        this.$store.commit('setMapToolsGeom', {
          x,
          y,
          w: this.drag.origW,
          h: this.drag.origH,
        })
      } else {
        const w = Math.max(MIN_W, this.drag.origW + dx)
        const h = Math.max(MIN_H, this.drag.origH + dy)
        this.$store.commit('setMapToolsGeom', {
          x: this.drag.origX,
          y: this.drag.origY,
          w,
          h,
        })
      }
    },
    onDragEnd() {
      if (!this.drag) return
      this.drag = null
      window.removeEventListener('pointermove', this.onDragMove)
      window.removeEventListener('pointerup', this.onDragEnd)
      this.$store.dispatch('persistMapTools')
    },
  },
  beforeUnmount() {
    window.removeEventListener('pointermove', this.onDragMove)
    window.removeEventListener('pointerup', this.onDragEnd)
  },
}
</script>

<style scoped>
.map-tools-panel {
  position: fixed;
  /* 低于 el-tooltip / dialog（约 2000+），避免挡住 tip */
  z-index: 1200;
  display: flex;
  flex-direction: column;
  min-width: 260px;
  min-height: 180px;
  background: var(--app-surface, #fff);
  color: var(--app-text);
  border: 1px solid var(--app-border);
  border-radius: 6px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}
.mtp-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 4px 0 0;
  font-size: 13px;
  font-weight: 600;
  background: var(--app-surface-2, #f3f3f3);
  border-bottom: 1px solid var(--app-border);
  user-select: none;
  flex-shrink: 0;
}
.mtp-title-drag {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 12px;
  cursor: move;
}
.mtp-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: var(--app-text-muted);
  border-radius: 4px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.mtp-close:hover {
  background: var(--app-hover-bg);
  color: var(--app-text);
}
.mtp-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 14px 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mtp-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mtp-view-toggles {
  flex-wrap: wrap;
  padding-bottom: 6px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--app-border, #e5e5e5);
}
.mtp-q {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--app-border);
  font-size: 12px;
  color: var(--app-text-muted);
  cursor: help;
  user-select: none;
}
.mtp-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  background: linear-gradient(
    135deg,
    transparent 0 45%,
    var(--app-border) 45% 55%,
    transparent 55% 70%,
    var(--app-border) 70% 80%,
    transparent 80%
  );
}
</style>

<style>
/* tooltip 挂到 body，保证盖过工具浮窗 */
.map-tools-tip {
  z-index: 3000 !important;
  max-width: 320px;
}
</style>
