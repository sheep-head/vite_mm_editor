<template>
  <div class="curve-cell" @click="$emit('click')">
    <div class="curve-label">{{ label }}</div>
    <canvas ref="canvas" width="120" height="72" class="curve-canvas" />
  </div>
</template>

<script>
export default {
  name: 'ParamCurveView',
  props: {
    label: { type: String, default: '' },
    /** number[100] level 1..100 often stored as index 0..99 */
    values: { type: Array, default: () => [] },
  },
  emits: ['click'],
  watch: {
    values: {
      deep: true,
      handler() {
        this.$nextTick(() => this.paint())
      },
    },
  },
  mounted() {
    this.paint()
  },
  methods: {
    paint() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#ccc'
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1)
      const vals = Array.isArray(this.values) ? this.values : []
      if (!vals.length) return
      let min = Infinity
      let max = -Infinity
      for (const v of vals) {
        const n = Number(v) || 0
        if (n < min) min = n
        if (n > max) max = n
      }
      if (min === max) {
        min -= 1
        max += 1
      }
      const pad = 4
      ctx.beginPath()
      ctx.strokeStyle = '#409eff'
      ctx.lineWidth = 1.5
      for (let i = 0; i < vals.length; i++) {
        const x = pad + (i / Math.max(1, vals.length - 1)) * (w - pad * 2)
        const t = ((Number(vals[i]) || 0) - min) / (max - min)
        const y = h - pad - t * (h - pad * 2)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    },
  },
}
</script>

<style scoped>
.curve-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  gap: 2px;
}
.curve-label {
  font-size: 11px;
  color: var(--app-text-muted, #666);
}
.curve-canvas {
  border: 1px solid var(--app-border);
  background: #fff;
}
.curve-cell:hover .curve-canvas {
  border-color: var(--el-color-primary);
}
</style>
