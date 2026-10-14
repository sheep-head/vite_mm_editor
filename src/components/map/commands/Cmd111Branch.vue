<template>
  <el-dialog
    :model-value="modelValue"
    title="分支条件"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="条件类型">
        <el-radio-group v-model="kind">
          <el-radio :value="'switch'">开关</el-radio>
          <el-radio :value="'variable'">变量</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="kind === 'switch'">
        <el-form-item label="开关">
          <el-input-number v-model="switchId" :min="1" controls-position="right" />
          <el-button size="small" @click="openPicker('switch')">...</el-button>
        </el-form-item>
        <el-form-item label="为">
          <el-radio-group v-model="switchOn">
            <el-radio :value="true">ON</el-radio>
            <el-radio :value="false">OFF</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item label="变量">
          <el-input-number v-model="varId" :min="1" controls-position="right" />
          <el-button size="small" @click="openPicker('variable')">...</el-button>
        </el-form-item>
        <el-form-item label="比较">
          <el-select v-model="cmp" style="width: 80px">
            <el-option :value="0" label="=" />
            <el-option :value="1" label="≥" />
            <el-option :value="2" label="≤" />
            <el-option :value="3" label=">" />
            <el-option :value="4" label="<" />
            <el-option :value="5" label="≠" />
          </el-select>
          <el-input-number v-model="varValue" controls-position="right" class="ml" />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog
      v-model="pickerVisible"
      :type="pickerType"
      :model-id="pickerType === 'switch' ? switchId : varId"
      @confirm="onPick" />
  </el-dialog>
</template>

<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'

export default {
  name: 'Cmd111Branch',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      kind: 'switch',
      switchId: 1,
      switchOn: true,
      varId: 1,
      cmp: 1,
      varValue: 0,
      pickerVisible: false,
      pickerType: 'switch',
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 1, 0]
        if (p[0] === 1) {
          this.kind = 'variable'
          this.varId = p[1] || 1
          this.cmp = p[2] ?? 1
          this.varValue = p[3] || 0
        } else {
          this.kind = 'switch'
          this.switchId = p[1] || 1
          this.switchOn = p[2] !== 1
        }
      },
    },
  },
  methods: {
    openPicker(type) {
      this.pickerType = type
      this.pickerVisible = true
    },
    onPick(id) {
      if (this.pickerType === 'switch') this.switchId = id
      else this.varId = id
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      let parameters
      if (this.kind === 'switch') {
        parameters = [0, this.switchId, this.switchOn ? 0 : 1]
      } else {
        parameters = [1, this.varId, this.cmp, this.varValue]
      }
      this.$emit('confirm', [
        { code: 111, indent, parameters },
        { code: 0, indent: indent + 1, parameters: [] },
        { code: 412, indent, parameters: [] },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.ml {
  margin-left: 8px;
}
</style>
