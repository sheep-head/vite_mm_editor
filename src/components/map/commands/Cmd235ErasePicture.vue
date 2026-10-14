<template>
  <el-dialog :model-value="modelValue" title="消除图片" width="320px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="56px">
      <el-form-item label="编号"><el-input-number v-model="picId" :min="1" :max="100" controls-position="right" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd235ErasePicture',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { picId: 1 } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      this.picId = ((this.command && this.command.parameters) || [1])[0] || 1
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{ code: 235, indent: (this.command && this.command.indent) || 0, parameters: [this.picId] }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
