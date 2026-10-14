<template>
  <el-dialog
    :model-value="modelValue"
    title="变量操作"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="变量">
        <el-input-number v-model="fromId" :min="1" controls-position="right" />
        <span class="sep">~</span>
        <el-input-number v-model="toId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="操作">
        <el-select v-model="op" style="width: 120px">
          <el-option :value="0" label="代入" />
          <el-option :value="1" label="加算" />
          <el-option :value="2" label="减算" />
          <el-option :value="3" label="乘算" />
          <el-option :value="4" label="除算" />
          <el-option :value="5" label="余数" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作数">
        <el-radio-group v-model="operandType">
          <el-radio :value="0">常量</el-radio>
        </el-radio-group>
        <el-input-number v-model="constValue" controls-position="right" class="ml" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog
      v-model="pickerVisible"
      type="variable"
      :model-id="fromId"
      @confirm="onPick" />
  </el-dialog>
</template>

<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'

export default {
  name: 'Cmd122Variable',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      fromId: 1,
      toId: 1,
      op: 0,
      operandType: 0,
      constValue: 0,
      pickerVisible: false,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1, 0, 0, 0, 0]
        this.fromId = p[0] || 1
        this.toId = p[1] || this.fromId
        this.op = p[2] || 0
        this.operandType = p[3] || 0
        this.constValue = p[4] || 0
      },
    },
  },
  methods: {
    onPick(id) {
      this.fromId = id
      this.toId = id
    },
    ok() {
      const a = Math.min(this.fromId, this.toId)
      const b = Math.max(this.fromId, this.toId)
      this.$emit('confirm', [
        {
          code: 122,
          indent: (this.command && this.command.indent) || 0,
          parameters: [a, b, this.op, 0, this.constValue, 0],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.sep {
  margin: 0 6px;
}
.ml {
  margin-left: 8px;
}
</style>
