<template>
  <el-dialog :model-value="modelValue" title="强制战斗行动" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="使用者">
        <el-radio-group v-model="subjectType">
          <el-radio :value="0">敌人</el-radio>
          <el-radio :value="1">角色</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="subjectType === 0 ? '敌人索引' : '角色ID'">
        <el-input-number v-model="subjectId" :min="subjectType === 0 ? 0 : 1" controls-position="right" />
      </el-form-item>
      <el-form-item label="技能">
        <el-input-number v-model="skillId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="目标">
        <el-input-number v-model="targetIndex" :min="-2" controls-position="right" />
        <span class="hint">-2上次/-1随机/索引</span>
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
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd339ForceAction',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { subjectType: 0, subjectId: 0, skillId: 1, targetIndex: -2, pickerVisible: false }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 0, 0]
        this.subjectType = p[0] || 0
        this.subjectId = p[1] || 0
        this.skillId = p[2] || 1
        this.targetIndex = p[3] ?? -2
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 339,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.subjectType, this.subjectId, this.skillId, this.targetIndex],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
<style scoped>
.hint { margin-left: 8px; font-size: 12px; color: #888; }
</style>
