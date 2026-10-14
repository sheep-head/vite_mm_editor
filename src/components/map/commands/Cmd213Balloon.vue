<template>
  <el-dialog :model-value="modelValue" title="显示气泡图标" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="目标">
        <el-input-number v-model="charId" :min="-1" controls-position="right" />
        <span class="hint">-1玩家 / 0本事件</span>
      </el-form-item>
      <el-form-item label="气泡">
        <el-select v-model="balloonId" style="width: 160px">
          <el-option v-for="b in balloons" :key="b.value" :value="b.value" :label="b.label" />
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
const BALLOONS = [
  { value: 1, label: '1: 惊叹' },
  { value: 2, label: '2: 问号' },
  { value: 3, label: '3: 音符' },
  { value: 4, label: '4: 心情' },
  { value: 5, label: '5: 愤怒' },
  { value: 6, label: '6: 汗' },
  { value: 7, label: '7: 纠结' },
  { value: 8, label: '8: 沉默' },
  { value: 9, label: '9: 灯泡' },
  { value: 10, label: '10: Zzz' },
  { value: 11, label: '11: 用户1' },
  { value: 12, label: '12: 用户2' },
  { value: 13, label: '13: 用户3' },
  { value: 14, label: '14: 用户4' },
  { value: 15, label: '15: 用户5' },
]
export default {
  name: 'Cmd213Balloon',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { charId: 0, balloonId: 1, wait: false, balloons: BALLOONS } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [0, 1, false]
      this.charId = p[0] ?? 0
      this.balloonId = p[1] || 1
      this.wait = !!p[2]
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 213,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.charId, this.balloonId, this.wait],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
<style scoped>
.hint { margin-left: 8px; font-size: 12px; color: #888; }
</style>
