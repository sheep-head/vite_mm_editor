<template>
  <el-dialog :model-value="modelValue" title="增减技能" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <actor-target-fields v-model="target" />
      <el-form-item label="操作">
        <el-radio-group v-model="op">
          <el-radio :value="0">学会</el-radio>
          <el-radio :value="1">遗忘</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="技能">
        <el-input-number v-model="skillId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="skill" :model-id="skillId" @confirm="(id) => (skillId = id)" />
  </el-dialog>
</template>
<script>
import ActorTargetFields from '../pickers/ActorTargetFields.vue'
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd318Skill',
  components: { ActorTargetFields, IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { target: { mode: 0, actorId: 0 }, op: 0, skillId: 1, pickerVisible: false }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 0, 1]
        this.target = { mode: p[0] || 0, actorId: p[1] || 0 }
        this.op = p[2] === 1 ? 1 : 0
        this.skillId = p[3] || 1
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 318,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.target.mode, this.target.actorId, this.op, this.skillId],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
