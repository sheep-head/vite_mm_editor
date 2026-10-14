<template>
  <el-dialog :model-value="modelValue" title="淡出背景音乐" width="360px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="56px">
      <el-form-item label="秒"><el-input-number v-model="seconds" :min="0" :max="999" controls-position="right" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd242FadeBgm',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { seconds: 10 } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      this.seconds = ((this.command && this.command.parameters) || [10])[0] ?? 10
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{ code: 242, indent: (this.command && this.command.indent) || 0, parameters: [this.seconds] }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
