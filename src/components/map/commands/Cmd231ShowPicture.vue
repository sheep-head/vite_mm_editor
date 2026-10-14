<template>
  <el-dialog :model-value="modelValue" title="显示图片" width="480px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="编号"><el-input-number v-model="picId" :min="1" :max="100" controls-position="right" /></el-form-item>
      <el-form-item label="图片">
        <el-input v-model="picName" style="width: 200px" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="原点">
        <el-radio-group v-model="origin">
          <el-radio :value="0">左上</el-radio>
          <el-radio :value="1">中心</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="坐标">
        <el-radio-group v-model="direct">
          <el-radio :value="0">直接</el-radio>
          <el-radio :value="1">变量</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="X"><el-input-number v-model="x" controls-position="right" /></el-form-item>
      <el-form-item label="Y"><el-input-number v-model="y" controls-position="right" /></el-form-item>
      <el-form-item label="宽%"><el-input-number v-model="scaleX" controls-position="right" /></el-form-item>
      <el-form-item label="高%"><el-input-number v-model="scaleY" controls-position="right" /></el-form-item>
      <el-form-item label="不透明"><el-input-number v-model="opacity" :min="0" :max="255" controls-position="right" /></el-form-item>
      <el-form-item label="合成">
        <el-select v-model="blend" style="width: 120px">
          <el-option :value="0" label="普通" />
          <el-option :value="1" label="加法" />
          <el-option :value="2" label="乘法" />
          <el-option :value="3" label="屏幕" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <picture-name-picker-dialog v-model="pickerVisible" :model-name="picName" @confirm="(n) => (picName = n)" />
  </el-dialog>
</template>
<script>
import PictureNamePickerDialog from '../pickers/PictureNamePickerDialog.vue'
export default {
  name: 'Cmd231ShowPicture',
  components: { PictureNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      picId: 1, picName: '', origin: 0, direct: 0, x: 0, y: 0,
      scaleX: 100, scaleY: 100, opacity: 255, blend: 0, pickerVisible: false,
    }
  },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [1, '', 0, 0, 0, 0, 100, 100, 255, 0]
      this.picId = p[0] || 1
      this.picName = p[1] || ''
      this.origin = p[2] || 0
      this.direct = p[3] || 0
      this.x = p[4] || 0
      this.y = p[5] || 0
      this.scaleX = p[6] ?? 100
      this.scaleY = p[7] ?? 100
      this.opacity = p[8] ?? 255
      this.blend = p[9] || 0
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 231,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.picId, this.picName, this.origin, this.direct, this.x, this.y, this.scaleX, this.scaleY, this.opacity, this.blend],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
