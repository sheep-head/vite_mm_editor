<template>
  <audio-file-picker-dialog
    :model-value="modelValue"
    dialog-title="更改载具背景音乐"
    folder="bgm"
    :model-name="audio.name"
    :model-volume="audio.volume"
    :model-pitch="audio.pitch"
    :model-pan="audio.pan"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="onConfirm">
    <template #extra>
      <el-form size="small" label-width="56px" inline>
        <el-form-item label="载具">
          <el-select v-model="vehicle" style="width: 140px">
            <el-option :value="0" label="小舟" />
            <el-option :value="1" label="大船" />
            <el-option :value="2" label="飞艇" />
          </el-select>
        </el-form-item>
      </el-form>
    </template>
  </audio-file-picker-dialog>
</template>
<script>
import AudioFilePickerDialog from '../pickers/AudioFilePickerDialog.vue'
export default {
  name: 'Cmd140VehicleBgm',
  components: { AudioFilePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { vehicle: 0, audio: { name: '', volume: 90, pitch: 100, pan: 0 } }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, {}]
        this.vehicle = p[0] || 0
        const a = p[1] || {}
        this.audio = { name: a.name || '', volume: a.volume ?? 90, pitch: a.pitch ?? 100, pan: a.pan ?? 0 }
      },
    },
  },
  methods: {
    onConfirm(a) {
      this.$emit('confirm', [{
        code: 140,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.vehicle, { name: a.name || '', volume: a.volume, pitch: a.pitch, pan: a.pan }],
      }])
    },
  },
}
</script>
