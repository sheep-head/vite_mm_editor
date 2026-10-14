<template>
  <div class="operate-value">
    <el-form-item label="操作">
      <el-radio-group v-model="local.operation">
        <el-radio :value="0">增加</el-radio>
        <el-radio :value="1">减少</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="运算数">
      <el-radio-group v-model="local.operandType">
        <el-radio :value="0">常数</el-radio>
        <el-radio :value="1">变量</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="local.operandType === 0" label="常数">
      <el-input-number v-model="local.operand" :min="0" controls-position="right" />
    </el-form-item>
    <el-form-item v-else label="变量">
      <el-input-number v-model="local.operand" :min="1" controls-position="right" />
      <el-button size="small" @click="pickerVisible = true">...</el-button>
    </el-form-item>
    <id-name-picker-dialog
      v-model="pickerVisible"
      type="variable"
      :model-id="local.operand"
      @confirm="onPick" />
  </div>
</template>

<script>
import IdNamePickerDialog from './IdNamePickerDialog.vue'

/**
 * MZ operateValue 三段：operation(0增/1减), operandType(0常数/1变量), operand
 */
export default {
  name: 'OperateValueFields',
  components: { IdNamePickerDialog },
  props: {
    modelValue: {
      type: Object,
      default: () => ({ operation: 0, operandType: 0, operand: 1 }),
    },
  },
  emits: ['update:modelValue'],
  data() {
    return { pickerVisible: false }
  },
  computed: {
    local: {
      get() {
        return this.modelValue || { operation: 0, operandType: 0, operand: 1 }
      },
      set(v) {
        this.$emit('update:modelValue', v)
      },
    },
  },
  methods: {
    onPick(id) {
      this.$emit('update:modelValue', { ...this.local, operand: id })
    },
  },
}
</script>
