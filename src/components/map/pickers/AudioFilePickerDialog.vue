<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="760px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="onVisible"
    @closed="stopPlayback">
    <div v-if="tester" class="audio-tabs">
      <button
        v-for="t in audioTypes"
        :key="t.id"
        type="button"
        class="audio-tab"
        :class="{ active: activeFolder === t.id }"
        @click="setFolder(t.id)">
        {{ t.label }}
      </button>
    </div>
    <div v-if="$slots.extra" class="audio-picker__extra">
      <slot name="extra" />
    </div>
    <div class="audio-picker">
      <div class="audio-picker__list">
        <div ref="listEl" class="file-list">
          <div
            v-for="row in fileRows"
            :key="row.name || '__none'"
            class="file-row"
            :class="{ 'is-current': row.name === selectedName }"
            @click="onRowClick(row)"
            @dblclick="onRowDbl(row)">
            {{ row.label }}
          </div>
        </div>
        <el-checkbox v-model="clickToPlay" class="click-play">单击播放</el-checkbox>
      </div>
      <div class="audio-picker__side">
        <el-button type="primary" :disabled="!selectedName" @click="playAudition()">播放</el-button>
        <el-button @click="stopPlayback">停止</el-button>
        <canvas ref="wave" class="wave" @click="onWaveClick" />
        <db-group-box title="音量" class="blk">
          <el-slider v-model="volume" :min="0" :max="100" :show-tooltip="false" />
          <div class="num-row">
            <el-input-number v-model="volume" :min="0" :max="100" size="small" controls-position="right" />
            <span class="unit">%</span>
          </div>
        </db-group-box>
        <db-group-box title="音调" class="blk">
          <el-slider v-model="pitch" :min="50" :max="150" :show-tooltip="false" />
          <div class="num-row">
            <el-input-number v-model="pitch" :min="50" :max="150" size="small" controls-position="right" />
            <span class="unit">%</span>
          </div>
        </db-group-box>
        <db-group-box title="声像">
          <el-slider v-model="pan" :min="-100" :max="100" :show-tooltip="false" />
          <div class="num-row">
            <el-input-number v-model="pan" :min="-100" :max="100" size="small" controls-position="right" />
          </div>
        </db-group-box>
        <el-button size="small" class="audio-reset" @click="resetParams">重置音量/音调/声像</el-button>
      </div>
    </div>
    <template #footer>
      <el-button v-if="tester" @click="close">关闭</el-button>
      <template v-else>
        <el-button @click="close">取消</el-button>
        <el-button type="primary" @click="confirm">确定</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import { loadSettings, saveSettings } from '@/utils/appSettings'
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'

const AUDIO_EXT = ['.ogg', '.m4a', '.mp3', '.wav']
const NONE_ROW = { name: '', label: '(无)' }
const PEAK_BINS = 320
const waveCache = new Map()

function buildPeaks(audioBuffer, bins) {
  const ch = audioBuffer.getChannelData(0)
  const len = ch.length
  const peaks = new Float32Array(bins)
  const block = Math.max(1, Math.floor(len / bins))
  const step = block > 64 ? 4 : 1
  for (let i = 0; i < bins; i++) {
    const start = i * block
    const end = Math.min(len, start + block)
    let max = 0
    for (let j = start; j < end; j += step) {
      const a = Math.abs(ch[j])
      if (a > max) max = a
    }
    peaks[i] = max
  }
  return peaks
}

