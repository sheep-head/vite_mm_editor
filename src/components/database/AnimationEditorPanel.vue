<template>
  <div v-if="modelValue" class="anim-editor">
    <el-form size="small" label-width="88px" @submit.prevent>
      <el-form-item label="名称">
        <el-input v-model="modelValue.name" style="width: 220px" />
      </el-form-item>
      <el-form-item label="格式">
        <el-tag size="small" :type="isMz ? 'success' : 'warning'">
          {{ isMz ? 'MZ (Effekseer)' : 'MV 帧表（兼容）' }}
        </el-tag>
        <el-button v-if="!isMz" size="small" class="ml" @click="convertToMzStub">转为 MZ 空壳</el-button>
      </el-form-item>
    </el-form>

    <!-- MZ Effekseer -->
    <div v-if="isMz" class="anim-mz">
      <div class="anim-mz-main">
        <el-form size="small" label-width="88px" class="anim-mz-form">
          <el-form-item label="效果">
            <el-select
              v-model="modelValue.effectName"
              filterable
              clearable
              allow-create
              default-first-option
              placeholder="effects/*.efkefc"
              style="width: 200px">
              <el-option v-for="n in effectNames" :key="n" :label="n" :value="n" />
            </el-select>
            <el-button size="small" @click="refreshEffects">刷新</el-button>
          </el-form-item>
          <el-form-item label="显示类型">
            <el-select v-model="modelValue.displayType" style="width: 140px">
              <el-option :value="0" label="居中" />
              <el-option :value="1" label="脚底" />
              <el-option :value="2" label="头顶" />
              <el-option :value="3" label="画面" />
            </el-select>
          </el-form-item>
          <el-form-item label="缩放">
            <el-input-number v-model="modelValue.scale" :min="1" :max="999" controls-position="right" />
          </el-form-item>
          <el-form-item label="速度">
            <el-input-number v-model="modelValue.speed" :min="1" :max="999" controls-position="right" />
          </el-form-item>
          <el-form-item label="偏移 X">
            <el-input-number v-model="modelValue.offsetX" controls-position="right" />
          </el-form-item>
          <el-form-item label="偏移 Y">
            <el-input-number v-model="modelValue.offsetY" controls-position="right" />
          </el-form-item>
          <el-form-item label="旋转 X">
            <el-input-number v-model="rotationProxy.x" controls-position="right" />
          </el-form-item>
          <el-form-item label="旋转 Y">
            <el-input-number v-model="rotationProxy.y" controls-position="right" />
          </el-form-item>
          <el-form-item label="旋转 Z">
            <el-input-number v-model="rotationProxy.z" controls-position="right" />
          </el-form-item>
        </el-form>
        <effekseer-preview
          :effect-name="modelValue.effectName || ''"
          :scale="modelValue.scale || 100"
          :speed="modelValue.speed || 100"
          :offset-x="modelValue.offsetX || 0"
          :offset-y="modelValue.offsetY || 0"
          :rotation="modelValue.rotation || { x: 0, y: 0, z: 0 }" />
      </div>

      <el-divider content-position="left">闪烁时机</el-divider>
      <div class="timing-tools">
        <el-button size="small" @click="addFlashTiming">添加</el-button>
      </div>
      <el-table :data="flashTimings" size="small" max-height="180">
        <el-table-column label="帧" width="90">
          <template #default="{ row }">
            <el-input-number v-model="row.frame" :min="0" size="small" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="范围" width="110">
          <template #default="{ row }">
            <el-select v-model="row.scope" size="small">
              <el-option :value="1" label="目标" />
              <el-option :value="2" label="画面" />
              <el-option :value="3" label="消除" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="90">
          <template #default="{ row }">
            <el-input-number v-model="row.duration" :min="1" size="small" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="flashTimings.splice($index, 1)">删</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider content-position="left">SE 时机</el-divider>
      <div class="timing-tools">
        <el-button size="small" @click="addSoundTiming">添加</el-button>
      </div>
      <el-table :data="soundTimings" size="small" max-height="180">
        <el-table-column label="帧" width="90">
          <template #default="{ row }">
            <el-input-number v-model="row.frame" :min="0" size="small" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="SE" min-width="140">
          <template #default="{ row }">
            <el-input :model-value="row.se && row.se.name" size="small" readonly style="width: 100px" />
            <el-button size="small" @click="pickSeFor(row)">…</el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="soundTimings.splice($index, 1)">删</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- MV 帧兼容 -->
    <div v-else class="anim-mv">
      <div class="mv-top">
        <db-group-box title="基本设置" class="mv-basic">
          <el-form size="small" label-width="72px" @submit.prevent>
            <el-form-item label="名称">
              <el-input v-model="modelValue.name" style="width: 200px" />
            </el-form-item>
            <el-form-item label="图像1">
              <el-input v-model="modelValue.animation1Name" style="width: 140px" />
              <el-button size="small" @click="pickAnimImage(1)">…</el-button>
              <el-input-number v-model="modelValue.animation1Hue" :min="0" :max="360" size="small" controls-position="right" class="hue" />
            </el-form-item>
            <el-form-item label="图像2">
              <el-input v-model="modelValue.animation2Name" style="width: 140px" />
              <el-button size="small" @click="pickAnimImage(2)">…</el-button>
              <el-input-number v-model="modelValue.animation2Hue" :min="0" :max="360" size="small" controls-position="right" class="hue" />
            </el-form-item>
            <el-form-item label="位置">
              <el-select v-model="modelValue.position" style="width: 100px">
                <el-option :value="0" label="头上" />
                <el-option :value="1" label="中心" />
                <el-option :value="2" label="脚底" />
                <el-option :value="3" label="画面" />
              </el-select>
            </el-form-item>
            <el-form-item label="最大帧数">
              <el-input-number :model-value="frames.length" :min="1" :max="100" :controls="false" class="max-fr" />
              <el-button size="small" @click="promptMaxFrames">…</el-button>
            </el-form-item>
          </el-form>
        </db-group-box>
        <db-group-box title="SE 和闪光的时机" class="mv-timings-box">
          <div class="timing-tools">
            <el-button size="small" @click="addMvTiming">添加</el-button>
            <el-button size="small" :disabled="timingSel < 0" @click="removeMvTiming">删除</el-button>
          </div>
          <el-table
            :data="mvTimings"
            size="small"
            max-height="180"
            highlight-current-row
            @current-change="onTimingCurrent"
            @row-dblclick="editMvTiming">
            <el-table-column label="No." width="56">
              <template #default="{ row }">#{{ String((row.frame || 0) + 1).padStart(3, '0') }}</template>
            </el-table-column>
            <el-table-column label="SE" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ (row.se && row.se.name) || '' }}</template>
            </el-table-column>
            <el-table-column label="闪光" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ flashText(row) }}</template>
            </el-table-column>
          </el-table>
        </db-group-box>
      </div>

      <db-group-box title="帧" class="mt">
        <div class="mv-frame-row">
          <div class="mv-frame-list">
            <el-scrollbar max-height="320px">
              <div
                v-for="(_, i) in frames"
                :key="i"
                class="mv-frame-item"
                :class="{ active: frameIndex === i }"
                @click="frameIndex = i">
                #{{ String(i + 1).padStart(3, '0') }}
              </div>
            </el-scrollbar>
          </div>
          <div class="mv-preview-wrap">
            <canvas v-show="!playing" ref="mvCanvas" width="400" height="300" class="mv-canvas" />
            <img v-show="playing" class="mv-canvas mv-play-img" :src="playFrameSrc" alt="" width="400" height="300" />
          </div>
          <div class="mv-side-tools">
            <el-button size="small" @click="showTargetHint">更改目标…</el-button>
            <el-button size="small" :disabled="frameIndex <= 0 || playing" @click="copyPrevFrame">继承上帧</el-button>
            <el-button size="small" :disabled="playing" @click="copyFrameRange">批量复制…</el-button>
            <el-button size="small" type="primary" :disabled="playing" @click="playMvPreview">播放</el-button>
            <el-button size="small" :disabled="!playing" @click="stopPlay">停止</el-button>
            <el-divider />
            <div class="cell-tools">单元格</div>
            <el-button size="small" @click="addCell">添加格</el-button>
          </div>
          <div class="mv-cells">
            <el-table :data="currentCells" size="small" max-height="300" @row-click="onCellRow">
              <el-table-column label="图案" width="70">
                <template #default="{ row }">
                  <el-input-number v-model="row[0]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="X" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[1]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="Y" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[2]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="缩放" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[3]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="旋转" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[4]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="镜" width="50">
                <template #default="{ row }">
                  <el-checkbox :model-value="!!row[5]" @update:model-value="(v) => (row[5] = v ? 1 : 0)" />
                </template>
              </el-table-column>
              <el-table-column label="不透明" width="70">
                <template #default="{ row }">
                  <el-input-number v-model="row[6]" :min="0" :max="255" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="" width="48">
                <template #default="{ $index }">
                  <el-button link type="danger" size="small" @click="currentCells.splice($index, 1)">删</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </db-group-box>
    </div>

    <el-dialog v-model="timingDlg" title="SE / 闪光时机" width="420px" append-to-body :close-on-click-modal="false">
      <el-form v-if="timingDraft" size="small" label-width="88px">
        <el-form-item label="帧">
          <el-input-number v-model="timingDraft.frame" :min="0" :max="Math.max(0, frames.length - 1)" controls-position="right" />
        </el-form-item>
        <el-form-item label="SE">
          <el-input :model-value="timingDraft.se && timingDraft.se.name" readonly style="width: 140px" />
          <el-button size="small" @click="pickSeFor(timingDraft)">…</el-button>
          <el-button size="small" link @click="clearSe">清除</el-button>
        </el-form-item>
        <el-form-item v-if="timingDraft.se" label="音量">
          <el-input-number v-model="timingDraft.se.volume" :min="0" :max="100" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="timingDraft.se" label="音调">
          <el-input-number v-model="timingDraft.se.pitch" :min="50" :max="150" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="timingDraft.se" label="声像">
          <el-input-number v-model="timingDraft.se.pan" :min="-100" :max="100" controls-position="right" />
        </el-form-item>
        <el-form-item label="闪光范围">
          <el-select v-model="timingDraft.flashScope" style="width: 120px">
            <el-option :value="0" label="无" />
            <el-option :value="1" label="目标" />
            <el-option :value="2" label="画面" />
            <el-option :value="3" label="消除目标" />
          </el-select>
        </el-form-item>
        <el-form-item label="闪光时长">
          <el-input-number v-model="timingDraft.flashDuration" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="闪光颜色">
          <el-input-number v-model="timingDraft.flashColor[0]" :min="0" :max="255" controls-position="right" class="c4" />
          <el-input-number v-model="timingDraft.flashColor[1]" :min="0" :max="255" controls-position="right" class="c4" />
          <el-input-number v-model="timingDraft.flashColor[2]" :min="0" :max="255" controls-position="right" class="c4" />
          <el-input-number v-model="timingDraft.flashColor[3]" :min="0" :max="255" controls-position="right" class="c4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="timingDlg = false">取消</el-button>
        <el-button type="primary" @click="confirmTiming">确定</el-button>
      </template>
    </el-dialog>

    <audio-file-picker-dialog
      v-model="sePickerVisible"
      folder="se"
      :model-name="sePickerName"
      :model-volume="sePickerVolume"
      :model-pitch="sePickerPitch"
      :model-pan="sePickerPan"
      @confirm="onSePicked" />

    <el-dialog v-model="animImgPickerVisible" title="选择动画图像" width="420px" append-to-body :close-on-click-modal="false">
      <el-input v-model="animImgQuery" size="small" clearable placeholder="搜索" class="mb" />
      <el-scrollbar max-height="320px">
        <div
          v-for="n in filteredAnimImages"
          :key="n"
          class="anim-img-item"
          @click="confirmAnimImage(n)">
          {{ n }}
        </div>
      </el-scrollbar>
    </el-dialog>
  </div>
