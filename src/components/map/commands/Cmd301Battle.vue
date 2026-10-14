<template>
  <el-dialog :model-value="modelValue" title="战斗处理" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="指定">
        <el-radio-group v-model="designation">
          <el-radio :value="0">直接</el-radio>
          <el-radio :value="1">变量</el-radio>
          <el-radio :value="2">随机遇敌</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="designation === 0" label="敌群">
        <el-input-number v-model="troopId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item v-else-if="designation === 1" label="变量">
        <el-input-number v-model="troopId" :min="1" controls-position="right" />
      </el-form-item>
      <el-form-item label="可逃跑"><el-checkbox v-model="canEscape" /></el-form-item>
      <el-form-item label="可失败"><el-checkbox v-model="canLose" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="troop" :model-id="troopId" @confirm="(id) => (troopId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd301Battle',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      designation: 0,
      troopId: 1,
      canEscape: true,
      canLose: false,
      pickerVisible: false,
      editOnly: false,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const c = this.command
        const p = (c && c.parameters) || [0, 0, true, false]
        this.designation = p[0] || 0
        this.troopId = p[1] || 1
        this.canEscape = p[2] !== false
        this.canLose = !!p[3]
        this.editOnly = !!(c && c.code === 301 && Array.isArray(c.parameters) && c.parameters.length)
      },
    },
  },
  methods: {
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const cmd301 = {
        code: 301,
        indent,
        parameters: [this.designation, this.troopId, this.canEscape, this.canLose],
      }
      if (this.editOnly) {
        this.$emit('confirm', [cmd301])
        this.$emit('update:modelValue', false)
        return
      }
      // 胜利 / 逃跑 / 失败 / 结束
      const commands = [
        cmd301,
        { code: 601, indent, parameters: [] },
        { code: 0, indent: indent + 1, parameters: [] },
        { code: 602, indent, parameters: [] },
        { code: 0, indent: indent + 1, parameters: [] },
        { code: 603, indent, parameters: [] },
        { code: 0, indent: indent + 1, parameters: [] },
        { code: 604, indent, parameters: [] },
      ]
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
