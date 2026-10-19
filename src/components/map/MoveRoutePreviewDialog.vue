<template>
  <el-dialog
    :model-value="modelValue"
    title="移动路线预览"
    width="92vw"
    top="2vh"
    class="map-preview-dlg"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="onVisible">
    <div class="mrp">
      <div class="mrp-bar">
        <span>{{ statusText }}</span>
        <span class="mrp-hint">左键移动方框 · Ctrl+右键拖拽 · 滚轮缩放</span>
        <div class="mrp-actions">
          <el-button size="small" native-type="button" :disabled="running" @click="start">播放</el-button>
          <el-button size="small" native-type="button" :disabled="!running" @click="stop">停止</el-button>
        </div>
      </div>
      <map-preview-canvas
        ref="preview"
        :map-id="mapId"
        :selected-x="markerX"
        :selected-y="markerY"
        :show-events="true"
        :selectable="!running"
        :overlay-actor="actor"
        @pick="onPick" />
    </div>
    <template #footer>
      <el-button native-type="button" @click="close">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script>
import MapPreviewCanvas from './MapPreviewCanvas.vue'
import { canPass } from '@/utils/mapTilePaint'

const DIR = {
  2: { x: 0, y: 1 },
  4: { x: -1, y: 0 },
  6: { x: 1, y: 0 },
  8: { x: 0, y: -1 },
}

function cellOf(n) {
  const v = Math.round(Number(n) || 0)
  return v < 0 ? 0 : v
}

function sleep(ms, bag) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(true), ms)
    bag.cancel = () => {
      clearTimeout(t)
      resolve(false)
    }
  })
}

