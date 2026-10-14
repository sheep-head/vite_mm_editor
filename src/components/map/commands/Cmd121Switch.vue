<template>
  <el-dialog
    :model-value="modelValue"
    title="开关操作"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="开关">
        <el-input-number v-model="fromId" :min="1" controls-position="right" />
        <span class="sep">~</span>
        <el-input-number v-model="toId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="操作">
        <el-radio-group v-model="op">
          <el-radio :value="0">ON</el-radio>
          <el-radio :value="1">OFF</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog
      v-model="pickerVisible"
      type="switch"
      :model-id="fromId"
      @confirm="onPick" />
  </el-dialog>
</template>

<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'

export default {
  name: 'Cmd121Switch',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      fromId: 1,
      toId: 1,
      op: 0,
      pickerVisible: false,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1, 0]
        this.fromId = p[0] || 1
        this.toId = p[1] || this.fromId
        this.op = p[2] === 1 ? 1 : 0
      },
    },
  },
  methods: {
    onPick(id) {
      this.fromId = id
      this.toId = id
    },
    ok() {
      const a = Math.min(this.fromId, this.toId)
      const b = Math.max(this.fromId, this.toId)
      this.$emit('confirm', [
        {
          code: 121,
          indent: (this.command && this.command.indent) || 0,
          parameters: [a, b, this.op],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.sep {
  margin: 0 6px;
}
</style>
