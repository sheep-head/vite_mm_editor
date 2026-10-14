<template>
  <el-dialog :model-value="modelValue" title="更改装备" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="角色">
        <el-input-number v-model="actorId" :min="1" controls-position="right" />
        <el-button size="small" @click="actorPicker = true">...</el-button>
      </el-form-item>
      <el-form-item label="部位">
        <el-input-number v-model="slot" :min="1" :max="5" controls-position="right" />
      </el-form-item>
      <el-form-item label="装备ID">
        <el-input-number v-model="itemId" :min="0" controls-position="right" />
        <span class="hint">0=卸下</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="actorPicker" type="actor" :model-id="actorId" @confirm="(id) => (actorId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd319Equip',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { actorId: 1, slot: 1, itemId: 0, actorPicker: false } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1, 0]
        this.actorId = p[0] || 1
        this.slot = p[1] || 1
        this.itemId = p[2] || 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 319,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.actorId, this.slot, this.itemId],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
<style scoped>
.hint { margin-left: 8px; font-size: 12px; color: #888; }
</style>
