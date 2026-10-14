<template>
  <el-dialog :model-value="modelValue" title="更改队列行进" width="320px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="跟随">
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
  name: 'Cmd216Followers',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { op: 0 } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      this.op = ((this.command && this.command.parameters) || [0])[0] === 1 ? 1 : 0
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{ code: 216, indent: (this.command && this.command.indent) || 0, parameters: [this.op] }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
