<template>
  <el-dialog :model-value="modelValue" title="滚动地图" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="方向">
        <el-select v-model="direction" style="width: 120px">
          <el-option :value="2" label="下" />
          <el-option :value="4" label="左" />
          <el-option :value="6" label="右" />
          <el-option :value="8" label="上" />
        </el-select>
      </el-form-item>
      <el-form-item label="距离"><el-input-number v-model="distance" :min="1" controls-position="right" /></el-form-item>
      <el-form-item label="速度">
        <el-select v-model="speed" style="width: 140px">
          <el-option :value="1" label="1: 1/8倍" />
          <el-option :value="2" label="2: 1/4倍" />
          <el-option :value="3" label="3: 1/2倍" />
          <el-option :value="4" label="4: 标准" />
          <el-option :value="5" label="5: 2倍" />
          <el-option :value="6" label="6: 4倍" />
        </el-select>
      </el-form-item>
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
  name: 'Cmd204Scroll',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { direction: 2, distance: 1, speed: 4, wait: true } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [2, 1, 4, true]
      this.direction = p[0] || 2
      this.distance = p[1] || 1
      this.speed = p[2] || 4
      this.wait = p[3] !== false
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 204,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.direction, this.distance, this.speed, this.wait],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
