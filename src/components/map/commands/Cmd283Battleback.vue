<template>
  <el-dialog :model-value="modelValue" title="更改战斗背景" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="背景1"><el-input v-model="bb1" placeholder="battlebacks1" /></el-form-item>
      <el-form-item label="背景2"><el-input v-model="bb2" placeholder="battlebacks2" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd283Battleback',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { bb1: '', bb2: '' } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || ['', '']
        this.bb1 = p[0] || ''
        this.bb2 = p[1] || ''
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 283,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.bb1, this.bb2],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
