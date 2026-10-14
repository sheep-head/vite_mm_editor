<template>
  <el-dialog :model-value="modelValue" title="移动图片" width="480px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="编号"><el-input-number v-model="picId" :min="1" :max="100" controls-position="right" /></el-form-item>
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
      <el-form-item label="时长"><el-input-number v-model="duration" :min="0" controls-position="right" /></el-form-item>
      <el-form-item label="等待"><el-checkbox v-model="wait">等待完成</el-checkbox></el-form-item>
      <el-form-item label="缓动">
        <el-select v-model="easing" style="width: 140px">
          <el-option :value="0" label="恒定" />
          <el-option :value="1" label="缓入" />
          <el-option :value="2" label="缓出" />
          <el-option :value="3" label="缓入缓出" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
export default {
  name: 'Cmd232MovePicture',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      picId: 1, origin: 0, direct: 0, x: 0, y: 0,
      scaleX: 100, scaleY: 100, opacity: 255, blend: 0,
      duration: 60, wait: true, easing: 0,
    }
  },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      // MZ: [id, origin, direct, x, y, scaleX, scaleY, opacity, blend, duration, wait, easing]
      // catalog default has an extra unused slot at index 1 historically — align runtime MZ
      const p = (this.command && this.command.parameters) || [1, 0, 0, 0, 0, 0, 100, 100, 255, 0, 60, true, 0]
      this.picId = p[0] || 1
      // support both MV([id,0,origin,...]) padded and MZ([id,origin,...])
      if (p.length >= 13) {
        this.origin = p[2] || 0
        this.direct = p[3] || 0
        this.x = p[4] || 0
        this.y = p[5] || 0
        this.scaleX = p[6] ?? 100
        this.scaleY = p[7] ?? 100
        this.opacity = p[8] ?? 255
        this.blend = p[9] || 0
        this.duration = p[10] ?? 60
        this.wait = p[11] !== false
        this.easing = p[12] || 0
      } else {
        this.origin = p[1] || 0
        this.direct = p[2] || 0
        this.x = p[3] || 0
        this.y = p[4] || 0
        this.scaleX = p[5] ?? 100
        this.scaleY = p[6] ?? 100
        this.opacity = p[7] ?? 255
        this.blend = p[8] || 0
        this.duration = p[9] ?? 60
        this.wait = p[10] !== false
        this.easing = p[11] || 0
      }
    }},
  },
  methods: {
    ok() {
      // 与 catalog createDefault 对齐：13 项（含占位 0）
      this.$emit('confirm', [{
        code: 232,
        indent: (this.command && this.command.indent) || 0,
        parameters: [
          this.picId, 0, this.origin, this.direct, this.x, this.y,
          this.scaleX, this.scaleY, this.opacity, this.blend,
          this.duration, this.wait, this.easing,
        ],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
