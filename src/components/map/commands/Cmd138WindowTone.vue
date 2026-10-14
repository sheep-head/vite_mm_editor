<template>
  <el-dialog :model-value="modelValue" title="更改窗口颜色" width="360px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="48px">
      <el-form-item label="红"><el-input-number v-model="tone[0]" :min="-255" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="绿"><el-input-number v-model="tone[1]" :min="-255" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="蓝"><el-input-number v-model="tone[2]" :min="-255" :max="255" controls-position="right" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd138WindowTone',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { tone: [0, 0, 0] } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [[0, 0, 0]]
        this.tone = Array.isArray(p[0]) ? [...p[0]] : [0, 0, 0]
        while (this.tone.length < 3) this.tone.push(0)
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 138,
        indent: (this.command && this.command.indent) || 0,
        parameters: [[this.tone[0], this.tone[1], this.tone[2]]],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