export default {
  name: 'MoveRoutePreviewDialog',
  components: { MapPreviewCanvas },
  props: {
    modelValue: { type: Boolean, default: false },
    mapId: { type: Number, default: 0 },
    startX: { type: Number, default: 0 },
    startY: { type: Number, default: 0 },
    characterName: { type: String, default: '' },
    characterIndex: { type: Number, default: 0 },
    direction: { type: Number, default: 2 },
    route: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    markerX() {
      if (this.running && this.actor) return this.actor.x
      return this.originX
    },
    markerY() {
      if (this.running && this.actor) return this.actor.y
      return this.originY
    },
  },
  data() {
    return {
      running: false,
      statusText: '就绪',
      actor: null,
      originX: cellOf(this.startX),
      originY: cellOf(this.startY),
    }
  },
  watch: {
    modelValue(v) {
      if (v) this.prepare()
      else this.stop()
    },
  },
  beforeCreate() {
    this._runToken = 0
    this._playing = false
    this._sleepBag = null
  },
  created() {
    this.resetActor()
  },
  beforeUnmount() {
    this.stop()
  },
  methods: {
    cell(n) {
      return cellOf(n)
    },
    onVisible(v) {
      if (!v) this.stop()
      this.$emit('update:modelValue', v)
    },
    close() {
      this.stop()
      this.$emit('update:modelValue', false)
    },
    prepare() {
      this.originX = this.cell(this.startX)
      this.originY = this.cell(this.startY)
      this.resetActor()
      this.statusText = '就绪'
    },
    resetActor() {
      this.actor = {
        x: this.originX,
        y: this.originY,
        characterName: this.characterName || '',
        characterIndex: this.characterIndex || 0,
        direction: this.direction || 2,
        pattern: 1,
        through: false,
      }
    },
    redraw() {
      const p = this.$refs.preview
      if (p && typeof p.requestPaint === 'function') p.requestPaint()
    },
    onPick(tile) {
      if (this.running || !tile) return
      this.originX = tile.x
      this.originY = tile.y
      if (this.actor) {
        this.actor.x = tile.x
        this.actor.y = tile.y
      }
      this.redraw()
    },
    stop() {
      this._runToken += 1
      this._playing = false
      if (this._sleepBag && this._sleepBag.cancel) this._sleepBag.cancel()
      this._sleepBag = null
      this.running = false
      if (this.statusText !== '就绪') this.statusText = '已停止'
    },
    async start() {
      if (this._playing) return
      this._runToken += 1
      const token = this._runToken
      this._playing = true
      if (this._sleepBag && this._sleepBag.cancel) this._sleepBag.cancel()
      this._sleepBag = null
      const view = this.$refs.preview
      const map = view && typeof view.getMap === 'function' ? view.getMap() : null
      if (!map) {
        this._playing = false
        this.running = false
        this.statusText = this.$refs.preview && this.$refs.preview.loading ? '地图还在加载' : '地图未就绪'
        return
      }
      this.resetActor()
      this.running = true
      this.statusText = '播放中'
      try {
        const route = this.route || {}
        const list = (Array.isArray(route.list) ? route.list : []).filter((s) => s && s.code)
        const maxLoops = route.repeat ? 3 : 1
        let blocked = false
        for (let loop = 0; loop < maxLoops && !blocked; loop++) {
          for (let i = 0; i < list.length; i++) {
            if (token !== this._runToken) return
            this.statusText =
              `步骤 ${i + 1}/${list.length}` + (route.repeat ? ` · 循环 ${loop + 1}/3` : '')
            const ok = await this.runStep(list[i], !!route.skippable, token)
            if (token !== this._runToken) return
            if (ok === false) {
              blocked = true
              this.statusText = '无法移动'
              break
            }
          }
        }
        if (token === this._runToken && !blocked) this.statusText = '完成'
      } catch (e) {
        console.error(e)
        if (token === this._runToken) this.statusText = '预览出错'
      } finally {
        if (token === this._runToken) {
          this.running = false
          this._playing = false
        }
      }
    },
    async wait(ms, token) {
      const bag = { cancel: null }
      this._sleepBag = bag
      const ok = await sleep(Math.max(16, ms | 0), bag)
      if (this._sleepBag === bag) this._sleepBag = null
      return ok && token === this._runToken
    },
    mapCtx() {
      const p = this.$refs.preview
      return {
        map: p && p.getMap ? p.getMap() : null,
        flags: p && p.getFlags ? p.getFlags() : [],
      }
    },
    tryMove(dx, dy, skippable) {
      const nx = (this.actor.x | 0) + dx
      const ny = (this.actor.y | 0) + dy
      const { map, flags } = this.mapCtx()
      let pass = false
      try {
        pass = canPass(map, flags, nx, ny, this.actor.through)
      } catch (e) {
        console.error(e)
        pass = false
      }
      if (!pass) return skippable ? 'skip' : 'blocked'
      this.actor.x = nx
      this.actor.y = ny
      if (dx > 0) this.actor.direction = 6
      else if (dx < 0) this.actor.direction = 4
      else if (dy > 0) this.actor.direction = 2
      else if (dy < 0) this.actor.direction = 8
      this.actor.pattern = ((this.actor.pattern | 0) + 1) % 3
      return 'ok'
    },
    relativeDir(base, turn) {
      const order = [2, 4, 8, 6]
      let i = order.indexOf(base)
      if (i < 0) i = 0
      if (turn === 0) i = (i + 3) % 4
      else if (turn === 1) i = (i + 1) % 4
      else i = (i + 2) % 4
      return order[i]
    },
    async animateWalk(dx, dy, skippable, token) {
      const result = this.tryMove(dx, dy, skippable)
      this.redraw()
      if (result === 'blocked') return false
      return this.wait(result === 'skip' ? 40 : 180, token)
    },
    async runStep(step, skippable, token) {
      const code = step.code | 0
      const p = Array.isArray(step.parameters) ? step.parameters : []
      const d = DIR[this.actor.direction] || DIR[2]

      if (code >= 1 && code <= 4) {
        const map = { 1: 2, 2: 4, 3: 6, 4: 8 }
        this.actor.direction = map[code]
        const dir = DIR[map[code]]
        return this.animateWalk(dir.x, dir.y, skippable, token)
      }
      if (code >= 5 && code <= 8) {
        const deltas = {
          5: { x: -1, y: 1 },
          6: { x: 1, y: 1 },
          7: { x: -1, y: -1 },
          8: { x: 1, y: -1 },
        }
        const dd = deltas[code]
        return this.animateWalk(dd.x, dd.y, skippable, token)
      }
      if (code === 9) {
        const opts = [DIR[2], DIR[4], DIR[6], DIR[8]]
        const dd = opts[Math.floor(Math.random() * opts.length)]
        return this.animateWalk(dd.x, dd.y, skippable, token)
      }
      if (code === 10 || code === 11) {
        return this.animateWalk(code === 10 ? d.x : -d.x, code === 10 ? d.y : -d.y, skippable, token)
      }
      if (code === 12) return this.animateWalk(d.x, d.y, skippable, token)
      if (code === 13) return this.animateWalk(-d.x, -d.y, skippable, token)
      if (code === 14) {
        const jx = Number(p[0]) || 0
        const jy = Number(p[1]) || 0
        this.actor.x = (this.actor.x | 0) + jx
        this.actor.y = (this.actor.y | 0) + jy
        this.redraw()
        return this.wait(200, token)
      }
      if (code === 15) {
        const frames = Math.max(1, Number(p[0]) || 60)
        return this.wait(Math.min(2000, frames * 16), token)
      }
      if (code >= 16 && code <= 19) {
        this.actor.direction = { 16: 2, 17: 4, 18: 6, 19: 8 }[code]
        this.redraw()
        return this.wait(120, token)
      }
      if (code === 20 || code === 21 || code === 22) {
        this.actor.direction = this.relativeDir(this.actor.direction, code === 20 ? 0 : code === 21 ? 1 : 2)
        this.redraw()
        return this.wait(120, token)
      }
      if (code === 23 || code === 24) {
        const opts = [2, 4, 6, 8]
        this.actor.direction = opts[Math.floor(Math.random() * opts.length)]
        this.redraw()
        return this.wait(120, token)
      }
      if (code === 37) this.actor.through = true
      if (code === 38) this.actor.through = false
      if (code === 41) {
        this.actor.characterName = typeof p[0] === 'string' ? p[0] : ''
        this.actor.characterIndex = Number(p[1]) || 0
        const view = this.$refs.preview
        if (view && typeof view.syncOverlay === 'function') await view.syncOverlay()
      }
      this.redraw()
      return this.wait(code === 25 || code === 26 ? 80 : 40, token)
    },
  },
}
</script>

<style scoped>
.mrp {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 168px);
  max-height: calc(100vh - 168px);
  min-height: 0;
  gap: 8px;
  overflow: hidden;
}
.mrp-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  flex-shrink: 0;
}
.mrp-hint {
  flex: 1;
  text-align: center;
  color: var(--el-text-color-secondary, #909399);
}
.mrp-actions {
  display: flex;
  gap: 6px;
}
.mrp :deep(.mpc) {
  flex: 1;
  min-height: 0;
}
</style>
