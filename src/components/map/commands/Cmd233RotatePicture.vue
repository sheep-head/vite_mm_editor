<template>
  <el-dialog :model-value="modelValue" title="旋转图片" width="360px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="编号"><el-input-number v-model="picId" :min="1" :max="100" controls-position="right" /></el-form-item>
      <el-form-item label="速度"><el-input-number v-model="speed" controls-position="right" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd233RotatePicture',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { picId: 1, speed: 0 } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [1, 0]
      this.picId = p[0] || 1
      this.speed = p[1] || 0
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{ code: 233, indent: (this.command && this.command.indent) || 0, parameters: [this.picId, this.speed] }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
