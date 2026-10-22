<template>
  <el-dialog
    :model-value="modelValue"
    title="闪烁画面"
    width="460px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="闪光颜色" class="flash-box">
      <div class="flash-layout">
        <div class="flash-sliders">
          <div v-for="ch in channels" :key="ch.key" class="flash-row">
            <span class="flash-label">{{ ch.label }}</span>
            <el-slider
              v-model="color[ch.index]"
              :min="0"
              :max="255"
              :show-tooltip="false"
              class="flash-slider" />
            <el-input-number
              v-model="color[ch.index]"
              :min="0"
              :max="255"
              size="small"
              controls-position="right"
              class="flash-num" />
          </div>
        </div>
        <div class="flash-preview" :style="previewStyle" title="预览" />
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

export default {
  name: 'Cmd224Flash',
  components: { DbGroupBox, DurationWaitFields },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      color: [255, 255, 255, 170],
      frames: 60,
      wait: true,
      channels: [
        { key: 'r', label: '红', index: 0 },
        { key: 'g', label: '绿', index: 1 },
        { key: 'b', label: '蓝', index: 2 },
        { key: 'a', label: '强度', index: 3 },
      ],
    }
  },
  computed: {
    previewStyle() {
      const [r, g, b, a] = this.color
      const alpha = Math.max(0, Math.min(1, Number(a || 0) / 255))
      return {
        background: `linear-gradient(180deg, rgba(${r},${g},${b},${alpha}), rgba(${r},${g},${b},${alpha * 0.35}))`,
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [[255, 255, 255, 170], 60, true]
        this.color = Array.isArray(p[0]) ? [...p[0]] : [255, 255, 255, 170]
        while (this.color.length < 4) this.color.push(255)
        this.frames = p[1] ?? 60
        this.wait = p[2] !== false
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 224,
          indent: (this.command && this.command.indent) || 0,
          parameters: [[...this.color], this.frames, this.wait],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.flash-box {
  margin-bottom: 10px;
}
.flash-layout {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.flash-sliders {
  flex: 1;
  min-width: 0;
}
.flash-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.flash-label {
  width: 36px;
  flex-shrink: 0;
  font-size: 13px;
}
.flash-slider {
  flex: 1;
  margin: 0 4px;
}
.flash-num {
  width: 110px;
}
.flash-preview {
  width: 56px;
  flex-shrink: 0;
  border: 1px solid var(--app-border, #c0c4cc);
  border-radius: 2px;
  min-height: 140px;
  background: #1a1d24;
}
.dur-gap {
  margin-top: 4px;
}
</style>
