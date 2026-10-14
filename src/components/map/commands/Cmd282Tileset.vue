<template>
  <el-dialog :model-value="modelValue" title="更改地图图块" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="图块组">
        <el-input-number v-model="tilesetId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="tileset" :model-id="tilesetId" @confirm="(id) => (tilesetId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd282Tileset',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { tilesetId: 1, pickerVisible: false } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.tilesetId = ((this.command && this.command.parameters) || [1])[0] || 1
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 282,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.tilesetId],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
