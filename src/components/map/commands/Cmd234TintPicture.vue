<template>
  <el-dialog :model-value="modelValue" title="更改图片色调" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="编号"><el-input-number v-model="picId" :min="1" :max="100" controls-position="right" /></el-form-item>
      <el-form-item label="红"><el-input-number v-model="tone[0]" :min="-255" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="绿"><el-input-number v-model="tone[1]" :min="-255" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="蓝"><el-input-number v-model="tone[2]" :min="-255" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="灰"><el-input-number v-model="tone[3]" :min="0" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="帧"><el-input-number v-model="frames" :min="0" controls-position="right" /></el-form-item>
      <el-form-item label="等待"><el-checkbox v-model="wait">等待完成</el-checkbox></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd234TintPicture',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { picId: 1, tone: [0, 0, 0, 0], frames: 60, wait: true } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [1, [0, 0, 0, 0], 60, true]
      this.picId = p[0] || 1
      this.tone = Array.isArray(p[1]) ? [...p[1]] : [0, 0, 0, 0]
      while (this.tone.length < 4) this.tone.push(0)
      this.frames = p[2] ?? 60
      this.wait = p[3] !== false
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 234,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.picId, [...this.tone], this.frames, this.wait],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
