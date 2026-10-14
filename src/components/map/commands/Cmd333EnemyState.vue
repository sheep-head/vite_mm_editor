<template>
  <el-dialog :model-value="modelValue" title="更改敌人状态" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <enemy-index-fields v-model="enemyIndex" />
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
import EnemyIndexFields from '../pickers/EnemyIndexFields.vue'
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd333EnemyState',
  components: { EnemyIndexFields, IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { enemyIndex: 0, op: 0, stateId: 1, pickerVisible: false } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 1]
        this.enemyIndex = p[0] ?? 0
        this.op = p[1] === 1 ? 1 : 0
        this.stateId = p[2] || 1
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 333,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.enemyIndex, this.op, this.stateId],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
