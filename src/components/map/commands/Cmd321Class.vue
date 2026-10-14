<template>
  <el-dialog :model-value="modelValue" title="更改职业" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="角色">
        <el-input-number v-model="actorId" :min="1" controls-position="right" />
        <el-button size="small" @click="actorPicker = true">...</el-button>
      </el-form-item>
      <el-form-item label="职业">
        <el-input-number v-model="classId" :min="1" controls-position="right" />
        <el-button size="small" @click="classPicker = true">...</el-button>
      </el-form-item>
      <el-form-item label="保存等级">
        <el-checkbox v-model="keepExp">保存等级</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="actorPicker" type="actor" :model-id="actorId" @confirm="(id) => (actorId = id)" />
    <id-name-picker-dialog v-model="classPicker" type="class" :model-id="classId" @confirm="(id) => (classId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd321Class',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { actorId: 1, classId: 1, keepExp: true, actorPicker: false, classPicker: false } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1, true]
        this.actorId = p[0] || 1
        this.classId = p[1] || 1
        this.keepExp = p[2] !== false
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 321,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.actorId, this.classId, this.keepExp],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
