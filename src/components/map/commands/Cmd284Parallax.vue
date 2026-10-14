<template>
  <el-dialog :model-value="modelValue" title="更改远景" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="文件"><el-input v-model="name" placeholder="parallaxes" /></el-form-item>
      <el-form-item label="横向循环"><el-checkbox v-model="loopX" /></el-form-item>
      <el-form-item label="纵向循环"><el-checkbox v-model="loopY" /></el-form-item>
      <el-form-item label="横滚速度"><el-input-number v-model="sx" controls-position="right" /></el-form-item>
      <el-form-item label="纵滚速度"><el-input-number v-model="sy" controls-position="right" /></el-form-item>
      <el-form-item label="显示"><el-checkbox v-model="show">显示远景</el-checkbox></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd284Parallax',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { name: '', loopX: false, loopY: false, sx: 0, sy: 0, show: false } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || ['', false, false, 0, 0, false]
        this.name = p[0] || ''
        this.loopX = !!p[1]
        this.loopY = !!p[2]
        this.sx = p[3] || 0
        this.sy = p[4] || 0
        this.show = !!p[5]
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 284,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.name, this.loopX, this.loopY, this.sx, this.sy, this.show],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
