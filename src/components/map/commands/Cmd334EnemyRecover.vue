<template>
  <el-dialog :model-value="modelValue" title="敌人完全恢复" width="360px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px"><enemy-index-fields v-model="enemyIndex" /></el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
import EnemyIndexFields from '../pickers/EnemyIndexFields.vue'
export default {
  name: 'Cmd334EnemyRecover',
  components: { EnemyIndexFields },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { enemyIndex: 0 } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.enemyIndex = ((this.command && this.command.parameters) || [0])[0] ?? 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 334,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.enemyIndex],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
