<template>
  <el-dialog :model-value="modelValue" title="设置载具位置" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="载具">
        <el-select v-model="vehicle" style="width: 140px">
          <el-option :value="0" label="小舟" />
          <el-option :value="1" label="大船" />
          <el-option :value="2" label="飞艇" />
        </el-select>
      </el-form-item>
      <el-form-item label="指定">
        <el-radio-group v-model="direct">
          <el-radio :value="0">直接</el-radio>
          <el-radio :value="1">变量</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="direct === 0 ? '地图' : '地图变量'">
        <el-input-number v-model="mapId" :min="1" controls-position="right" />
        <el-button v-if="direct === 0" size="small" @click="mapPicker = true">...</el-button>
      </el-form-item>
      <el-form-item :label="direct === 0 ? 'X' : 'X变量'"><el-input-number v-model="x" :min="0" controls-position="right" /></el-form-item>
      <el-form-item :label="direct === 0 ? 'Y' : 'Y变量'"><el-input-number v-model="y" :min="0" controls-position="right" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="mapPicker" type="map" :model-id="mapId" @confirm="(id) => (mapId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
export default {
  name: 'Cmd202Vehicle',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { vehicle: 0, direct: 0, mapId: 1, x: 0, y: 0, mapPicker: false } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [0, 0, 1, 0, 0]
      this.vehicle = p[0] || 0
      this.direct = p[1] || 0
      this.mapId = p[2] || 1
      this.x = p[3] || 0
      this.y = p[4] || 0
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 202,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.vehicle, this.direct, this.mapId, this.x, this.y],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
