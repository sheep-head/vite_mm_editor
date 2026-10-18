<template>
  <div class="operate-value">
    <db-group-box title="操作" class="blk">
      <el-radio-group :model-value="operation" @update:model-value="onOp">
        <el-radio :value="0">增加</el-radio>
        <el-radio :value="1">减少</el-radio>
      </el-radio-group>
    </db-group-box>
    <db-group-box title="操作数">
      <div class="row">
        <el-radio :model-value="operandType" :value="0" @update:model-value="onType">常量</el-radio>
        <el-input-number
          :model-value="constValue"
          :min="0"
          :disabled="operandType !== 0"
          controls-position="right"
          style="width: 140px"
          @update:model-value="onConst" />
      </div>
      <div class="row">
        <el-radio :model-value="operandType" :value="1" @update:model-value="onType">变量</el-radio>
        <id-name-field
          :model-value="varId"
          type="variable"
          width="240px"
          :disabled="operandType !== 1"
          @update:model-value="onVar" />
      </div>
    </db-group-box>
  </div>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'

/**
 * MZ operateValue：operation(0增/1减), operandType(0常量/1变量), operand
 */
export default {
  name: 'OperateValueFields',
  components: { IdNameField, DbGroupBox },
  props: {
    modelValue: {
      type: Object,
      default: () => ({ operation: 0, operandType: 0, operand: 1 }),
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      operation: 0,
      operandType: 0,
      constValue: 1,
      varId: 1,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        const m = v || {}
        this.operation = m.operation === 1 ? 1 : 0
        this.operandType = m.operandType === 1 ? 1 : 0
        const n = Number(m.operand)
        const value = Number.isFinite(n) ? n : 0
        if (this.operandType === 0) this.constValue = value
        else this.varId = value || 1
      },
    },
  },
  methods: {
    push() {
      this.$emit('update:modelValue', {
        operation: this.operation,
        operandType: this.operandType,
        operand: this.operandType === 0 ? this.constValue : this.varId,
      })
    },
    onOp(v) {
      this.operation = v === 1 ? 1 : 0
      this.push()
    },
    onType(v) {
      this.operandType = v === 1 ? 1 : 0
      this.push()
    },
    onConst(v) {
      this.constValue = Number(v) || 0
      this.push()
    },
    onVar(id) {
      this.varId = Number(id) || 0
      this.push()
    },
  },
}
</script>

<style scoped>
.blk {
  margin-bottom: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.row:last-child {
  margin-bottom: 0;
}
</style>
