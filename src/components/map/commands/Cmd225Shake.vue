<template>
  <el-dialog
    :model-value="modelValue"
    title="震动屏幕"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="震动" class="shake-box">
      <div class="shake-row">
        <span class="shake-label">强度</span>
        <el-slider v-model="power" :min="0" :max="9" :show-tooltip="false" :marks="marks" class="shake-slider" />
        <el-input-number v-model="power" :min="0" :max="9" size="small" controls-position="right" class="shake-num" />
      </div>
      <div class="shake-row">
        <span class="shake-label">速度</span>
        <el-slider v-model="speed" :min="0" :max="9" :show-tooltip="false" :marks="marks" class="shake-slider" />
        <el-input-number v-model="speed" :min="0" :max="9" size="small" controls-position="right" class="shake-num" />
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
  name: 'Cmd225Shake',
  components: { DbGroupBox, DurationWaitFields },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      power: 5,
      speed: 5,
      frames: 60,
      wait: true,
      marks: { 0: '', 9: '' },
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [5, 5, 60, true]
        this.power = p[0] ?? 5
        this.speed = p[1] ?? 5
        this.frames = p[2] ?? 60
        this.wait = p[3] !== false
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 225,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.power, this.speed, this.frames, this.wait],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.shake-box {
  margin-bottom: 10px;
}
.shake-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.shake-label {
  width: 36px;
  flex-shrink: 0;
  font-size: 13px;
}
.shake-slider {
  flex: 1;
  margin: 0 4px;
}
.shake-num {
  width: 100px;
}
.dur-gap {
  margin-top: 4px;
}
</style>