export default {
  name: 'AudioFilePickerDialog',
  components: { DbGroupBox },
  props: {
    modelValue: { type: Boolean, default: false },
    /** bgm | bgs | me | se */
    folder: { type: String, default: 'bgm' },
    modelName: { type: String, default: '' },
    modelVolume: { type: Number, default: 90 },
    modelPitch: { type: Number, default: 100 },
    modelPan: { type: Number, default: 0 },
    /** 覆盖默认标题 */
    dialogTitle: { type: String, default: '' },
    /** 声音测试：四个类型，只有关闭 */
    tester: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      rows: [],
      selectedName: '',
      volume: 90,
      pitch: 100,
      pan: 0,
      activeFolder: 'bgm',
      clickToPlay: !!loadSettings().audioClickToPlay,
      peaks: null,
      audioTypes: [
        { id: 'bgm', label: 'BGM' },
        { id: 'bgs', label: 'BGS' },
        { id: 'me', label: 'ME' },
        { id: 'se', label: 'SE' },
      ],
    }
  },
  created() {
    this._audioEl = null
    this._audioCtx = null
    this._decodeCtx = null
    this._panner = null
    this._sourceNode = null
    this._waveRaf = 0
    this._waveToken = 0
    this._playingName = ''
    this._onTime = () => this.drawWave()
    this._onEnded = () => {
      this.stopPlayhead()
      this.drawWave()
    }
  },
  computed: {
    audioFolder() {
      return this.tester ? this.activeFolder : (this.folder || 'bgm')
    },
    title() {
      if (this.tester) return '声音测试'
      if (this.dialogTitle) return this.dialogTitle
      const map = { bgm: 'BGM', bgs: 'BGS', me: 'ME', se: 'SE' }
      return `播放${map[this.audioFolder] || ''}`
    },
    fileRows() {
      return [NONE_ROW, ...this.rows]
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) {
          this.stopPlayback()
          return
        }
        this.volume = Number.isFinite(this.modelVolume) ? this.modelVolume : 90
        this.pitch = Number.isFinite(this.modelPitch) ? this.modelPitch : 100
        this.pan = Number.isFinite(this.modelPan) ? this.modelPan : 0
        this.selectedName = this.modelName || ''
        this.loadRows()
        this.loadWave(this.selectedName)
        this.$nextTick(() => this.scrollSelected())
      },
    },
    audioFolder() {
      if (!this.modelValue) return
      this.loadRows()
      this.$nextTick(() => this.scrollSelected())
    },
    selectedName(name) {
      this.loadWave(name)
    },
    clickToPlay(v) {
      saveSettings({ audioClickToPlay: !!v })
    },
    volume() {
      this.applyAuditionParams()
    },
    pitch() {
      this.applyAuditionParams()
    },
    pan() {
      this.applyAuditionParams()
    },
  },
  beforeUnmount() {
    this.stopPlayback()
    if (this._decodeCtx) {
      try {
        this._decodeCtx.close()
      } catch (e) {
        /* ignore */
      }
      this._decodeCtx = null
    }
  },
  methods: {
    resetParams() {
      this.volume = 90
      this.pitch = 100
      this.pan = 0
    },
    onVisible(v) {
      this.$emit('update:modelValue', v)
      if (!v) this.stopPlayback()
    },
    close() {
      this.stopPlayback()
      this.$emit('update:modelValue', false)
    },
    setFolder(id) {
      if (this.activeFolder === id) return
      this.stopPlayback()
      this.selectedName = ''
      this.peaks = null
      this.activeFolder = id
    },
    loadRows() {
      const out = []
      try {
        if (!isNw || !fs || !path) {
          this.rows = out
          return
        }
        const root = DataManager.$config && DataManager.$config.workSpace
        if (!root) {
          this.rows = out
          return
        }
        const dir = path.join(root, 'audio', this.audioFolder)
        if (!fs.existsSync(dir)) {
          this.rows = out
          return
        }
        fs.readdirSync(dir).forEach((name) => {
          const ext = path.extname(name).toLowerCase()
          if (!AUDIO_EXT.includes(ext)) return
          const abs = path.join(dir, name)
          try {
            if (!fs.statSync(abs).isFile()) return
          } catch (e) {
            return
          }
          const base = path.basename(name, ext)
          out.push({ name: base, label: base })
        })
        out.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      } catch (e) {
        console.error(e)
      }
      this.rows = out
    },
    scrollSelected() {
      const el = this.$refs.listEl
      if (!el) return
      const cur = el.querySelector('.file-row.is-current')
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center', behavior: 'auto' })
    },
    onRowClick(row) {
      this.selectedName = row.name || ''
      this.$nextTick(() => this.scrollSelected())
      if (!this.selectedName) return
      if (this.clickToPlay) this.playAudition()
    },
    onRowDbl(row) {
      this.selectedName = row.name || ''
      if (this.selectedName) this.playAudition()
    },
    resolveAudioAbsPath(name) {
      if (!name || !isNw || !fs || !path) return ''
      const root = DataManager.$config && DataManager.$config.workSpace
      if (!root) return ''
      const base = path.join(root, 'audio', this.audioFolder, name)
      for (const ext of AUDIO_EXT) {
        const p = base + ext
        if (fs.existsSync(p)) return p
      }
      if (fs.existsSync(base)) return base
      return ''
    },
    readAudioBuffer(absPath) {
      if (isNw && fs && fs.readFileSync) {
        const buf = fs.readFileSync(absPath)
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      }
      return fetch(this.toFileUrl(absPath)).then((res) => res.arrayBuffer())
    },
    toFileUrl(absPath) {
      if (!absPath) return ''
      const normalized = String(absPath).replace(/\\/g, '/')
      if (normalized.startsWith('file:')) return normalized
      return 'file:///' + normalized.replace(/^\/+/, '')
    },
    ensureAudioGraph(el) {
      if (!el) return
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      if (!this._audioCtx) this._audioCtx = new AC()
      if (this._audioCtx.state === 'suspended') {
        try {
          this._audioCtx.resume()
        } catch (e) {
          /* ignore */
        }
      }
      if (!this._sourceNode) {
        try {
          this._sourceNode = this._audioCtx.createMediaElementSource(el)
          if (typeof this._audioCtx.createStereoPanner === 'function') {
            this._panner = this._audioCtx.createStereoPanner()
            this._sourceNode.connect(this._panner)
            this._panner.connect(this._audioCtx.destination)
          } else {
            this._sourceNode.connect(this._audioCtx.destination)
          }
        } catch (e) {
          console.warn(e)
        }
      }
    },
    teardownAudioGraph() {
      try {
        if (this._sourceNode) this._sourceNode.disconnect()
      } catch (e) {
        /* ignore */
      }
      try {
        if (this._panner) this._panner.disconnect()
      } catch (e) {
        /* ignore */
      }
      this._sourceNode = null
      this._panner = null
      if (this._audioCtx) {
        try {
          this._audioCtx.close()
        } catch (e) {
          /* ignore */
        }
        this._audioCtx = null
      }
    },
    ensureDecodeCtx() {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      if (!this._decodeCtx) this._decodeCtx = new AC()
      return this._decodeCtx
    },
    applyAuditionParams() {
      const el = this._audioEl
      if (!el) return
      el.volume = Math.max(0, Math.min(1, (Number(this.volume) || 0) / 100))
      try {
        el.playbackRate = Math.max(0.5, Math.min(1.5, (Number(this.pitch) || 100) / 100))
      } catch (e) {
        /* ignore */
      }
      if (this._panner) {
        this._panner.pan.value = Math.max(-1, Math.min(1, (Number(this.pan) || 0) / 100))
      }
    },
    async loadWave(name) {
      const token = ++this._waveToken
      if (!name) {
        this.peaks = null
        this.$nextTick(() => this.drawWave())
        return
      }
      const abs = this.resolveAudioAbsPath(name)
      if (!abs) {
        this.peaks = null
        this.$nextTick(() => this.drawWave())
        return
      }
      if (waveCache.has(abs)) {
        if (token !== this._waveToken) return
        this.peaks = waveCache.get(abs)
        this.$nextTick(() => this.drawWave())
        return
      }
      try {
        const raw = await this.readAudioBuffer(abs)
        const ctx = this.ensureDecodeCtx()
        if (!ctx) return
        const audioBuf = await ctx.decodeAudioData(raw.slice(0))
        const peaks = buildPeaks(audioBuf, PEAK_BINS)
        waveCache.set(abs, peaks)
        if (token !== this._waveToken || this.selectedName !== name) return
        this.peaks = peaks
        this.$nextTick(() => this.drawWave())
      } catch (e) {
        console.warn(e)
        if (token !== this._waveToken) return
        this.peaks = null
        this.$nextTick(() => this.drawWave())
      }
    },
    drawWave() {
      const canvas = this.$refs.wave
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth || 220
      const h = canvas.clientHeight || 56
      const pw = Math.max(1, Math.floor(w * dpr))
      const ph = Math.max(1, Math.floor(h * dpr))
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#f4f6f8'
      ctx.fillRect(0, 0, w, h)
      const peaks = this.peaks
      if (peaks && peaks.length) {
        ctx.fillStyle = '#5b7c99'
        const mid = h / 2
        const barW = w / peaks.length
        for (let i = 0; i < peaks.length; i++) {
          const amp = Math.max(1, peaks[i] * (mid - 2))
          ctx.fillRect(i * barW, mid - amp, Math.max(1, barW - 0.3), amp * 2)
        }
      }
      const el = this._audioEl
      if (el && this._playingName === this.selectedName && el.duration && Number.isFinite(el.duration) && !el.paused) {
        const x = Math.max(0, Math.min(w - 1, (el.currentTime / el.duration) * w))
        ctx.fillStyle = '#e67e22'
        ctx.fillRect(x, 0, 2, h)
      }
    },
    startPlayhead() {
      this.stopPlayhead()
      const tick = () => {
        this.drawWave()
        const el = this._audioEl
        if (el && !el.paused && !el.ended) {
          this._waveRaf = requestAnimationFrame(tick)
        }
      }
      this._waveRaf = requestAnimationFrame(tick)
    },
    stopPlayhead() {
      if (this._waveRaf) {
        cancelAnimationFrame(this._waveRaf)
        this._waveRaf = 0
      }
    },
    playAudition(startRatio) {
      const name = this.selectedName
      if (!name) return
      const abs = this.resolveAudioAbsPath(name)
      if (!abs) return
      this.stopPlayback()
      const el = new Audio()
      el.preload = 'auto'
      el.src = this.toFileUrl(abs)
      this._audioEl = el
      this._playingName = name
      el.addEventListener('timeupdate', this._onTime)
      el.addEventListener('ended', this._onEnded)
      this.ensureAudioGraph(el)
      this.applyAuditionParams()
      const begin = () => {
        if (startRatio != null && el.duration && Number.isFinite(el.duration)) {
          const t = Math.max(0, Math.min(el.duration, Number(startRatio) * el.duration))
          try {
            el.currentTime = t
          } catch (e) {
            /* ignore */
          }
        }
        el.play().then(() => this.startPlayhead()).catch((e) => console.warn(e))
      }
      if (el.readyState >= 1) begin()
      else el.addEventListener('loadedmetadata', begin, { once: true })
    },
    onWaveClick(e) {
      if (!this.selectedName || !this.peaks) return
      const canvas = this.$refs.wave
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (!rect.width) return
      const ratio = Math.max(0, Math.min(0.999, (e.clientX - rect.left) / rect.width))
      const el = this._audioEl
      if (el && this._playingName === this.selectedName && el.duration && Number.isFinite(el.duration)) {
        try {
          el.currentTime = ratio * el.duration
        } catch (err) {
          console.warn(err)
        }
        this.applyAuditionParams()
        if (el.paused || el.ended) {
          el.play().then(() => this.startPlayhead()).catch((err) => console.warn(err))
        } else {
          this.startPlayhead()
        }
        this.drawWave()
        return
      }
      this.playAudition(ratio)
    },
    stopPlayback() {
      this.stopPlayhead()
      const el = this._audioEl
      if (el) {
        el.removeEventListener('timeupdate', this._onTime)
        el.removeEventListener('ended', this._onEnded)
        try {
          el.pause()
          el.currentTime = 0
          el.removeAttribute('src')
          el.load()
        } catch (e) {
          /* ignore */
        }
      }
      this.teardownAudioGraph()
      this._audioEl = null
      this._playingName = ''
      this.drawWave()
    },
    confirm() {
      this.stopPlayback()
      this.$emit('confirm', {
        name: this.selectedName || '',
        volume: Number(this.volume) || 0,
        pitch: Number(this.pitch) || 100,
        pan: Number(this.pan) || 0,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.audio-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 10px;
}
.audio-tab {
  min-width: 64px;
  padding: 4px 12px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  cursor: pointer;
  font-size: 13px;
}
.audio-tab + .audio-tab {
  margin-left: -1px;
}
.audio-tab.active {
  background: #2a5db0;
  color: #fff;
  border-color: #2a5db0;
  position: relative;
  z-index: 1;
}
.audio-picker__extra {
  margin-bottom: 10px;
}
.audio-picker {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.audio-picker__list {
  flex: 1;
  min-width: 0;
}
.file-list {
  height: 360px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  background: #fff;
}
.file-row {
  padding: 3px 8px;
  font-size: 13px;
  line-height: 22px;
  cursor: pointer;
  user-select: none;
}
.file-row:nth-child(even) {
  background: #f2f3f5;
}
.file-row.is-current,
.file-row.is-current:nth-child(even) {
  background: #2a5db0;
  color: #fff;
}
.click-play {
  margin-top: 8px;
}
.audio-picker__side {
  width: 230px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.audio-picker__side > .el-button {
  margin-left: 0;
  width: 100%;
}
.wave {
  width: 100%;
  height: 56px;
  border: 1px solid var(--el-border-color);
  cursor: pointer;
  display: block;
}
.blk {
  margin-bottom: 0;
}
.num-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.num-row .el-input-number {
  width: 120px;
}
.unit {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.audio-reset {
  margin-top: 4px;
}
</style>
