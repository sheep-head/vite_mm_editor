<template>
  <el-dialog :model-value="modelValue" title="播放背景音乐" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
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
function defAudio() { return { name: '', volume: 90, pitch: 100, pan: 0 } }
export default {
  name: 'Cmd241Bgm',
  components: { AudioParamsForm },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { audio: defAudio() } },
  watch: {
    modelValue: { immediate: true, handler(v) {
      if (!v) return
      const a = ((this.command && this.command.parameters) || [])[0] || {}
      this.audio = { name: a.name || '', volume: a.volume ?? 90, pitch: a.pitch ?? 100, pan: a.pan ?? 0 }
    }},
  },
  methods: {
    ok() {
      this.$emit('confirm', [{ code: 241, indent: (this.command && this.command.indent) || 0, parameters: [{ ...this.audio }] }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
