<template>
  <el-dialog :model-value="modelValue" title="闪烁画面" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="红"><el-input-number v-model="color[0]" :min="0" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="绿"><el-input-number v-model="color[1]" :min="0" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="蓝"><el-input-number v-model="color[2]" :min="0" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="强度"><el-input-number v-model="color[3]" :min="0" :max="255" controls-position="right" /></el-form-item>
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
  name: 'Cmd224Flash',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { color: [255, 255, 255, 255], frames: 60, wait: true } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [[255, 255, 255, 255], 60, true]
      this.color = Array.isArray(p[0]) ? [...p[0]] : [255, 255, 255, 255]
      while (this.color.length < 4) this.color.push(255)
      this.frames = p[1] ?? 60
      this.wait = p[2] !== false
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 224,
        indent: (this.command && this.command.indent) || 0,
        parameters: [[...this.color], this.frames, this.wait],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
