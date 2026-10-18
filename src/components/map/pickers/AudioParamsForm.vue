<template>
  <div class="audio-params">
    <el-form-item :label="label">
      <el-input :model-value="local.name" readonly placeholder="(无)" style="width: 200px" />
      <el-button size="small" @click="pickerVisible = true">...</el-button>
    </el-form-item>
    <el-form-item label="音量">
      <span class="audio-params__val">{{ local.volume }}</span>
    </el-form-item>
    <el-form-item label="音调">
      <span class="audio-params__val">{{ local.pitch }}</span>
    </el-form-item>
    <el-form-item label="声像">
      <span class="audio-params__val">{{ local.pan }}</span>
    </el-form-item>
    <audio-file-picker-dialog
      v-model="pickerVisible"
      :folder="folder"
      :model-name="local.name"
      :model-volume="local.volume"
      :model-pitch="local.pitch"
      :model-pan="local.pan"
      @confirm="onPick" />
  </div>
</template>

<script>
import AudioFilePickerDialog from './AudioFilePickerDialog.vue'

export default {
  name: 'AudioParamsForm',
  components: { AudioFilePickerDialog },
  props: {
    modelValue: {
      type: Object,
      default: () => ({ name: '', volume: 90, pitch: 100, pan: 0 }),
    },
    folder: { type: String, default: 'bgm' },
    label: { type: String, default: '文件' },
  },
  emits: ['update:modelValue'],
  data() {
    return { pickerVisible: false }
  },
  computed: {
    local() {
      return this.modelValue || { name: '', volume: 90, pitch: 100, pan: 0 }
    },
  },
  methods: {
    onPick(audio) {
      const next = audio && typeof audio === 'object'
        ? {
            name: audio.name || '',
            volume: Number.isFinite(audio.volume) ? audio.volume : 90,
            pitch: Number.isFinite(audio.pitch) ? audio.pitch : 100,
            pan: Number.isFinite(audio.pan) ? audio.pan : 0,
          }
        : { ...this.local, name: audio || '' }
      this.$emit('update:modelValue', next)
    },
  },
}
</script>

<style scoped>
.audio-params__val {
  min-width: 48px;
  display: inline-block;
}
</style>