</template>

<script>
import { defineAsyncComponent, markRaw } from 'vue'
import {
  listEffectNames,
  listImageNames,
  imageAbsPath,
  loadImageFile,
  animationSheetLayout,
} from '@/utils/imgAssets'
import DbGroupBox from './shared/DbGroupBox.vue'
import AudioFilePickerDialog from '@/components/map/pickers/AudioFilePickerDialog.vue'

/** MV 优先：有 frames 数组一律按 MV，避免 displayType:0 空壳误挂 Effekseer 导致 STATUS_BREAKPOINT */
function isMzAnimation(rec) {
  if (!rec) return false
  if (Array.isArray(rec.frames)) return false
  if (rec.animation1Name || rec.animation2Name) return false
  if (Array.isArray(rec.timings) && rec.timings.length > 0) return false
  if (rec.effectName) return true
  if (typeof rec.displayType === 'number') return true
  if (Array.isArray(rec.flashTimings) && rec.flashTimings.length) return true
  if (Array.isArray(rec.soundTimings) && rec.soundTimings.length) return true
  return false
}

function ensureMzShape(rec) {
  if (!rec.rotation) rec.rotation = { x: 0, y: 0, z: 0 }
  if (rec.scale == null) rec.scale = 100
  if (rec.speed == null) rec.speed = 100
  if (rec.offsetX == null) rec.offsetX = 0
  if (rec.offsetY == null) rec.offsetY = 0
  if (rec.displayType == null) rec.displayType = 0
  if (!Array.isArray(rec.flashTimings)) rec.flashTimings = []
  if (!Array.isArray(rec.soundTimings)) rec.soundTimings = []
  if (rec.effectName == null) rec.effectName = ''
}

