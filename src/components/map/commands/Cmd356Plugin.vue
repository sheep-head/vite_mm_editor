<template>
  <el-dialog
    :model-value="modelValue"
    title="插件指令"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="64px">
      <el-form-item label="指令">
        <el-input
          v-model="text"
          type="textarea"
          :rows="3"
          placeholder="MV 插件指令（整行字符串，如 Light radius 100 #ffffff）"
          class="mono" />
      </el-form-item>
    </el-form>
    <div class="hint">旧版（code 356）插件指令，与官方 MZ 一样只能编辑整行文本。</div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'Cmd356Plugin',
  props: {
    modelValue: Boolean,
    command: Object,
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
        const p = (this.command && this.command.parameters) || []
        this.text = p[0] != null ? String(p[0]) : ''
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 356,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.text],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.mono :deep(textarea) {
  font-family: Consolas, 'Microsoft YaHei', monospace;
}
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-muted, #888);
}
</style>
