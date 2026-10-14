<template>
  <el-dialog :model-value="modelValue" title="设置天气" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="类型">
        <el-select v-model="type" style="width: 140px">
          <el-option value="none" label="无" />
          <el-option value="rain" label="雨" />
          <el-option value="storm" label="风暴" />
          <el-option value="snow" label="雪" />
        </el-select>
      </el-form-item>
      <el-form-item label="强度"><el-input-number v-model="power" :min="0" :max="9" controls-position="right" /></el-form-item>
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
  name: 'Cmd236Weather',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { type: 'none', power: 0, frames: 0, wait: false } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || ['none', 0, 0, false]
      this.type = p[0] || 'none'
      this.power = p[1] || 0
      this.frames = p[2] || 0
      this.wait = !!p[3]
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 236,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.type, this.power, this.frames, this.wait],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
