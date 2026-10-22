<template>
  <db-group-box title="持续时间">
    <div class="dur-row">
      <el-input-number
        :model-value="frames"
        :min="0"
        :max="9999"
        size="small"
        controls-position="right"
        @update:model-value="onFrames" />
      <span class="dur-unit">帧 (1/60 秒)</span>
      <el-checkbox :model-value="wait" @update:model-value="onWait">等待完成</el-checkbox>
    </div>
  </db-group-box>
</template>

<script>
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'

export default {
  name: 'DurationWaitFields',
  components: { DbGroupBox },
  props: {
    frames: { type: Number, default: 60 },
    wait: { type: Boolean, default: true },
  },
  emits: ['update:frames', 'update:wait'],
  methods: {
    onFrames(v) {
      this.$emit('update:frames', Number.isFinite(v) ? v : 0)
    },
    onWait(v) {
      this.$emit('update:wait', !!v)
    },
  },
}
</script>

<style scoped>
.dur-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.dur-unit {
  font-size: 13px;
  color: var(--app-text, #303133);
}
</style>
