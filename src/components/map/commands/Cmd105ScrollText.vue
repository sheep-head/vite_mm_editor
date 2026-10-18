<template>
  <el-dialog
    :model-value="modelValue"
    title="显示滚动文字"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="lab">文本:</div>
    <el-input v-model="text" type="textarea" :rows="10" class="text-area" />
    <div class="mid-row">
      <span>速度:</span>
      <el-input-number v-model="speed" :min="1" :max="8" controls-position="right" style="width: 110px" />
      <el-checkbox v-model="noFast">禁止快进</el-checkbox>
      <span class="sp" />
      <el-button size="small" @click="previewVisible = true">预览...</el-button>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <el-dialog v-model="previewVisible" title="预览" width="400px" append-to-body :close-on-click-modal="false">
      <pre class="preview-text">{{ text || ' ' }}</pre>
      <p class="preview-meta">速度 {{ speed }}{{ noFast ? ' · 禁止快进' : '' }}</p>
      <template #footer>
        <el-button type="primary" @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
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
    return { speed: 2, noFast: false, text: '', previewVisible: false }
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
      const commands = [{ code: 105, indent, parameters: [this.speed, this.noFast] }]
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

<style scoped>
.lab {
  font-size: 13px;
  margin-bottom: 4px;
}
.mid-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.sp {
  flex: 1;
}
.preview-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  max-height: 320px;
  overflow: auto;
  padding: 8px;
  background: #111;
  color: #fff;
}
.preview-meta {
  margin: 8px 0 0;
  color: var(--app-muted, #888);
  font-size: 12px;
}
</style>
