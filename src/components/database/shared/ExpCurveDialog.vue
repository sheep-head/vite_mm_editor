<template>
  <el-dialog
    :model-value="modelValue"
    title="经验值曲线"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="基础值">
        <el-input-number v-model="draft[0]" :min="0" controls-position="right" />
      </el-form-item>
      <el-form-item label="额外值">
        <el-input-number v-model="draft[1]" :min="0" controls-position="right" />
      </el-form-item>
      <el-form-item label="加速 A">
        <el-input-number v-model="draft[2]" :min="0" :max="100" controls-position="right" />
      </el-form-item>
      <el-form-item label="加速 B">
        <el-input-number v-model="draft[3]" :min="0" :max="100" controls-position="right" />
      </el-form-item>
      <el-form-item label="预览">
        <div class="preview">
          <div v-for="lv in sampleLevels" :key="lv">Lv{{ lv }} → {{ expForLevel(lv) }}</div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
/** RPG Maker expToNextLevel formula */
function expForNext(level, basis, extra, accelA, accelB) {
  const lv = Math.max(1, level)
  return Math.round(
    (basis * Math.pow(lv - 1, 0.9 + accelA / 250) * lv * (lv + 1)) /
      (6 + Math.pow(lv, 2) / 50 / accelB) +
      (lv - 1) * extra
  )
}

export default {
  name: 'ExpCurveDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    params: { type: Array, default: () => [30, 20, 30, 30] },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      draft: [30, 20, 30, 30],
      sampleLevels: [2, 10, 20, 50, 99],
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = Array.isArray(this.params) ? this.params : []
        this.draft = [
          Number(p[0]) || 30,
          Number(p[1]) || 20,
          Number(p[2]) || 30,
          Number(p[3]) || 30,
        ]
      },
    },
  },
  methods: {
    expForLevel(lv) {
      return expForNext(lv, this.draft[0], this.draft[1], this.draft[2], this.draft[3])
    },
    confirm() {
      this.$emit('confirm', this.draft.slice())
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.preview {
  font-size: 12px;
  line-height: 1.6;
  color: var(--app-text-muted, #666);
}
</style>
