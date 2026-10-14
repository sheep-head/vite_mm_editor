<template>
  <el-dialog :model-value="modelValue" title="增减能力值" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <actor-target-fields v-model="target" />
      <el-form-item label="能力">
        <el-select v-model="paramId" style="width: 140px">
          <el-option v-for="o in params" :key="o.v" :value="o.v" :label="o.l" />
        </el-select>
      </el-form-item>
      <operate-value-fields v-model="ov" />
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
import ActorTargetFields from '../pickers/ActorTargetFields.vue'
import OperateValueFields from '../pickers/OperateValueFields.vue'
export default {
  name: 'Cmd317Param',
  components: { ActorTargetFields, OperateValueFields },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      target: { mode: 0, actorId: 0 },
      paramId: 0,
      ov: { operation: 0, operandType: 0, operand: 0 },
      params: [
        { v: 0, l: '最大生命' }, { v: 1, l: '最大魔法' },
        { v: 2, l: '攻击' }, { v: 3, l: '防御' },
        { v: 4, l: '魔法攻击' }, { v: 5, l: '魔法防御' },
        { v: 6, l: '敏捷' }, { v: 7, l: '幸运' },
      ],
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 0, 0, 0, 0]
        this.target = { mode: p[0] || 0, actorId: p[1] || 0 }
        this.paramId = p[2] || 0
        this.ov = { operation: p[3] || 0, operandType: p[4] || 0, operand: p[5] || 0 }
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 317,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.target.mode, this.target.actorId, this.paramId, this.ov.operation, this.ov.operandType, this.ov.operand],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
