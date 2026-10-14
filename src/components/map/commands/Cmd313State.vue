<template>
  <el-dialog :model-value="modelValue" title="更改状态" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <actor-target-fields v-model="target" />
      <el-form-item label="操作">
        <el-radio-group v-model="op">
          <el-radio :value="0">附加</el-radio>
          <el-radio :value="1">解除</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="状态">
        <el-input-number v-model="stateId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="state" :model-id="stateId" @confirm="(id) => (stateId = id)" />
  </el-dialog>
</template>
<script>
import ActorTargetFields from '../pickers/ActorTargetFields.vue'
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd313State',
  components: { ActorTargetFields, IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { target: { mode: 0, actorId: 0 }, op: 0, stateId: 1, pickerVisible: false }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 0, 1]
        this.target = { mode: p[0] || 0, actorId: p[1] || 0 }
        this.op = p[2] === 1 ? 1 : 0
        this.stateId = p[3] || 1
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 313,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.target.mode, this.target.actorId, this.op, this.stateId],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
