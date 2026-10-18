<template>
  <el-dialog
    :model-value="modelValue"
    title="设置移动路线"
    width="720px"
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
        <div class="mr-list" tabindex="0" @keydown="onListKey">
          <div
            v-for="(step, i) in displaySteps"
            :key="i"
            class="mr-row"
            :class="{ active: selected === i }"
            @click="selected = i">
            <span class="mr-mark">◇</span>
            <span>{{ stepLabel(step) }}</span>
          </div>
        </div>
        <el-button size="small" disabled>预览...</el-button>
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
        <el-form-item v-if="paramKind === 'speed' || paramKind === 'freq'" label="值">
          <el-input-number v-model="paramDraft.n" :min="1" :max="6" controls-position="right" />
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
        <el-form-item v-if="paramKind === 'image'" label="图像">
          <el-input v-model="paramDraft.name" placeholder="文件名" />
        </el-form-item>
        <el-form-item v-if="paramKind === 'image'" label="索引">
          <el-input-number v-model="paramDraft.index" :min="0" :max="7" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="paramKind === 'se'" label="SE">
          <el-input v-model="paramDraft.name" placeholder="文件名" />
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
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'

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
BUTTONS.flat().forEach((b) => {
  LABELS[b.code] = b.label.replace(/\.\.\.$/, '')
})

export default {
  name: 'MoveRouteEditor',
  components: { IdNameField },
  props: {
    modelValue: { type: Boolean, default: false },
    /** 自主移动不显示目标；指令 205 显示 */
    showTarget: { type: Boolean, default: false },
    showWait: { type: Boolean, default: true },
    characterId: { type: Number, default: 0 },
    route: { type: Object, default: null },
    mapEvents: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      targetId: 0,
      repeat: false,
      skippable: false,
      wait: true,
      steps: [],
      selected: 0,
      buttonCols: BUTTONS,
      paramDlg: false,
      paramKind: '',
      paramTitle: '',
      paramCode: 0,
      paramDraft: { x: 0, y: 0, n: 1, name: '', index: 0, text: '' },
    }
  },
  computed: {
    displaySteps() {
      return [...this.steps, { code: 0, parameters: [] }]
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
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
        this.selected = 0
      },
    },
  },
  methods: {
    stepLabel(step) {
      if (!step || step.code === 0) return ''
      const base = LABELS[step.code] || `指令#${step.code}`
      const p = step.parameters || []
      if (step.code === 14) return `${base}(${p[0] || 0},${p[1] || 0})`
      if (step.code === 15) return `${base}(${p[0] || 0}帧)`
      if (step.code === 27 || step.code === 28) return `${base}#${p[0] || 1}`
      if (step.code === 29 || step.code === 30) return `${base}${p[0] || 4}`
      if (step.code === 41) return `${base}${p[0] || ''}(${p[1] || 0})`
      if (step.code === 42) return `${base}${p[0] || 255}`
      if (step.code === 43) return `${base}${p[0] || 0}`
      if (step.code === 44) return `${base}${p[0] && p[0].name ? p[0].name : ''}`
      if (step.code === 45) return `${base}${p[0] || ''}`
      return base
    },
    addCommand(b) {
      if (b.kind) {
        this.paramKind = b.kind
        this.paramCode = b.code
        this.paramTitle = b.label
        this.paramDraft = {
          x: 0,
          y: 0,
          n: b.kind === 'wait' ? 60 : b.kind === 'opacity' ? 255 : b.kind === 'speed' || b.kind === 'freq' ? 4 : 1,
          name: '',
          index: 0,
          text: '',
        }
        this.paramDlg = true
        return
      }
      this.insertStep({ code: b.code, parameters: [] })
    },
    confirmParam() {
      const d = this.paramDraft
      let parameters = []
      if (this.paramKind === 'jump') parameters = [d.x, d.y]
      else if (this.paramKind === 'wait' || this.paramKind === 'switch' || this.paramKind === 'speed' || this.paramKind === 'freq' || this.paramKind === 'opacity' || this.paramKind === 'blend') {
        parameters = [d.n]
      } else if (this.paramKind === 'image') {
        parameters = [d.name || '', d.index || 0, 2, 0]
      } else if (this.paramKind === 'se') {
        parameters = [{ name: d.name || '', volume: 90, pitch: 100, pan: 0 }]
      } else if (this.paramKind === 'script') {
        parameters = [d.text || '']
      }
      this.insertStep({ code: this.paramCode, parameters })
      this.paramDlg = false
    },
    insertStep(step) {
      const i = Math.max(0, Math.min(this.selected, this.steps.length))
      this.steps.splice(i, 0, step)
      this.selected = i + 1
    },
    onListKey(e) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (this.selected >= 0 && this.selected < this.steps.length) {
          this.steps.splice(this.selected, 1)
          this.selected = Math.min(this.selected, this.steps.length)
        }
      }
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
  grid-template-columns: 260px 1fr;
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
}
.mr-row {
  padding: 2px 8px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
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
  justify-content: flex-start;
}
</style>
