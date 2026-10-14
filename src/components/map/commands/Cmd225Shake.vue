<template>
  <el-dialog :model-value="modelValue" title="震动屏幕" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="力度"><el-input-number v-model="power" :min="1" :max="9" controls-position="right" /></el-form-item>
      <el-form-item label="速度"><el-input-number v-model="speed" :min="1" :max="9" controls-position="right" /></el-form-item>
      <el-form-item label="帧"><el-input-number v-model="frames" :min="0" controls-position="right" /></el-form-item>
      <el-form-item label="等待"><el-checkbox v-model="wait">等待完成</el-checkbox></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd225Shake',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { power: 5, speed: 5, frames: 60, wait: true } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [5, 5, 60, true]
      this.power = p[0] ?? 5
      this.speed = p[1] ?? 5
      this.frames = p[2] ?? 60
      this.wait = p[3] !== false
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 225,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.power, this.speed, this.frames, this.wait],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
