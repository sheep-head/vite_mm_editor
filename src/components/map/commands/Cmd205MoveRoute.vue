<template>
  <el-dialog :model-value="modelValue" title="设置移动路线" width="560px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="目标">
        <el-select v-model="charKind" style="width: 120px" @change="onKind">
          <el-option value="player" label="玩家" />
          <el-option value="this" label="本事件" />
          <el-option value="event" label="事件" />
        </el-select>
        <el-input-number v-if="charKind === 'event'" v-model="eventId" :min="1" controls-position="right" class="ml" />
      </el-form-item>
      <el-form-item label="选项">
        <el-checkbox v-model="repeat">重复动作</el-checkbox>
        <el-checkbox v-model="skippable">忽视若无法移动</el-checkbox>
        <el-checkbox v-model="wait">等待完成</el-checkbox>
      </el-form-item>
      <el-form-item label="路线">
        <div class="route-list">
          <div v-for="(step, i) in steps" :key="i" class="route-row">
            <el-select v-model="step.code" style="width: 160px" @change="onStepCode(step)">
              <el-option v-for="o in stepOptions" :key="o.code" :value="o.code" :label="o.label" />
            </el-select>
            <el-input-number v-if="stepNeedsParam(step.code)" v-model="step.param0" controls-position="right" />
            <el-button size="small" :disabled="i === 0" @click="moveStep(i, -1)">↑</el-button>
            <el-button size="small" :disabled="i >= steps.length - 1" @click="moveStep(i, 1)">↓</el-button>
            <el-button size="small" @click="steps.splice(i, 1)">删</el-button>
          </div>
          <el-button size="small" @click="addStep">添加</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
const STEP_OPTIONS = [
  { code: 1, label: '向下移动', params: 0 },
  { code: 2, label: '向左移动', params: 0 },
  { code: 3, label: '向右移动', params: 0 },
  { code: 4, label: '向上移动', params: 0 },
  { code: 5, label: '左下移动', params: 0 },
  { code: 6, label: '右下移动', params: 0 },
  { code: 7, label: '左上移动', params: 0 },
  { code: 8, label: '右上移动', params: 0 },
  { code: 9, label: '随机移动', params: 0 },
  { code: 10, label: '接近玩家', params: 0 },
  { code: 11, label: '远离玩家', params: 0 },
  { code: 12, label: '前进一步', params: 0 },
  { code: 13, label: '后退一步', params: 0 },
  { code: 14, label: '跳跃…', params: 2 },
  { code: 15, label: '等待…', params: 1 },
  { code: 16, label: '转向下', params: 0 },
  { code: 17, label: '转向左', params: 0 },
  { code: 18, label: '转向右', params: 0 },
  { code: 19, label: '转向上', params: 0 },
  { code: 20, label: '向右转', params: 0 },
  { code: 21, label: '向左转', params: 0 },
  { code: 22, label: '后转', params: 0 },
  { code: 23, label: '随机转向', params: 0 },
  { code: 24, label: '朝向玩家', params: 0 },
  { code: 25, label: '背向玩家', params: 0 },
  { code: 26, label: '朝向事件…', params: 1 },
  { code: 27, label: '开关 ON…', params: 1 },
  { code: 28, label: '开关 OFF…', params: 1 },
  { code: 29, label: '更改移动速度…', params: 1 },
  { code: 30, label: '更改移动频度…', params: 1 },
  { code: 31, label: '步行动画 ON', params: 0 },
  { code: 32, label: '步行动画 OFF', params: 0 },
  { code: 33, label: '踏步动画 ON', params: 0 },
  { code: 34, label: '踏步动画 OFF', params: 0 },
  { code: 35, label: '固定朝向 ON', params: 0 },
  { code: 36, label: '固定朝向 OFF', params: 0 },
  { code: 37, label: '穿透 ON', params: 0 },
  { code: 38, label: '穿透 OFF', params: 0 },
  { code: 39, label: '透明 ON', params: 0 },
  { code: 40, label: '透明 OFF', params: 0 },
  { code: 41, label: '更改图像…', params: 0 },
  { code: 44, label: '播放声效…', params: 0 },
  { code: 45, label: '脚本…', params: 1 },
]

export default {
  name: 'Cmd205MoveRoute',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      charKind: 'this',
      eventId: 1,
      repeat: false,
      skippable: false,
      wait: true,
      steps: [{ code: 1, param0: 0 }],
      stepOptions: STEP_OPTIONS,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, null]
        const cid = p[0]
        if (cid === -1) this.charKind = 'player'
        else if (cid === 0) this.charKind = 'this'
        else {
          this.charKind = 'event'
          this.eventId = cid || 1
        }
        const route = p[1] || {}
        this.repeat = !!route.repeat
        this.skippable = !!route.skippable
        this.wait = route.wait !== false
        const list = Array.isArray(route.list) ? route.list.filter((s) => s && s.code !== 0) : []
        this.steps = list.length
          ? list.map((s) => ({
              code: s.code,
              param0: (s.parameters && s.parameters[0]) || 0,
            }))
          : [{ code: 1, param0: 0 }]
      },
    },
  },
  methods: {
    onKind() {
      if (this.charKind === 'event' && !this.eventId) this.eventId = 1
    },
    stepNeedsParam(code) {
      const o = STEP_OPTIONS.find((x) => x.code === code)
      return o && o.params > 0
    },
    onStepCode(step) {
      step.param0 = 0
    },
    addStep() {
      this.steps.push({ code: 1, param0: 0 })
    },
    moveStep(i, dir) {
      const j = i + dir
      const t = this.steps[i]
      this.steps[i] = this.steps[j]
      this.steps[j] = t
      this.steps = [...this.steps]
    },
    ok() {
      let characterId = 0
      if (this.charKind === 'player') characterId = -1
      else if (this.charKind === 'event') characterId = this.eventId
      const list = this.steps.map((s) => {
        const o = STEP_OPTIONS.find((x) => x.code === s.code)
        const parameters = o && o.params > 0 ? [s.param0] : []
        return { code: s.code, parameters, indent: null }
      })
      list.push({ code: 0, parameters: [] })
      this.$emit('confirm', [{
        code: 205,
        indent: (this.command && this.command.indent) || 0,
        parameters: [
          characterId,
          {
            list,
            repeat: this.repeat,
            skippable: this.skippable,
            wait: this.wait,
          },
        ],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.ml { margin-left: 8px; }
.route-list { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.route-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
</style>
