<template>
  <el-dialog
    :model-value="modelValue"
    :title="`能力值曲线 — ${label}`"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="curve-dlg">
      <canvas ref="canvas" width="500" height="200" class="big-canvas" @click="onClick" />
      <el-form size="small" label-width="72px" inline class="gen">
        <el-form-item label="1 级">
          <el-input-number v-model="start" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="99 级">
          <el-input-number v-model="end" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="成长">
          <el-select v-model="growth" style="width: 100px">
            <el-option value="linear" label="线性" />
            <el-option value="fast" label="先快后慢" />
            <el-option value="slow" label="先慢后快" />
          </el-select>
        </el-form-item>
        <el-button size="small" type="primary" @click="generate">生成</el-button>
      </el-form>
      <el-form size="small" label-width="72px" inline>
        <el-form-item label="等级">
          <el-input-number v-model="editLv" :min="1" :max="99" controls-position="right" />
        </el-form-item>
        <el-form-item label="数值">
          <el-input-number v-model="editVal" :min="1" controls-position="right" />
        </el-form-item>
        <el-button size="small" @click="applyPoint">写入</el-button>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'ParamCurveDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    label: { type: String, default: '' },
    values: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      draft: [],
      start: 1,
      end: 999,
      growth: 'linear',
      editLv: 1,
      editVal: 1,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const src = Array.isArray(this.values) ? this.values : []
        this.draft = Array.from({ length: 100 }, (_, i) => Number(src[i]) || 1)
        this.start = this.draft[0] || 1
        this.end = this.draft[98] || this.draft[99] || this.start
        this.editLv = 1
        this.editVal = this.draft[0]
        this.$nextTick(() => this.paint())
      },
    },
    draft: {
      deep: true,
      handler() {
        this.$nextTick(() => this.paint())
      },
    },
  },
  methods: {
    paint() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#ddd'
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * w
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      let min = Infinity
      let max = -Infinity
      for (const v of this.draft) {
        if (v < min) min = v
        if (v > max) max = v
      }
      if (min === max) {
        min -= 1
        max += 1
      }
      const pad = 8
      ctx.beginPath()
      ctx.strokeStyle = '#409eff'
      ctx.lineWidth = 2
      for (let i = 0; i < 99; i++) {
        const x = pad + (i / 98) * (w - pad * 2)
        const t = (this.draft[i] - min) / (max - min)
        const y = h - pad - t * (h - pad * 2)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    },
    generate() {
      const a = Number(this.start) || 1
      const b = Number(this.end) || a
      for (let i = 0; i < 99; i++) {
        const t = i / 98
        let u = t
        if (this.growth === 'fast') u = Math.sqrt(t)
        else if (this.growth === 'slow') u = t * t
        this.draft[i] = Math.max(1, Math.round(a + (b - a) * u))
      }
      this.draft[99] = this.draft[98]
      this.editVal = this.draft[this.editLv - 1]
    },
    applyPoint() {
      const i = Math.max(0, Math.min(98, (this.editLv || 1) - 1))
      this.draft[i] = Math.max(1, Number(this.editVal) || 1)
    },
    onClick(e) {
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width
      const pad = 8
      const t = (x - pad) / (canvas.width - pad * 2)
      const lv = Math.max(1, Math.min(99, Math.round(t * 98) + 1))
      this.editLv = lv
      this.editVal = this.draft[lv - 1]
    },
    confirm() {
      this.$emit('confirm', this.draft.slice())
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.curve-dlg {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.big-canvas {
  border: 1px solid var(--app-border);
  width: 100%;
  cursor: crosshair;
}
.gen {
  margin-top: 4px;
}
</style>
