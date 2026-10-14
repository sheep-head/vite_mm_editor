<template>
  <el-dialog
    :model-value="modelValue"
    title="增减武器"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="武器">
        <el-input-number v-model="weaponId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <operate-value-fields v-model="ov" />
      <el-form-item label="含装备中">
        <el-checkbox v-model="includeEquip">包含装备中的武器</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="weapon" :model-id="weaponId" @confirm="(id) => (weaponId = id)" />
  </el-dialog>
</template>

<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
import OperateValueFields from '../pickers/OperateValueFields.vue'

export default {
  name: 'Cmd127Weapon',
  components: { IdNamePickerDialog, OperateValueFields },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      weaponId: 1,
      ov: { operation: 0, operandType: 0, operand: 1 },
      includeEquip: false,
      pickerVisible: false,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 0, 0, 1, false]
        this.weaponId = p[0] || 1
        this.ov = { operation: p[1] || 0, operandType: p[2] || 0, operand: p[3] ?? 1 }
        this.includeEquip = !!p[4]
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 127,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.weaponId, this.ov.operation, this.ov.operandType, this.ov.operand, this.includeEquip],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
