<template>
  <el-dialog
    :model-value="modelValue"
    title="等待"
    width="360px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="时间">
        <el-input-number v-model="frames" :min="1" :max="9999" controls-position="right" />
        <span class="unit">帧</span>
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
  name: 'Cmd230Wait',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { frames: 60 }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [60]
        this.frames = p[0] || 60
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 230,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.frames],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.unit {
  margin-left: 8px;
}
</style>
