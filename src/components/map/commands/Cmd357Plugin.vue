<template>
  <el-dialog :model-value="modelValue" title="插件指令" width="480px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="插件名"><el-input v-model="pluginName" /></el-form-item>
      <el-form-item label="指令"><el-input v-model="commandName" /></el-form-item>
      <el-form-item label="参数"><el-input v-model="args" type="textarea" :rows="4" placeholder="空格分隔或自由文本" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd357Plugin',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { pluginName: '', commandName: '', args: '' } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || ['', '', '']
        // MZ: [pluginName, commandName, args...] or MV-style single string in 356
        this.pluginName = p[0] || ''
        this.commandName = p[1] || ''
        this.args = p[2] != null ? String(p[2]) : ''
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 357,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.pluginName, this.commandName, this.args],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
