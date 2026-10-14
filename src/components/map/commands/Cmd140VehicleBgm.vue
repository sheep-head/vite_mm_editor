<template>
  <el-dialog :model-value="modelValue" title="更改载具背景音乐" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="载具">
        <el-select v-model="vehicle" style="width: 140px">
          <el-option :value="0" label="小舟" />
          <el-option :value="1" label="大船" />
          <el-option :value="2" label="飞艇" />
        </el-select>
      </el-form-item>
      <audio-params-form v-model="audio" folder="bgm" />
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>
<script>
import AudioParamsForm from '../pickers/AudioParamsForm.vue'
export default {
  name: 'Cmd140VehicleBgm',
  components: { AudioParamsForm },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { vehicle: 0, audio: { name: '', volume: 90, pitch: 100, pan: 0 } } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const p = (this.command && this.command.parameters) || [0, {}]
      this.vehicle = p[0] || 0
      const a = p[1] || {}
      this.audio = { name: a.name || '', volume: a.volume ?? 90, pitch: a.pitch ?? 100, pan: a.pan ?? 0 }
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 140,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.vehicle, { ...this.audio }],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
