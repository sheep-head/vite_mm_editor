<template>
  <el-dialog :model-value="modelValue" title="更改载具图像" width="400px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="载具">
        <el-select v-model="vehicle" style="width: 140px">
          <el-option :value="0" label="小舟" />
          <el-option :value="1" label="大船" />
          <el-option :value="2" label="飞艇" />
        </el-select>
      </el-form-item>
      <el-form-item label="文件"><el-input v-model="charName" /></el-form-item>
      <el-form-item label="索引"><el-input-number v-model="charIndex" :min="0" :max="7" controls-position="right" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd323VehicleImage',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { vehicle: 0, charName: '', charIndex: 0 } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, '', 0]
        this.vehicle = p[0] || 0
        this.charName = p[1] || ''
        this.charIndex = p[2] || 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 323,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.vehicle, this.charName, this.charIndex],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
