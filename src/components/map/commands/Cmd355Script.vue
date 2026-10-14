<template>
  <el-dialog :model-value="modelValue" title="脚本" width="560px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-input v-model="text" type="textarea" :rows="12" placeholder="多行脚本（续行 655）" class="mono" />
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd355Script',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { text: '' } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const c = this.command
        if (c && c.code === 355) {
          const lines = [(c.parameters && c.parameters[0]) || '']
          if (Array.isArray(c._extraLines)) lines.push(...c._extraLines)
          this.text = lines.join('\n')
        } else {
          this.text = ''
        }
      },
    },
  },
  methods: {
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const lines = String(this.text || '').split(/\r?\n/)
      const commands = []
      lines.forEach((line, i) => {
        commands.push({
          code: i === 0 ? 355 : 655,
          indent,
          parameters: [line],
        })
      })
      if (!commands.length) commands.push({ code: 355, indent, parameters: [''] })
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
<style scoped>
.mono :deep(textarea) { font-family: Consolas, monospace; }
</style>
