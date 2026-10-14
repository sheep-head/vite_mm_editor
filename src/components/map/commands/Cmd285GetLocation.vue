<template>
  <el-dialog :model-value="modelValue" title="获取指定位置的信息" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="变量">
        <el-input-number v-model="varId" :min="1" controls-position="right" />
        <el-button size="small" @click="varPicker = true">...</el-button>
      </el-form-item>
      <el-form-item label="信息类型">
        <el-select v-model="infoType" style="width: 160px">
          <el-option :value="0" label="地形标志" />
          <el-option :value="1" label="事件 ID" />
          <el-option :value="2" label="图块 ID(层1)" />
          <el-option :value="3" label="图块 ID(层2)" />
          <el-option :value="4" label="图块 ID(层3)" />
          <el-option :value="5" label="区域 ID" />
        </el-select>
      </el-form-item>
      <el-form-item label="坐标">
        <el-radio-group v-model="direct">
          <el-radio :value="0">直接</el-radio>
          <el-radio :value="1">变量</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="direct === 0 ? 'X' : 'X变量'"><el-input-number v-model="x" :min="0" controls-position="right" /></el-form-item>
      <el-form-item :label="direct === 0 ? 'Y' : 'Y变量'"><el-input-number v-model="y" :min="0" controls-position="right" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="varPicker" type="variable" :model-id="varId" @confirm="(id) => (varId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd285GetLocation',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { varId: 1, infoType: 0, direct: 0, x: 0, y: 0, varPicker: false } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 0, 0, 0, 0]
        this.varId = p[0] || 1
        this.infoType = p[1] || 0
        this.direct = p[2] || 0
        this.x = p[3] || 0
        this.y = p[4] || 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 285,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.varId, this.infoType, this.direct, this.x, this.y],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
