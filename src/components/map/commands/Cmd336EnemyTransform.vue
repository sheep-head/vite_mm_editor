<template>
  <el-dialog :model-value="modelValue" title="敌人变身" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="索引">
        <el-input-number v-model="enemyIndex" :min="0" :max="7" controls-position="right" />
      </el-form-item>
      <el-form-item label="敌人">
        <el-input-number v-model="enemyId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="enemy" :model-id="enemyId" @confirm="(id) => (enemyId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd336EnemyTransform',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { enemyIndex: 0, enemyId: 1, pickerVisible: false } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 1]
        this.enemyIndex = p[0] || 0
        this.enemyId = p[1] || 1
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 336,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.enemyIndex, this.enemyId],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
