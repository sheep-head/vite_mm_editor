<template>
  <el-dialog :model-value="modelValue" title="播放影像" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="文件名">
        <el-input v-model="name" placeholder="movies 下无扩展名" />
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
  name: 'Cmd261Movie',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { name: '' } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      this.name = ((this.command && this.command.parameters) || [''])[0] || ''
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{ code: 261, indent: (this.command && this.command.indent) || 0, parameters: [this.name] }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
