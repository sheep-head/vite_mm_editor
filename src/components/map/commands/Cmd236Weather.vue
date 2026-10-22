<template>
  <el-dialog
    :model-value="modelValue"
    title="设置天气"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="天气" class="weather-box">
      <div class="weather-row">
        <span class="weather-label">类型</span>
        <el-select v-model="type" size="small" style="width: 160px">
          <el-option value="none" label="无" />
          <el-option value="rain" label="雨" />
          <el-option value="storm" label="风暴" />
          <el-option value="snow" label="雪" />
        </el-select>
      </div>
      <div class="weather-row">
        <span class="weather-label">强度</span>
        <el-slider v-model="power" :min="0" :max="9" :show-tooltip="false" class="weather-slider" />
        <el-input-number v-model="power" :min="0" :max="9" size="small" controls-position="right" class="weather-num" />
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
  name: 'Cmd236Weather',
  components: { DbGroupBox, DurationWaitFields },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { type: 'none', power: 5, frames: 60, wait: true }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || ['none', 5, 60, true]
        this.type = p[0] || 'none'
        this.power = p[1] ?? 5
        this.frames = p[2] ?? 60
        this.wait = p[3] !== false
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 236,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.type, this.power, this.frames, this.wait],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.weather-box {
  margin-bottom: 10px;
}
.weather-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.weather-label {
  width: 36px;
  flex-shrink: 0;
  font-size: 13px;
}
.weather-slider {
  flex: 1;
  margin: 0 4px;
}
.weather-num {
  width: 100px;
}
.dur-gap {
  margin-top: 4px;
}
</style>
