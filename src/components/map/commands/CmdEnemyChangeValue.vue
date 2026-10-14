<template>
  <el-dialog :model-value="modelValue" :title="cfg.title" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <enemy-index-fields v-model="enemyIndex" />
      <operate-value-fields v-model="ov" />
      <el-form-item v-if="cfg.allowDeath" label="可死亡">
        <el-checkbox v-model="allowDeath">允许减到 0</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
import EnemyIndexFields from '../pickers/EnemyIndexFields.vue'
import OperateValueFields from '../pickers/OperateValueFields.vue'
const CFG = {
  331: { title: '增减敌人生命值', allowDeath: true },
  332: { title: '增减敌人魔法值' },
  342: { title: '增减敌人特技值' },
}
export default {
  name: 'CmdEnemyChangeValue',
  components: { EnemyIndexFields, OperateValueFields },
  props: { modelValue: Boolean, command: Object, entry: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      enemyIndex: -1,
      ov: { operation: 0, operandType: 0, operand: 0 },
      allowDeath: true,
    }
  },
  computed: {
    code() { return (this.entry && this.entry.code) || (this.command && this.command.code) || 331 },
    cfg() { return CFG[this.code] || { title: '敌人数值' } },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 0, 0, true]
        this.enemyIndex = p[0] ?? 0
        this.ov = { operation: p[1] || 0, operandType: p[2] || 0, operand: p[3] || 0 }
        if (this.cfg.allowDeath) this.allowDeath = p[4] !== false
      },
    },
  },
  methods: {
    ok() {
      const parameters = [this.enemyIndex, this.ov.operation, this.ov.operandType, this.ov.operand]
      if (this.cfg.allowDeath) parameters.push(this.allowDeath)
      this.$emit('confirm', [{
        code: this.code,
        indent: (this.command && this.command.indent) || 0,
        parameters,
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
