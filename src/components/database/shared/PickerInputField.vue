<template>
  <el-input
    :model-value="display"
    size="small"
    readonly
    :disabled="disabled"
    :placeholder="placeholder"
    class="picker-input-field"
    :style="width ? { width } : undefined"
    @click="!disabled && $emit('pick')">
    <template #append>
      <el-button :disabled="disabled" @click.stop="$emit('pick')">...</el-button>
    </template>
  </el-input>
</template>

<script>
export default {
  name: 'PickerInputField',
  props: {
    modelValue: { type: [String, Number], default: '' },
    /** 空值时显示，默认「(无)」 */
    emptyText: { type: String, default: '(无)' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    width: { type: String, default: '100%' },
  },
  emits: ['pick'],
  computed: {
    display() {
      const v = this.modelValue
      if (v == null || v === '') return this.emptyText
      return String(v)
    },
  },
}
</script>

<style scoped>
.picker-input-field {
  width: 100%;
}
.picker-input-field :deep(.el-input__wrapper),
.picker-input-field :deep(.el-input-group__append) {
  cursor: pointer;
}
.picker-input-field :deep(.el-input-group__append) {
  padding: 0;
}
.picker-input-field :deep(.el-input-group__append .el-button) {
  margin: 0;
  border: none;
  border-radius: 0;
  height: 100%;
  padding: 0 12px;
  background: transparent;
}
</style>
