<template>
  <el-dialog
    :model-value="modelValue"
    title="注释"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-input v-model="text" type="textarea" :rows="6" placeholder="注释内容（多行将拆成续注释）" />
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'Cmd108Comment',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { text: '' }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.syncFromCommand()
      },
    },
  },
  methods: {
    syncFromCommand() {
      if (this.command && (this.command.code === 108 || this.command.code === 408)) {
        this.text = String((this.command.parameters && this.command.parameters[0]) || '')
      } else {
        this.text = ''
      }
    },
    ok() {
      const lines = String(this.text || '').split(/\r?\n/)
      const commands = []
      lines.forEach((line, i) => {
        commands.push({
          code: i === 0 ? 108 : 408,
          indent: (this.command && this.command.indent) || 0,
          parameters: [line],
        })
      })
      if (!commands.length) {
        commands.push({ code: 108, indent: 0, parameters: [''] })
      }
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
