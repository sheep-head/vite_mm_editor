<template>
  <el-dialog
    :model-value="modelValue"
    title="计时器操作"
    width="360px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="操作">
        <el-radio-group v-model="op">
          <el-radio :value="0">启动</el-radio>
          <el-radio :value="1">停止</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="op === 0" label="秒数">
        <el-input-number v-model="seconds" :min="0" :max="9999" controls-position="right" />
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
  name: 'Cmd124Timer',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { op: 0, seconds: 0 }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0]
        this.op = p[0] === 1 ? 1 : 0
        this.seconds = p[1] || 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 124,
          indent: (this.command && this.command.indent) || 0,
          parameters: this.op === 0 ? [0, this.seconds] : [1, 0],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
