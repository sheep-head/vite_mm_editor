<template>
  <el-dialog :model-value="modelValue" title="显示动画" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="目标">
        <el-input-number v-model="charId" :min="-1" controls-position="right" />
        <span class="hint">-1玩家 / 0本事件</span>
      </el-form-item>
      <el-form-item label="动画">
        <el-input-number v-model="animId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="等待"><el-checkbox v-model="wait">等待完成</el-checkbox></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="animation" :model-id="animId" @confirm="(id) => (animId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd212Animation',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { charId: 0, animId: 1, wait: false, pickerVisible: false } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [0, 1, false]
      this.charId = p[0] ?? 0
      this.animId = p[1] || 1
      this.wait = !!p[2]
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 212,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.charId, this.animId, this.wait],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
<style scoped>
.hint { margin-left: 8px; font-size: 12px; color: #888; }
</style>
