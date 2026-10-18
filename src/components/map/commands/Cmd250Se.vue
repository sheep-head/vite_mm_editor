<template>
  <audio-file-picker-dialog
    :model-value="modelValue"
    dialog-title="播放音效"
    folder="se"
    :model-name="audio.name"
    :model-volume="audio.volume"
    :model-pitch="audio.pitch"
    :model-pan="audio.pan"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="onConfirm" />
</template>
<script>
import AudioFilePickerDialog from '../pickers/AudioFilePickerDialog.vue'
function defAudio() { return { name: '', volume: 90, pitch: 100, pan: 0 } }
export default {
  name: 'Cmd250Se',
  components: { AudioFilePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { audio: defAudio() } },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const a = ((this.command && this.command.parameters) || [])[0] || {}
        this.audio = { name: a.name || '', volume: a.volume ?? 90, pitch: a.pitch ?? 100, pan: a.pan ?? 0 }
      },
    },
  },
  methods: {
    onConfirm(a) {
      this.$emit('confirm', [{
        code: 250,
        indent: (this.command && this.command.indent) || 0,
        parameters: [{ name: a.name || '', volume: a.volume, pitch: a.pitch, pan: a.pan }],
      }])
    },
  },
}
</script>