function ensureMvShape(rec) {
  // 注意：勿在 length===0 时重建，computed 里调用会触发无限更新
  if (!Array.isArray(rec.frames)) {
    rec.frames = Array.from({ length: 10 }, () => [])
  }
  if (!Array.isArray(rec.timings)) rec.timings = []
  if (rec.animation1Name == null) rec.animation1Name = ''
  if (rec.animation2Name == null) rec.animation2Name = ''
  if (rec.animation1Hue == null) rec.animation1Hue = 0
  if (rec.animation2Hue == null) rec.animation2Hue = 0
  if (rec.position == null) rec.position = 1
}

export default {
  name: 'AnimationEditorPanel',
  components: {
    // 异步加载，MV 条目不拉 Effekseer/WebGL
    EffekseerPreview: defineAsyncComponent(() => import('./EffekseerPreview.vue')),
    DbGroupBox,
    AudioFilePickerDialog,
  },
  props: {
    modelValue: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      effectNames: [],
      frameIndex: 0,
      sePickerVisible: false,
      seTarget: null,
      sePickerName: '',
      sePickerVolume: 90,
      sePickerPitch: 100,
      sePickerPan: 0,
      animImgPickerVisible: false,
      animImgTarget: 1,
      animImgQuery: '',
      animImages: [],
      timingSel: -1,
      timingDlg: false,
      timingDraft: null,
      timingEditIndex: -1,
      playing: false,
      playFrameSrc: '',
      showTarget: true,
    }
  },
  created() {
    // Image / timer / offscreen canvas 禁止进 data()
    this._img1 = null
    this._img2 = null
    this._playTimer = 0
    this._playGen = 0
    this._paintScheduled = false
    this._ctx2d = null
    this._playUrls = []
  },
  computed: {
    isMz() {
      return isMzAnimation(this.modelValue)
    },
    rotationProxy() {
      const rec = this.modelValue
      if (!rec) return { x: 0, y: 0, z: 0 }
      if (!rec.rotation) rec.rotation = { x: 0, y: 0, z: 0 }
      return rec.rotation
    },
    flashTimings() {
      if (!this.modelValue || !Array.isArray(this.modelValue.flashTimings)) return []
      return this.modelValue.flashTimings
    },
    soundTimings() {
      if (!this.modelValue || !Array.isArray(this.modelValue.soundTimings)) return []
      return this.modelValue.soundTimings
    },
    frames() {
      if (!this.modelValue) return []
      return Array.isArray(this.modelValue.frames) ? this.modelValue.frames : []
    },
    currentCells() {
      const f = this.frames[this.frameIndex]
      return Array.isArray(f) ? f : []
    },
    mvTimings() {
      if (!this.modelValue || !Array.isArray(this.modelValue.timings)) return []
      return this.modelValue.timings
    },
    filteredAnimImages() {
      const q = (this.animImgQuery || '').trim().toLowerCase()
      if (!q) return this.animImages
      return this.animImages.filter((n) => n.toLowerCase().includes(q))
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        if (isMzAnimation(v)) ensureMzShape(v)
        else ensureMvShape(v)
        this.stopPlay()
        this.frameIndex = 0
        this.refreshEffects()
        this.$nextTick(() => {
          this.loadMvImages().then(() => this.schedulePaint())
        })
      },
    },
    frameIndex() {
      if (!this.playing) this.schedulePaint()
    },
    'modelValue.animation1Name'() {
      this.loadMvImages().then(() => this.schedulePaint())
    },
    'modelValue.animation2Name'() {
      this.loadMvImages().then(() => this.schedulePaint())
    },
    currentCells: {
      deep: true,
      handler() {
        if (!this.playing) this.schedulePaint()
      },
    },
  },
  methods: {
    refreshEffects() {
      this.effectNames = listEffectNames()
    },
    convertToMzStub() {
      if (!this.modelValue) return
      if (!window.confirm('将清空 MV 帧数据并改为 MZ Effekseer 结构，继续？')) return
      const id = this.modelValue.id
      const name = this.modelValue.name
      Object.keys(this.modelValue).forEach((k) => {
        if (k !== 'id' && k !== 'name') delete this.modelValue[k]
      })
      this.modelValue.id = id
      this.modelValue.name = name
      ensureMzShape(this.modelValue)
    },
    addFlashTiming() {
      if (!this.modelValue) return
      if (!Array.isArray(this.modelValue.flashTimings)) this.modelValue.flashTimings = []
      this.modelValue.flashTimings.push({
        frame: 0,
        scope: 1,
        color: [255, 255, 255, 255],
        duration: 5,
      })
    },
    addSoundTiming() {
      if (!this.modelValue) return
      if (!Array.isArray(this.modelValue.soundTimings)) this.modelValue.soundTimings = []
      this.modelValue.soundTimings.push({
        frame: 0,
        se: { name: '', volume: 90, pitch: 100, pan: 0 },
      })
    },
    pickSeFor(row) {
      this.seTarget = row
      if (row && !row.se) row.se = { name: '', volume: 90, pitch: 100, pan: 0 }
      const se = row.se || {}
      this.sePickerName = se.name || ''
      this.sePickerVolume = Number.isFinite(se.volume) ? se.volume : 90
      this.sePickerPitch = Number.isFinite(se.pitch) ? se.pitch : 100
      this.sePickerPan = Number.isFinite(se.pan) ? se.pan : 0
      this.sePickerVisible = true
    },
    onSePicked(audio) {
      if (!this.seTarget) return
      const obj = audio && typeof audio === 'object'
        ? audio
        : { name: audio || '', volume: 90, pitch: 100, pan: 0 }
      this.seTarget.se = {
        name: obj.name || '',
        volume: Number.isFinite(obj.volume) ? obj.volume : 90,
        pitch: Number.isFinite(obj.pitch) ? obj.pitch : 100,
        pan: Number.isFinite(obj.pan) ? obj.pan : 0,
      }
    },
    promptMaxFrames() {
      const cur = this.frames.length
      const input = window.prompt('最大帧数 (1–100)', String(cur))
      if (input == null) return
      const n = Math.max(1, Math.min(100, parseInt(input, 10) || cur))
      if (n === cur) return
      if (n < cur) {
        if (!window.confirm(`将删除第 ${n + 1}～${cur} 帧，继续？`)) return
        this.modelValue.frames.length = n
      } else {
        while (this.modelValue.frames.length < n) this.modelValue.frames.push([])
      }
      this.frameIndex = Math.min(this.frameIndex, n - 1)
    },
    addCell() {
      if (!this.modelValue || !Array.isArray(this.modelValue.frames)) return
      let f = this.modelValue.frames[this.frameIndex]
      if (!Array.isArray(f)) {
        f = []
        this.modelValue.frames[this.frameIndex] = f
      }
      f.push([0, 0, 0, 100, 0, 0, 255, 1])
      this.schedulePaint()
    },
    onCellRow() {
      this.schedulePaint()
    },
    pickAnimImage(which) {
      this.animImgTarget = which
      this.animImages = listImageNames('animations')
      this.animImgQuery = ''
      this.animImgPickerVisible = true
    },
    confirmAnimImage(n) {
      if (this.animImgTarget === 1) this.modelValue.animation1Name = n
      else this.modelValue.animation2Name = n
      this.animImgPickerVisible = false
    },
    flashText(row) {
      if (!row || !row.flashScope) return ''
      const scope = { 1: '目标', 2: '画面', 3: '消除' }[row.flashScope] || ''
      const c = row.flashColor || [255, 255, 255, 255]
      return `${scope}(${c.join(',')}), ${row.flashDuration || 0}帧`
    },
    onTimingCurrent(row) {
      this.timingSel = row ? this.mvTimings.indexOf(row) : -1
    },
    addMvTiming() {
      this.timingEditIndex = -1
      this.timingDraft = {
        frame: this.frameIndex,
        se: { name: '', volume: 90, pitch: 100, pan: 0 },
        flashScope: 0,
        flashColor: [255, 255, 255, 255],
        flashDuration: 5,
      }
      this.timingDlg = true
    },
    editMvTiming(row) {
      this.timingEditIndex = this.mvTimings.indexOf(row)
      const se = row.se ? { ...row.se } : null
      this.timingDraft = {
        frame: row.frame || 0,
        se,
        flashScope: row.flashScope || 0,
        flashColor: (row.flashColor || [255, 255, 255, 255]).slice(),
        flashDuration: row.flashDuration || 5,
      }
      this.timingDlg = true
    },
    removeMvTiming() {
      if (this.timingSel < 0) return
      this.mvTimings.splice(this.timingSel, 1)
      this.timingSel = -1
    },
    clearSe() {
      if (this.timingDraft) this.timingDraft.se = null
    },
    confirmTiming() {
      const t = {
        frame: this.timingDraft.frame || 0,
        se: this.timingDraft.se && this.timingDraft.se.name ? { ...this.timingDraft.se } : null,
        flashScope: this.timingDraft.flashScope || 0,
        flashColor: (this.timingDraft.flashColor || [255, 255, 255, 255]).slice(),
        flashDuration: this.timingDraft.flashDuration || 5,
      }
      if (this.timingEditIndex >= 0) this.mvTimings[this.timingEditIndex] = t
      else this.mvTimings.push(t)
      this.timingDlg = false
    },
    showTargetHint() {
      this.showTarget = !this.showTarget
      this.paintMvFrame()
    },
    copyPrevFrame() {
      if (this.frameIndex <= 0) return
      const prev = this.frames[this.frameIndex - 1] || []
      this.frames[this.frameIndex] = JSON.parse(JSON.stringify(prev))
      this.paintMvFrame()
    },
    copyFrameRange() {
      const to = window.prompt('复制当前帧到结束帧号 (1-based)', String(this.frames.length))
      if (to == null) return
      const end = Math.max(this.frameIndex + 1, Math.min(this.frames.length, parseInt(to, 10) || 0)) - 1
      const src = JSON.parse(JSON.stringify(this.frames[this.frameIndex] || []))
      for (let i = this.frameIndex + 1; i <= end; i++) this.frames[i] = JSON.parse(JSON.stringify(src))
      this.$message.success(`已复制到 #${String(end + 1).padStart(3, '0')}`)
    },
    async loadMvImages() {
      this._img1 = null
      this._img2 = null
      if (!this.modelValue) return
      if (this.modelValue.animation1Name) {
        const img = await loadImageFile(imageAbsPath('animations', this.modelValue.animation1Name))
        this._img1 = img ? markRaw(img) : null
      }
      if (this.modelValue.animation2Name) {
        const img = await loadImageFile(imageAbsPath('animations', this.modelValue.animation2Name))
        this._img2 = img ? markRaw(img) : null
      }
    },
    schedulePaint() {
      if (this._paintScheduled || this.playing) return
      this._paintScheduled = true
      requestAnimationFrame(() => {
        this._paintScheduled = false
        if (!this.playing) this.paintMvFrame()
      })
    },
    stopPlay() {
      this._playGen = (this._playGen || 0) + 1
      if (this._playTimer) {
        clearTimeout(this._playTimer)
        this._playTimer = 0
      }
      this.playing = false
      this.playFrameSrc = ''
      this._playUrls = []
      this.$nextTick(() => this.schedulePaint())
    },
    /** 离屏 canvas 画一帧，不碰 Vue 托管的 canvas */
    renderFrameToOffscreen(cells, w = 400, h = 300) {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.fillStyle = '#1a2744'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(100,140,200,0.25)'
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      if (this.showTarget) {
        ctx.strokeStyle = '#7ec8e3'
        ctx.strokeRect(w / 2 - 24, h / 2 - 40, 48, 80)
      }
      this.drawCellsOnCtx(ctx, cells, w, h)
      try {
        return canvas.toDataURL('image/png')
      } catch (e) {
        console.error('[anim bake]', e)
        return ''
      }
    },
    drawCellsOnCtx(ctx, cells, w, h) {
      if (!ctx || !Array.isArray(cells)) return
      for (const cell of cells) {
        if (!cell || !Array.isArray(cell)) continue
        let pattern = Number(cell[0])
        if (!Number.isFinite(pattern) || pattern < 0) continue
        let img = this._img1
        if (pattern >= 100) {
          img = this._img2
          pattern -= 100
        }
        if (!img || !img.width || !img.height) continue
        const layout = animationSheetLayout(img)
        const cellSize = layout.cell || img.height
        if (!(cellSize > 0) || !(layout.cols > 0)) continue
        const maxPattern = layout.cols * Math.max(1, Math.floor(img.height / cellSize)) - 1
        if (pattern > maxPattern) continue
        const col = pattern % layout.cols
        const row = Math.floor(pattern / layout.cols)
        const sx = col * cellSize
        const sy = row * cellSize
        if (sx + cellSize > img.width + 0.5 || sy + cellSize > img.height + 0.5) continue
        const scale = Math.max(0.01, (Number(cell[3]) || 100) / 100)
        const dw = cellSize * scale
        const dh = cellSize * scale
        if (!Number.isFinite(dw) || !Number.isFinite(dh) || dw < 1 || dh < 1) continue
        const dx = w / 2 + (Number(cell[1]) || 0)
        const dy = h / 2 + (Number(cell[2]) || 0)
        ctx.save()
        const opacity = cell[6] != null ? Number(cell[6]) : 255
        ctx.globalAlpha = Math.max(0, Math.min(1, (Number.isFinite(opacity) ? opacity : 255) / 255))
        ctx.translate(dx, dy)
        const rot = Number(cell[4]) || 0
        if (rot) ctx.rotate((rot * Math.PI) / 180)
        if (cell[5]) ctx.scale(-1, 1)
        try {
          ctx.drawImage(img, sx, sy, cellSize, cellSize, -dw / 2, -dh / 2, dw, dh)
        } catch (e) {
          /* skip bad cell */
        }
        ctx.restore()
      }
    },
    async playMvPreview() {
      if (this._playTimer) {
        clearTimeout(this._playTimer)
        this._playTimer = 0
      }
      const gen = (this._playGen || 0) + 1
      this._playGen = gen
      try {
        await this.loadMvImages()
        if (gen !== this._playGen) return
        const frames = this.frames
        if (!frames.length) {
          this.$message.warning('没有可播放的帧')
          return
        }
        // 先全部烘焙成 dataURL，播放时只换 <img src>，避免定时器里反复 drawImage
        const urls = []
        const emptyUrl = this.renderFrameToOffscreen([])
        for (let i = 0; i < frames.length; i++) {
          if (gen !== this._playGen) return
          const cells = Array.isArray(frames[i]) ? frames[i] : []
          if (!cells.length) {
            urls.push(emptyUrl)
          } else {
            const plain = cells.map((c) => (Array.isArray(c) ? c.slice() : c))
            urls.push(this.renderFrameToOffscreen(plain))
          }
          // 让出一帧，降低连续 GPU 调用触发原生崩溃的概率
          await new Promise((r) => requestAnimationFrame(r))
        }
        this._playUrls = urls
        this.playing = true
        let i = 0
        const step = () => {
          if (gen !== this._playGen) return
          this.playFrameSrc = urls[i] || ''
          i += 1
          if (i >= urls.length) {
            this.frameIndex = frames.length - 1
            this.playing = false
            this.playFrameSrc = ''
            this._playTimer = 0
            this.$nextTick(() => this.schedulePaint())
            return
          }
          this._playTimer = setTimeout(step, 1000 / 15)
        }
        step()
      } catch (e) {
        console.error('[anim play]', e)
        if (gen === this._playGen) {
          this.stopPlay()
          this.$message.error('播放失败（已阻止原生崩溃路径，请看控制台）')
        }
      }
    },
    getCtx() {
      const canvas = this.$refs.mvCanvas
      if (!canvas || this.isMz || this.playing) return null
      if (!this._ctx2d || this._ctx2d.canvas !== canvas) {
        this._ctx2d = canvas.getContext('2d', { willReadFrequently: false })
      }
      return this._ctx2d
    },
    paintMvFrame() {
      if (this.playing) return
      try {
        const canvas = this.$refs.mvCanvas
        const ctx = this.getCtx()
        if (!canvas || !ctx) return
        const w = canvas.width
        const h = canvas.height
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = 1
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = '#1a2744'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = 'rgba(100,140,200,0.25)'
        for (let x = 0; x < w; x += 32) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        for (let y = 0; y < h; y += 32) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }
        if (this.showTarget) {
          ctx.strokeStyle = '#7ec8e3'
          ctx.strokeRect(w / 2 - 24, h / 2 - 40, 48, 80)
        }
        const cells = this.currentCells
        const plain = Array.isArray(cells) ? cells.map((c) => (Array.isArray(c) ? c.slice() : c)) : []
        this.drawCellsOnCtx(ctx, plain, w, h)
      } catch (e) {
        console.error('[anim paint]', e)
      }
    },
  },
  beforeUnmount() {
    this.stopPlay()
    this._img1 = null
    this._img2 = null
    this._ctx2d = null
    this._playUrls = []
  },
}
</script>

