<template>
  <el-dialog :model-value="modelValue" title="设置事件位置" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="事件">
        <el-select v-model="charId" style="width: 160px" filterable allow-create default-first-option>
          <el-option :value="-1" label="玩家" />
          <el-option :value="0" label="本事件" />
        </el-select>
        <el-input-number v-model="charId" :min="-1" controls-position="right" class="ml" />
      </el-form-item>
      <el-form-item label="方式">
        <el-radio-group v-model="mode">
          <el-radio :value="0">直接指定</el-radio>
          <el-radio :value="1">变量指定</el-radio>
          <el-radio :value="2">交换</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="mode !== 2">
        <el-form-item :label="mode === 0 ? 'X' : 'X变量'"><el-input-number v-model="x" :min="0" controls-position="right" /></el-form-item>
        <el-form-item :label="mode === 0 ? 'Y' : 'Y变量'"><el-input-number v-model="y" :min="0" controls-position="right" /></el-form-item>
      </template>
      <el-form-item v-else label="交换对象">
        <el-input-number v-model="x" :min="-1" controls-position="right" />
        <span class="hint">-1玩家 / 0本事件 / ID</span>
      </el-form-item>
      <el-form-item label="朝向">
        <el-select v-model="direction" style="width: 120px">
          <el-option :value="0" label="不变" />
          <el-option :value="2" label="下" />
          <el-option :value="4" label="左" />
          <el-option :value="6" label="右" />
          <el-option :value="8" label="上" />
        </el-select>
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
  name: 'Cmd203EventPos',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { charId: 0, mode: 0, x: 0, y: 0, direction: 0 } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [0, 0, 0, 0, 0]
      this.charId = p[0] ?? 0
      this.mode = p[1] || 0
      this.x = p[2] || 0
      this.y = p[3] || 0
      this.direction = p[4] || 0
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 203,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.charId, this.mode, this.x, this.mode === 2 ? 0 : this.y, this.direction],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
<style scoped>
.ml { margin-left: 8px; }
.hint { margin-left: 8px; font-size: 12px; color: #888; }
</style>
