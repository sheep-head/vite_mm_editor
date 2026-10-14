<template>
  <el-dialog :model-value="modelValue" title="完全恢复" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <actor-target-fields v-model="target" />
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
import ActorTargetFields from '../pickers/ActorTargetFields.vue'
export default {
  name: 'Cmd314Recover',
  components: { ActorTargetFields },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { target: { mode: 0, actorId: 0 } } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0]
        this.target = { mode: p[0] || 0, actorId: p[1] || 0 }
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 314,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.target.mode, this.target.actorId],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
