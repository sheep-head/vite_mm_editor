<template>
  <el-dialog
    :model-value="modelValue"
    title="队伍管理"
    width="400px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="角色">
        <el-input-number v-model="actorId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="操作">
        <el-radio-group v-model="op">
          <el-radio :value="0">加入</el-radio>
          <el-radio :value="1">离开</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="op === 0" label="初始化">
        <el-checkbox v-model="initialize">初始化</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="actor" :model-id="actorId" @confirm="(id) => (actorId = id)" />
  </el-dialog>
</template>

<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'

export default {
  name: 'Cmd129Party',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { actorId: 1, op: 0, initialize: true, pickerVisible: false }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 0, true]
        this.actorId = p[0] || 1
        this.op = p[1] === 1 ? 1 : 0
        this.initialize = p[2] !== false
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 129,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.actorId, this.op, this.op === 0 ? this.initialize : false],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
