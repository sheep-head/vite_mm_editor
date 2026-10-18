<template>
  <div class="efk-preview">
    <canvas ref="canvas" width="320" height="240" class="efk-canvas" />
    <div class="efk-bar">
      <el-button size="small" :disabled="!effectName || busy" @click="replay">播放</el-button>
      <el-button size="small" :disabled="!playing" @click="stop">停止</el-button>
      <span class="efk-hint">{{ statusText }}</span>
    </div>
  </div>
</template>

<script>
import { ensureEffekseer, hasWorkspaceEffekseer } from '@/utils/effekseerLoader'
import { effectAbsPath, toFileUrl, workRoot } from '@/utils/imgAssets'
import { path, isNw } from '@/utils/nw'

export default {
  name: 'EffekseerPreview',
  props: {
    effectName: { type: String, default: '' },
    scale: { type: Number, default: 100 },
    speed: { type: Number, default: 100 },
    offsetX: { type: Number, default: 0 },
    offsetY: { type: Number, default: 0 },
    rotation: { type: Object, default: () => ({ x: 0, y: 0, z: 0 }) },
  },
  data() {
    return {
      ready: false,
      playing: false,
      busy: false,
      statusText: '点击播放以加载 Effekseer（避免启动即崩溃）',
    }
  },
  created() {
    this._context = null
    this._handle = null
    this._raf = 0
    this._effekseer = null
    this._inited = false
  },
  beforeUnmount() {
    this.teardown()
  },
  methods: {
    async ensureInit() {
      if (this._inited && this._context) return true
      this.busy = true
      this.statusText = '加载 Effekseer…'
      try {
        const pack = await ensureEffekseer()
        if (!pack) {
          this.statusText = hasWorkspaceEffekseer()
            ? 'Effekseer 加载失败'
            : '无 effekseer.min.js / wasm（请放入工程 js/libs 或 public/effekseer）'
          return false
        }
        this._effekseer = pack.effekseer
        const canvas = this.$refs.canvas
        if (!canvas) {
          this.statusText = '无 canvas'
          return false
        }
        this._context = this._effekseer.createContext()
        await new Promise((resolve, reject) => {
          if (typeof this._context.initAsync === 'function') {
            this._context.initAsync(canvas, () => resolve(), () => reject(new Error('init failed')), {
              restoreCurrentGLState: true,
            })
          } else if (typeof this._context.init === 'function') {
            this._context.init(canvas)
            resolve()
          } else {
            reject(new Error('no init API'))
          }
        }).catch(() => {
          if (typeof this._context.init === 'function') this._context.init(canvas)
        })
        if (typeof this._effekseer.setResourcePath === 'function' && pack.wasmUrl) {
          try {
            this._effekseer.setResourcePath(pack.wasmUrl.replace(/effekseer\.wasm$/, ''))
          } catch (e) {
            /* ignore */
          }
        }
        this._inited = true
        this.ready = true
        this.loop()
        return true
      } catch (e) {
        console.error(e)
        this.statusText = 'WebGL 初始化失败: ' + (e && e.message)
        this.ready = false
        return false
      } finally {
        this.busy = false
      }
    },
    effectFileUrl() {
      if (!this.effectName) return ''
      const abs = effectAbsPath(this.effectName)
      if (abs && isNw) return toFileUrl(abs)
      const root = workRoot()
      if (root && path) {
        return toFileUrl(path.join(root, 'effects', this.effectName + '.efkefc'))
      }
      return ''
    },
    async reloadEffect() {
      this.stopHandle()
      const ok = await this.ensureInit()
      if (!ok || !this._context || !this.effectName) {
        if (!this.effectName) this.statusText = '未选择效果'
        return
      }
      const url = this.effectFileUrl()
      if (!url) {
        this.statusText = '找不到 .efkefc'
        return
      }
      this.statusText = '加载效果…'
      this.busy = true
      try {
        await new Promise((resolve, reject) => {
          const onLoad = (effect) => {
            try {
              this._handle = this._context.play(effect)
              this.applyTransform()
              this.playing = true
              this.statusText = this.effectName
              resolve()
            } catch (e) {
              reject(e)
            }
          }
          if (typeof this._context.loadEffect === 'function') {
            this._context.loadEffect(url, 1.0, onLoad, (e) => reject(e || new Error('loadEffect failed')))
          } else {
            reject(new Error('loadEffect API missing'))
          }
        })
      } catch (e) {
        console.error(e)
        this.statusText = '效果加载失败'
        this.playing = false
      } finally {
        this.busy = false
      }
    },
    applyTransform() {
      if (!this._handle) return
      const s = (this.scale || 100) / 100
      try {
        if (typeof this._handle.setScale === 'function') this._handle.setScale(s, s, s)
        if (typeof this._handle.setSpeed === 'function') this._handle.setSpeed((this.speed || 100) / 100)
        if (typeof this._handle.setLocation === 'function') {
          this._handle.setLocation(this.offsetX || 0, -(this.offsetY || 0), 0)
        }
        const r = this.rotation || {}
        if (typeof this._handle.setRotation === 'function') {
          this._handle.setRotation(
            ((r.x || 0) * Math.PI) / 180,
            ((r.y || 0) * Math.PI) / 180,
            ((r.z || 0) * Math.PI) / 180
          )
        }
      } catch (e) {
        /* ignore */
      }
    },
    replay() {
      if (!this.effectName) {
        this.statusText = '未选择效果'
        return
      }
      this.reloadEffect()
    },
    stopHandle() {
      if (this._handle && this._context) {
        try {
          if (typeof this._handle.stop === 'function') this._handle.stop()
          else if (typeof this._context.stop === 'function') this._context.stop(this._handle)
        } catch (e) {
          /* ignore */
        }
      }
      this._handle = null
      this.playing = false
    },
    stop() {
      this.stopHandle()
      this.statusText = '已停止'
    },
    loop() {
      const tick = () => {
        this._raf = requestAnimationFrame(tick)
        if (!this._context || !this.ready) return
        try {
          if (typeof this._context.update === 'function') this._context.update(1 / 60)
          if (typeof this._context.beginFrame === 'function') this._context.beginFrame()
          if (typeof this._context.draw === 'function') this._context.draw()
          if (typeof this._context.endFrame === 'function') this._context.endFrame()
        } catch (e) {
          /* ignore */
        }
      }
      this._raf = requestAnimationFrame(tick)
    },
    teardown() {
      if (this._raf) cancelAnimationFrame(this._raf)
      this._raf = 0
      this.stopHandle()
      if (this._context && typeof this._context.release === 'function') {
        try {
          this._context.release()
        } catch (e) {
          /* ignore */
        }
      }
      this._context = null
      this._effekseer = null
      this._inited = false
    },
  },
}
</script>

<style scoped>
.efk-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.efk-canvas {
  width: 320px;
  height: 240px;
  border: 1px solid var(--app-border);
  background: #1e1e22;
  border-radius: 4px;
}
.efk-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.efk-hint {
  font-size: 12px;
  color: var(--app-text-muted);
}
</style>
