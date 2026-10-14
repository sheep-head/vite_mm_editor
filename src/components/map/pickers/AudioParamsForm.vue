<template>
  <div class="audio-params">
    <el-form-item :label="label">
      <el-input v-model="local.name" placeholder="无扩展名文件名" style="width: 200px" />
      <el-button size="small" @click="pickerVisible = true">...</el-button>
    </el-form-item>
    <el-form-item label="音量">
      <el-input-number v-model="local.volume" :min="0" :max="100" controls-position="right" />
    </el-form-item>
    <el-form-item label="音调">
      <el-input-number v-model="local.pitch" :min="50" :max="150" controls-position="right" />
    </el-form-item>
    <el-form-item label="声像">
      <el-input-number v-model="local.pan" :min="-100" :max="100" controls-position="right" />
    </el-form-item>
    <audio-file-picker-dialog
      v-model="pickerVisible"
      :folder="folder"
      :model-name="local.name"
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
    local: {
      get() {
        return this.modelValue || { name: '', volume: 90, pitch: 100, pan: 0 }
      },
      set(v) {
        this.$emit('update:modelValue', v)
      },
    },
  },
  methods: {
    onPick(name) {
      this.$emit('update:modelValue', { ...this.local, name })
    },
  },
}
</script>