<style scoped>
.anim-editor {
  width: 100%;
  max-width: 1100px;
}
.anim-mz-main {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}
.anim-mz-form {
  flex: 1;
  min-width: 280px;
}
.ml {
  margin-left: 8px;
}
.mt {
  margin-top: 10px;
}
.timing-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.mv-top {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.mv-basic {
  flex: 1;
  min-width: 280px;
}
.mv-timings-box {
  flex: 1;
  min-width: 280px;
}
.hue {
  width: 88px;
  margin-left: 4px;
}
.max-fr {
  width: 72px;
}
.mv-frame-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.mv-frame-list {
  width: 72px;
}
.mv-frame-item {
  padding: 4px 6px;
  cursor: pointer;
  font-size: 12px;
  border: 1px solid var(--app-border);
  margin-bottom: 2px;
  text-align: center;
}
.mv-frame-item.active {
  background: var(--el-color-primary-light-7, #c6e2ff);
}
.mv-preview-wrap {
  width: 400px;
  height: 300px;
  flex-shrink: 0;
}
.mv-canvas {
  border: 1px solid var(--app-border);
  background: #1a2744;
  display: block;
  width: 400px;
  height: 300px;
}
.mv-play-img {
  object-fit: contain;
  image-rendering: pixelated;
}
.mv-side-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 110px;
}
.cell-tools {
  font-size: 12px;
  color: var(--app-text-muted);
}
.mv-cells {
  flex: 1;
  min-width: 320px;
}
.anim-img-item {
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}
.anim-img-item:hover {
  background: var(--app-hover-bg);
}
.mb {
  margin-bottom: 8px;
}
.c4 {
  width: 72px;
  margin-right: 4px;
}
</style>
