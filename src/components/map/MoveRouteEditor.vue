<template>
  <el-dialog
    :model-value="modelValue"
    title="设置移动路线"
    width="760px"
    top="6vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="mr">
      <div class="mr-left">
        <el-select v-if="showTarget" v-model="targetId" size="small" class="mr-target">
          <el-option :value="-1" label="玩家" />
          <el-option :value="0" label="本事件" />
          <el-option
            v-for="ev in mapEvents"
            :key="ev.id"
            :value="ev.id"
            :label="`${String(ev.id).padStart(3, '0')} ${ev.name || '(无名称)'}`" />
        </el-select>
        <div
          ref="listEl"
          class="mr-list"
          tabindex="0"
          @keydown="onListKey"
          @contextmenu.prevent="onContextMenu">
          <div
            v-for="(step, i) in displaySteps"
            :key="i"
            class="mr-row"
            :class="{ active: isSelected(i) }"
            @click="onRowClick(i, $event)"
            @dblclick="activateRow(i)">
            <span class="mr-mark">◇</span>
            <span>{{ stepLabel(step) }}</span>
          </div>
        </div>
        <el-button size="small" :disabled="!previewMapId" @click="previewVisible = true">预览...</el-button>
        <fieldset class="mr-opts">
          <legend>选项</legend>
          <el-checkbox v-model="repeat">循环执行</el-checkbox>
          <el-checkbox v-model="skippable">无法移动时跳过指令</el-checkbox>
          <el-checkbox v-if="showWait" v-model="wait">等待完成</el-checkbox>
        </fieldset>
      </div>
      <div class="mr-right">
        <div class="mr-cols">
          <div v-for="(col, ci) in buttonCols" :key="ci" class="mr-col">
            <el-button
              v-for="b in col"
              :key="b.code + b.label"
              size="small"
              class="mr-btn"
              @click="addCommand(b)">
              {{ b.label }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>

    <popup-context-menu
      menu-class="mr-ctx"
      :visible="menu.visible"
      :x="menu.x"
      :y="menu.y"
      @update:visible="(v) => (menu.visible = v)">
      <template #default="{ action }">
        <li :class="{ disabled: !canEdit }" @click="action(editSelected)">
          <span>编辑...</span><span class="sc">Space</span>
        </li>
        <li class="sep" />
        <li :class="{ disabled: !canCopy }" @click="action(cutSelected)">
          <span>剪切</span><span class="sc">Ctrl+X</span>
        </li>
        <li :class="{ disabled: !canCopy }" @click="action(copySelected)">
          <span>复制</span><span class="sc">Ctrl+C</span>
        </li>
        <li :class="{ disabled: !clipboard.length }" @click="action(pasteClipboard)">
          <span>粘贴</span><span class="sc">Ctrl+V</span>
        </li>
        <li :class="{ disabled: !canCopy }" @click="action(deleteSelected)">
          <span>删除</span><span class="sc">Del</span>
        </li>
        <li @click="action(selectAll)">
          <span>全选</span><span class="sc">Ctrl+A</span>
        </li>
        <li class="sep" />
        <li @click="action(insertBlank)">插入</li>
        <li :class="{ disabled: !canMove(-1) }" @click="action(() => moveSelected(-1))">上移</li>
        <li :class="{ disabled: !canMove(1) }" @click="action(() => moveSelected(1))">下移</li>
      </template>
    </popup-context-menu>

    <el-dialog v-model="paramDlg" :title="paramTitle" width="360px" append-to-body :close-on-click-modal="false">
      <el-form size="small" label-width="88px">
        <el-form-item v-if="paramKind === 'jump'" label="X">
          <el-input-number v-model="paramDraft.x" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="paramKind === 'jump'" label="Y">
          <el-input-number v-model="paramDraft.y" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="paramKind === 'wait'" label="帧数">
          <el-input-number v-model="paramDraft.n" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="paramKind === 'switch'" label="开关">
          <id-name-field v-model="paramDraft.n" type="switch" width="200px" />
        </el-form-item>
        <el-form-item v-if="paramKind === 'speed'" label="移动速度">
          <el-select v-model="paramDraft.n" style="width: 180px">
            <el-option v-for="o in speedOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="paramKind === 'freq'" label="移动频率">
          <el-select v-model="paramDraft.n" style="width: 180px">
            <el-option v-for="o in freqOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="paramKind === 'opacity'" label="不透明度">
          <el-input-number v-model="paramDraft.n" :min="0" :max="255" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="paramKind === 'blend'" label="合成">
          <el-select v-model="paramDraft.n" style="width: 140px">
            <el-option :value="0" label="普通" />
            <el-option :value="1" label="加法" />
            <el-option :value="2" label="乘法" />
            <el-option :value="3" label="屏幕" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="paramKind === 'script'" label="脚本">
          <el-input v-model="paramDraft.text" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paramDlg = false">取消</el-button>
        <el-button type="primary" @click="confirmParam">确定</el-button>
      </template>
    </el-dialog>

    <character-sheet-picker-dialog
      v-model="imageDlg"
      :model-name="imageDraft.name"
      :model-index="imageDraft.index"
      @confirm="onImageConfirm" />

    <audio-file-picker-dialog
      v-model="seDlg"
      folder="se"
      dialog-title="播放 SE"
      :model-name="seDraft.name"
      :model-volume="seDraft.volume"
      :model-pitch="seDraft.pitch"
      :model-pan="seDraft.pan"
      @confirm="onSeConfirm" />

    <move-route-preview-dialog
      v-model="previewVisible"
      :map-id="previewMapId"
      :start-x="resolvedStart.x"
      :start-y="resolvedStart.y"
      :character-name="resolvedStart.characterName"
      :character-index="resolvedStart.characterIndex"
      :direction="resolvedStart.direction"
      :route="previewRoute" />
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'
import CharacterSheetPickerDialog from '@/components/map/pickers/CharacterSheetPickerDialog.vue'
import AudioFilePickerDialog from '@/components/map/pickers/AudioFilePickerDialog.vue'
import MoveRoutePreviewDialog from '@/components/map/MoveRoutePreviewDialog.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'
import { loadSystem } from '@/components/database/shared/systemLookups'
import { MOVE_SPEED_OPTIONS, MOVE_FREQ_OPTIONS } from './eventDefaults'

const BUTTONS = [
  [
    { code: 1, label: '向下移动' },
    { code: 2, label: '向左移动' },
    { code: 3, label: '向右移动' },
    { code: 4, label: '向上移动' },
    { code: 5, label: '左下移动' },
    { code: 6, label: '右下移动' },
    { code: 7, label: '左上移动' },
    { code: 8, label: '右上移动' },
    { code: 9, label: '随机移动' },
    { code: 10, label: '接近玩家' },
    { code: 11, label: '远离玩家' },
    { code: 12, label: '前进一步' },
    { code: 13, label: '后退一步' },
    { code: 14, label: '跳跃...', kind: 'jump' },
    { code: 15, label: '等待...', kind: 'wait' },
  ],
  [
    { code: 16, label: '转向下' },
    { code: 17, label: '转向左' },
    { code: 18, label: '转向右' },
    { code: 19, label: '转向上' },
    { code: 20, label: '向右转 90 度' },
    { code: 21, label: '向左转 90 度' },
    { code: 22, label: '后转 180 度' },
    { code: 23, label: '随机转向 90 度' },
    { code: 24, label: '随机转向' },
    { code: 25, label: '朝向玩家' },
    { code: 26, label: '背向玩家' },
    { code: 27, label: '开关 ON...', kind: 'switch' },
    { code: 28, label: '开关 OFF...', kind: 'switch' },
    { code: 29, label: '更改移动速度...', kind: 'speed' },
    { code: 30, label: '更改移动频度...', kind: 'freq' },
  ],
  [
    { code: 31, label: '步行动画 ON' },
    { code: 32, label: '步行动画 OFF' },
    { code: 33, label: '踏步动画 ON' },
    { code: 34, label: '踏步动画 OFF' },
    { code: 35, label: '固定朝向 ON' },
    { code: 36, label: '固定朝向 OFF' },
    { code: 37, label: '穿透 ON' },
    { code: 38, label: '穿透 OFF' },
    { code: 39, label: '透明 ON' },
    { code: 40, label: '透明 OFF' },
    { code: 41, label: '更改图像...', kind: 'image' },
    { code: 42, label: '更改不透明度...', kind: 'opacity' },
    { code: 43, label: '更改合成方式...', kind: 'blend' },
    { code: 44, label: '播放 SE...', kind: 'se' },
    { code: 45, label: '脚本...', kind: 'script' },
  ],
]

const LABELS = {}
const KIND_BY_CODE = {}
BUTTONS.flat().forEach((b) => {
  LABELS[b.code] = b.label.replace(/\.\.\.$/, '')
  if (b.kind) KIND_BY_CODE[b.code] = b.kind
})

let routeClipboard = []

function cloneSteps(list) {
  return (list || []).map((s) => ({
    code: s.code,
    parameters: Array.isArray(s.parameters) ? JSON.parse(JSON.stringify(s.parameters)) : [],
  }))
}

function switchLabel(id) {
  const n = Number(id) || 0
  const arr = (loadSystem().switches) || []
  const name = arr[n] || ''
  const pad = `#${String(n).padStart(4, '0')}`
  return name ? `${pad} ${name}` : pad
}

export default {
  name: 'MoveRouteEditor',
  components: {
    IdNameField,
    CharacterSheetPickerDialog,
    AudioFilePickerDialog,
    MoveRoutePreviewDialog,
    PopupContextMenu,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    showTarget: { type: Boolean, default: false },
    showWait: { type: Boolean, default: true },
    characterId: { type: Number, default: 0 },
    route: { type: Object, default: null },
    mapEvents: { type: Array, default: () => [] },
    previewMapId: { type: Number, default: 0 },
    startX: { type: Number, default: 0 },
    startY: { type: Number, default: 0 },
    characterName: { type: String, default: '' },
    characterIndex: { type: Number, default: 0 },
    startDirection: { type: Number, default: 2 },
    /** 205 用：按目标解析后的起点，优先于上面的 start* */
    previewStarts: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      targetId: 0,
      repeat: false,
      skippable: false,
      wait: true,
      steps: [],
      selected: [0],
      anchor: 0,
      buttonCols: BUTTONS,
      speedOptions: MOVE_SPEED_OPTIONS,
      freqOptions: MOVE_FREQ_OPTIONS,
      clipboard: routeClipboard,
      menu: { visible: false, x: 0, y: 0 },
      paramDlg: false,
      paramKind: '',
      paramTitle: '',
      paramCode: 0,
      paramEditIndex: -1,
      paramDraft: { x: 0, y: 0, n: 1, name: '', index: 0, text: '' },
      imageDlg: false,
      imageDraft: { name: '', index: 0 },
      imageEditIndex: -1,
      seDlg: false,
      seDraft: { name: '', volume: 90, pitch: 100, pan: 0 },
      seEditIndex: -1,
      previewVisible: false,
    }
  },
  computed: {
    displaySteps() {
      return [...this.steps, { code: 0, parameters: [] }]
    },
    focusIndex() {
      return this.selected.length ? this.selected[this.selected.length - 1] : 0
    },
    canCopy() {
      return this.selected.some((i) => i >= 0 && i < this.steps.length)
    },
    canEdit() {
      const i = this.focusIndex
      return i >= 0 && i < this.steps.length && !!KIND_BY_CODE[this.steps[i].code]
    },
    previewRoute() {
      return {
        list: this.steps.map((s) => ({ code: s.code, parameters: s.parameters || [] })),
        repeat: this.repeat,
        skippable: this.skippable,
        wait: this.wait,
      }
    },
    resolvedStart() {
      const tid = this.showTarget ? this.targetId : 0
      if (this.previewStarts && this.previewStarts[tid]) {
        return this.previewStarts[tid]
      }
      return {
        x: this.startX || 0,
        y: this.startY || 0,
        characterName: this.characterName || '',
        characterIndex: this.characterIndex || 0,
        direction: this.startDirection || 2,
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) {
          this.closeMenu()
          return
        }
        this.targetId = this.characterId != null ? this.characterId : 0
        const r = this.route || {}
        this.repeat = !!r.repeat
        this.skippable = !!r.skippable
        this.wait = r.wait !== false
        const list = Array.isArray(r.list) ? r.list.filter((s) => s && s.code !== 0) : []
        this.steps = list.map((s) => ({
          code: s.code,
          parameters: Array.isArray(s.parameters) ? [...s.parameters] : [],
        }))
        this.selected = [0]
        this.anchor = 0
        this.clipboard = routeClipboard
      },
    },
  },
  methods: {
    isSelected(i) {
      return this.selected.includes(i)
    },
    canMove(dir) {
      if (!this.canCopy) return false
      const idxs = this.selected.filter((i) => i < this.steps.length).sort((a, b) => a - b)
      if (!idxs.length) return false
      if (dir < 0) return idxs[0] > 0
      return idxs[idxs.length - 1] < this.steps.length - 1
    },
    stepLabel(step) {
      if (!step || step.code === 0) return ''
      const base = LABELS[step.code] || `指令#${step.code}`
      const p = step.parameters || []
      if (step.code === 14) return `${base}(${p[0] || 0},${p[1] || 0})`
      if (step.code === 15) return `${base}(${p[0] || 0}帧)`
      if (step.code === 27 || step.code === 28) return `${base} ${switchLabel(p[0])}`
      if (step.code === 29) {
        const o = MOVE_SPEED_OPTIONS.find((x) => x.value === p[0])
        return `${base} ${o ? o.label : p[0] || 4}`
      }
      if (step.code === 30) {
        const o = MOVE_FREQ_OPTIONS.find((x) => x.value === p[0])
        return `${base} ${o ? o.label : p[0] || 3}`
      }
      if (step.code === 41) return `${base} ${p[0] || ''}(${p[1] || 0})`
      if (step.code === 42) return `${base}${p[0] || 255}`
      if (step.code === 43) return `${base}${p[0] || 0}`
      if (step.code === 44) return `${base} ${p[0] && p[0].name ? p[0].name : ''}`
      if (step.code === 45) return `${base}${p[0] || ''}`
      return base
    },
    onRowClick(i, e) {
      if (e.shiftKey) {
        const a = this.anchor
        const lo = Math.min(a, i)
        const hi = Math.max(a, i)
        const next = []
        for (let n = lo; n <= hi; n++) next.push(n)
        this.selected = next
      } else {
        this.selected = [i]
        this.anchor = i
      }
      if (this.$refs.listEl) this.$refs.listEl.focus()
    },
    activateRow(i) {
      this.selected = [i]
      this.anchor = i
      if (i >= this.steps.length) return
      this.editSelected()
    },
    addCommand(b) {
      if (b.kind === 'image') {
        this.imageEditIndex = -1
        this.imageDraft = { name: '', index: 0 }
        this.imageDlg = true
        return
      }
      if (b.kind === 'se') {
        this.seEditIndex = -1
        this.seDraft = { name: '', volume: 90, pitch: 100, pan: 0 }
        this.seDlg = true
        return
      }
      if (b.kind) {
        this.openParam(b.code, b.kind, b.label, -1)
        return
      }
      this.insertStep({ code: b.code, parameters: [] })
    },
    openParam(code, kind, title, editIndex) {
      const step = editIndex >= 0 ? this.steps[editIndex] : null
      const p = (step && step.parameters) || []
      this.paramKind = kind
      this.paramCode = code
      this.paramTitle = title || LABELS[code] || '编辑'
      this.paramEditIndex = editIndex
      this.paramDraft = {
        x: kind === 'jump' ? (p[0] || 0) : 0,
        y: kind === 'jump' ? (p[1] || 0) : 0,
        n:
          kind === 'wait'
            ? (p[0] || 60)
            : kind === 'opacity'
              ? (p[0] ?? 255)
              : kind === 'speed'
                ? (p[0] || 4)
                : kind === 'freq'
                  ? (p[0] || 3)
                  : kind === 'blend'
                    ? (p[0] || 0)
                    : kind === 'switch'
                      ? (p[0] || 1)
                      : 1,
        name: '',
        index: 0,
        text: kind === 'script' ? (p[0] || '') : '',
      }
      this.paramDlg = true
    },
    confirmParam() {
      const d = this.paramDraft
      let parameters = []
      if (this.paramKind === 'jump') parameters = [d.x, d.y]
      else if (
        this.paramKind === 'wait' ||
        this.paramKind === 'switch' ||
        this.paramKind === 'speed' ||
        this.paramKind === 'freq' ||
        this.paramKind === 'opacity' ||
        this.paramKind === 'blend'
      ) {
        parameters = [d.n]
      } else if (this.paramKind === 'script') {
        parameters = [d.text || '']
      }
      const step = { code: this.paramCode, parameters }
      if (this.paramEditIndex >= 0) {
        this.steps.splice(this.paramEditIndex, 1, step)
        this.selected = [this.paramEditIndex]
      } else {
        this.insertStep(step)
      }
      this.paramDlg = false
    },
    onImageConfirm(payload) {
      const step = {
        code: 41,
        parameters: [payload.name || '', payload.index || 0, 2, 0],
      }
      if (this.imageEditIndex >= 0) {
        this.steps.splice(this.imageEditIndex, 1, step)
        this.selected = [this.imageEditIndex]
      } else {
        this.insertStep(step)
      }
    },
    onSeConfirm(a) {
      const step = {
        code: 44,
        parameters: [{ name: a.name || '', volume: a.volume, pitch: a.pitch, pan: a.pan }],
      }
      if (this.seEditIndex >= 0) {
        this.steps.splice(this.seEditIndex, 1, step)
        this.selected = [this.seEditIndex]
      } else {
        this.insertStep(step)
      }
    },
    insertStep(step) {
      const i = Math.max(0, Math.min(this.focusIndex, this.steps.length))
      this.steps.splice(i, 0, step)
      this.selected = [i + 1]
      this.anchor = i + 1
    },
    editSelected() {
      const i = this.focusIndex
      if (i < 0 || i >= this.steps.length) return
      const step = this.steps[i]
      const kind = KIND_BY_CODE[step.code]
      if (!kind) return
      if (kind === 'image') {
        this.imageEditIndex = i
        this.imageDraft = {
          name: (step.parameters && step.parameters[0]) || '',
          index: (step.parameters && step.parameters[1]) || 0,
        }
        this.imageDlg = true
        return
      }
      if (kind === 'se') {
        const a = (step.parameters && step.parameters[0]) || {}
        this.seEditIndex = i
        this.seDraft = {
          name: a.name || '',
          volume: a.volume ?? 90,
          pitch: a.pitch ?? 100,
          pan: a.pan ?? 0,
        }
        this.seDlg = true
        return
      }
      this.openParam(step.code, kind, LABELS[step.code], i)
    },
    copySelected() {
      const idxs = this.selected.filter((i) => i < this.steps.length).sort((a, b) => a - b)
      if (!idxs.length) return
      routeClipboard = cloneSteps(idxs.map((i) => this.steps[i]))
      this.clipboard = routeClipboard
    },
    cutSelected() {
      this.copySelected()
      this.deleteSelected()
    },
    pasteClipboard() {
      if (!routeClipboard.length) return
      const at = Math.min(this.focusIndex, this.steps.length)
      const rows = cloneSteps(routeClipboard)
      this.steps.splice(at, 0, ...rows)
      this.selected = rows.map((_, n) => at + n)
      this.anchor = this.selected[0]
    },
    deleteSelected() {
      const idxs = this.selected.filter((i) => i < this.steps.length).sort((a, b) => b - a)
      if (!idxs.length) return
      idxs.forEach((i) => this.steps.splice(i, 1))
      const next = Math.min(idxs[idxs.length - 1], this.steps.length)
      this.selected = [next]
      this.anchor = next
    },
    selectAll() {
      if (!this.steps.length) {
        this.selected = [0]
        return
      }
      this.selected = this.steps.map((_, i) => i)
      this.anchor = 0
    },
    insertBlank() {
      this.selected = [Math.min(this.focusIndex, this.steps.length)]
      this.anchor = this.selected[0]
    },
    moveSelected(dir) {
      if (!this.canMove(dir)) return
      const idxs = this.selected.filter((i) => i < this.steps.length).sort((a, b) => a - b)
      if (dir < 0) {
        const first = idxs[0]
        const item = this.steps.splice(first - 1, 1)[0]
        this.steps.splice(idxs[idxs.length - 1], 0, item)
        this.selected = idxs.map((i) => i - 1)
      } else {
        const last = idxs[idxs.length - 1]
        const item = this.steps.splice(last + 1, 1)[0]
        this.steps.splice(idxs[0], 0, item)
        this.selected = idxs.map((i) => i + 1)
      }
      this.anchor = this.selected[0]
    },
    onListKey(e) {
      const max = this.steps.length
      const ctrl = e.ctrlKey || e.metaKey
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const delta = e.key === 'ArrowUp' ? -1 : 1
        const cur = this.focusIndex
        const next = Math.max(0, Math.min(max, cur + delta))
        if (e.shiftKey) {
          const a = this.anchor
          const lo = Math.min(a, next)
          const hi = Math.max(a, next)
          const sel = []
          for (let n = lo; n <= hi; n++) sel.push(n)
          this.selected = sel
        } else {
          this.selected = [next]
          this.anchor = next
        }
        this.scrollRow(next)
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        this.activateRow(this.focusIndex)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        this.deleteSelected()
        return
      }
      if (ctrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        this.selectAll()
        return
      }
      if (ctrl && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        this.copySelected()
        return
      }
      if (ctrl && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault()
        this.cutSelected()
        return
      }
      if (ctrl && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        this.pasteClipboard()
      }
    },
    scrollRow(i) {
      this.$nextTick(() => {
        const root = this.$refs.listEl
        const row = root && root.children[i]
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' })
      })
    },
    onContextMenu(e) {
      const row = e.target && e.target.closest ? e.target.closest('.mr-row') : null
      if (row && this.$refs.listEl) {
        const i = Array.prototype.indexOf.call(this.$refs.listEl.children, row)
        if (i >= 0 && !this.selected.includes(i)) {
          this.selected = [i]
          this.anchor = i
        }
      }
      this.menu = { visible: true, x: e.clientX, y: e.clientY }
    },
    closeMenu() {
      this.menu.visible = false
    },
    ok() {
      const list = this.steps.map((s) => ({
        code: s.code,
        parameters: s.parameters || [],
        indent: null,
      }))
      list.push({ code: 0, parameters: [] })
      this.$emit('confirm', {
        characterId: this.showTarget ? this.targetId : 0,
        route: {
          list,
          repeat: this.repeat,
          skippable: this.skippable,
          wait: this.showWait ? this.wait : false,
        },
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.mr {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
  min-height: 420px;
}
.mr-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.mr-target {
  width: 100%;
}
.mr-list {
  flex: 1;
  min-height: 240px;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  background: #fff;
  outline: none;
}
.mr-row {
  padding: 2px 8px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  height: 24px;
  line-height: 20px;
  box-sizing: border-box;
}
.mr-row.active {
  background: var(--el-color-primary);
  color: #fff;
}
.mr-mark {
  margin-right: 4px;
}
.mr-opts {
  margin: 0;
  padding: 6px 8px;
  border: 1px solid var(--el-border-color);
}
.mr-opts :deep(.el-checkbox) {
  display: flex;
  margin-right: 0;
}
.mr-cols {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}
.mr-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mr-btn {
  width: 100%;
  margin-left: 0 !important;
  justify-content: flex-start;
}
</style>

<style>
.popup-context-menu.mr-ctx {
  z-index: 5000;
  min-width: 160px;
}
.popup-context-menu.mr-ctx li {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}
.popup-context-menu.mr-ctx .sc {
  opacity: 0.65;
  font-size: 11px;
}
</style>
