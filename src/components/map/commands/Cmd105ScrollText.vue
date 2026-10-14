<template>
  <el-dialog
    :model-value="modelValue"
    title="显示滚动文字"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="速度">
        <el-input-number v-model="speed" :min="1" :max="8" controls-position="right" />
      </el-form-item>
      <el-form-item label="快进">
        <el-checkbox v-model="noFast">禁止快进</el-checkbox>
      </el-form-item>
      <el-form-item label="文本">
        <el-input v-model="text" type="textarea" :rows="8" placeholder="多行拆成续行(405)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'Cmd105ScrollText',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { speed: 2, noFast: false, text: '' }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const c = this.command
        if (c && c.code === 105) {
          const p = c.parameters || [2, false]
          this.speed = p[0] || 2
          this.noFast = !!p[1]
          this.text = Array.isArray(c._extraLines) ? c._extraLines.join('\n') : ''
        } else {
          this.speed = 2
          this.noFast = false
          this.text = ''
        }
      },
    },
  },
  methods: {
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const lines = String(this.text || '').split(/\r?\n/)
      const commands = [
        { code: 105, indent, parameters: [this.speed, this.noFast] },
      ]
      if (!lines.length || (lines.length === 1 && lines[0] === '')) {
        commands.push({ code: 405, indent, parameters: [''] })
      } else {
        lines.forEach((line) => {
          commands.push({ code: 405, indent, parameters: [line] })
        })
      }
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
