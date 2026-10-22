<template>
  <el-dialog
    :model-value="modelValue"
    title="更改画面色调"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="色调" class="tone-box">
      <div class="tone-layout">
        <div class="tone-sliders">
          <div v-for="ch in channels" :key="ch.key" class="tone-row">
            <span class="tone-label">{{ ch.label }}</span>
            <el-slider
              v-model="tone[ch.index]"
              :min="ch.min"
              :max="ch.max"
              :show-tooltip="false"
              class="tone-slider" />
            <el-input-number
              v-model="tone[ch.index]"
              :min="ch.min"
              :max="ch.max"
              size="small"
              controls-position="right"
              class="tone-num" />
          </div>
        </div>
        <div class="tone-preview" :style="previewStyle" title="预览" />
      </div>
      <div class="tone-presets">
        <el-button
          v-for="p in presets"
          :key="p.name"
          size="small"
          :type="isPreset(p.value) ? 'primary' : 'default'"
          @click="applyPreset(p.value)">
          {{ p.name }}
        </el-button>
      </div>
    </db-group-box>
    <duration-wait-fields v-model:frames="frames" v-model:wait="wait" class="dur-gap" />
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import DurationWaitFields from '../pickers/DurationWaitFields.vue'

const PRESETS = [
  { name: '正常', value: [0, 0, 0, 0] },
  { name: '黑暗', value: [-68, -68, -68, 0] },
  { name: '茶色', value: [34, -34, -68, 170] },
  { name: '黄昏', value: [68, -34, -34, 0] },
  { name: '夜晚', value: [-68, -68, 0, 68] },
  { name: '血红', value: [68, -34, -34, 68] },
  { name: '冻结', value: [-68, -34, 68, 34] },
]

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

export default {
  name: 'Cmd223Tint',
  components: { DbGroupBox, DurationWaitFields },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      tone: [0, 0, 0, 0],
      frames: 60,
      wait: true,
      presets: PRESETS,
      channels: [
        { key: 'r', label: '红', index: 0, min: -255, max: 255 },
        { key: 'g', label: '绿', index: 1, min: -255, max: 255 },
        { key: 'b', label: '蓝', index: 2, min: -255, max: 255 },
        { key: 'gray', label: '灰度', index: 3, min: 0, max: 255 },
      ],
    }
  },
  computed: {
    previewStyle() {
      const [r, g, b, gray] = this.tone
      const base = 128
      const gr = gray / 255
      let rr = clamp(base + Number(r || 0) / 2, 0, 255)
      let gg = clamp(base + Number(g || 0) / 2, 0, 255)
      let bb = clamp(base + Number(b || 0) / 2, 0, 255)
      const avg = (rr + gg + bb) / 3
      rr = rr * (1 - gr) + avg * gr
      gg = gg * (1 - gr) + avg * gr
      bb = bb * (1 - gr) + avg * gr
      return {
        background: `linear-gradient(180deg, rgb(${rr | 0},${gg | 0},${bb | 0}), rgb(${(rr * 0.55) | 0},${(gg * 0.55) | 0},${(bb * 0.55) | 0}))`,
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [[0, 0, 0, 0], 60, true]
        this.tone = Array.isArray(p[0]) ? [...p[0]] : [0, 0, 0, 0]
        while (this.tone.length < 4) this.tone.push(0)
        this.frames = p[1] ?? 60
        this.wait = p[2] !== false
      },
    },
  },
  methods: {
    isPreset(arr) {
      return arr.every((n, i) => Number(this.tone[i]) === n)
    },
    applyPreset(arr) {
      this.tone = [...arr]
    },
    ok() {
      this.$emit('confirm', [
        {
          code: 223,
          indent: (this.command && this.command.indent) || 0,
          parameters: [[...this.tone], this.frames, this.wait],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.tone-box {
  margin-bottom: 10px;
}
.tone-layout {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.tone-sliders {
  flex: 1;
  min-width: 0;
}
.tone-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.tone-label {
  width: 36px;
  flex-shrink: 0;
  font-size: 13px;
}
.tone-slider {
  flex: 1;
  margin: 0 4px;
}
.tone-num {
  width: 110px;
}
.tone-preview {
  width: 56px;
  flex-shrink: 0;
  border: 1px solid var(--app-border, #c0c4cc);
  border-radius: 2px;
  min-height: 140px;
}
.tone-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.dur-gap {
  margin-top: 4px;
}
</style>
