<template>
  <el-dialog
    :model-value="modelValue"
    title="增减物品"
    width="440px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="pick">
      <div class="lab">物品:</div>
      <id-name-field v-model="itemId" type="item" width="320px" />
    </div>
    <operate-value-fields v-model="ov" />
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'
import OperateValueFields from '../pickers/OperateValueFields.vue'

export default {
  name: 'Cmd126Item',
  components: { IdNameField, OperateValueFields },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      itemId: 1,
      ov: { operation: 0, operandType: 0, operand: 1 },
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 0, 0, 1]
        this.itemId = p[0] || 1
        this.ov = { operation: p[1] || 0, operandType: p[2] || 0, operand: p[3] ?? 1 }
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 126,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.itemId, this.ov.operation, this.ov.operandType, this.ov.operand],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.pick {
  margin-bottom: 10px;
}
.lab {
  margin-bottom: 4px;
  font-size: 13px;
}
</style>
