<template>
  <div
    v-show="effectiveVisible"
    class="map-tools-panel"
    :style="panelStyle"
    @mousedown.stop>
    <div class="mtp-title" @pointerdown="onDragStart">
      <span>地图工具</span>
      <button type="button" class="mtp-close" title="关闭" @click.stop="close">×</button>
    </div>
    <div class="mtp-body">
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
        <el-tooltip :content="hyperlinkTip" placement="top" :show-after="200">
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
        '【测试提示】开启后识别仅含注释 $events.ref(n) 的单页事件为超链接，引用固定为 Map015 上 id=n 的模板事件。打开时可查看模板内容并跳转。',
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
  methods: {
    close() {
      this.$store.dispatch('closeMapTools')
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
  z-index: 2200;
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
  padding: 0 8px 0 12px;
  font-size: 13px;
  font-weight: 600;
  background: var(--app-surface-2, #f3f3f3);
  border-bottom: 1px solid var(--app-border);
  cursor: move;
  user-select: none;
  flex-shrink: 0;
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
