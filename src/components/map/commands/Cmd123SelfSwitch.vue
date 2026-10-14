<template>
  <el-dialog
    :model-value="modelValue"
    title="独立开关操作"
    width="360px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="开关">
        <el-radio-group v-model="letter">
          <el-radio value="A">A</el-radio>
          <el-radio value="B">B</el-radio>
          <el-radio value="C">C</el-radio>
          <el-radio value="D">D</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="操作">
        <el-radio-group v-model="op">
          <el-radio :value="0">ON</el-radio>
          <el-radio :value="1">OFF</el-radio>
        </el-radio-group>
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
  name: 'Cmd123SelfSwitch',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { letter: 'A', op: 0 }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || ['A', 0]
        this.letter = ['A', 'B', 'C', 'D'].includes(p[0]) ? p[0] : 'A'
        this.op = p[1] === 1 ? 1 : 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 123,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.letter, this.op],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
