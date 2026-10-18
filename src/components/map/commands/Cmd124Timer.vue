<template>
  <el-dialog
    :model-value="modelValue"
    title="计时器操作"
    width="360px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="操作" class="blk">
      <el-radio-group v-model="op">
        <el-radio :value="0">开始</el-radio>
        <el-radio :value="1">停止</el-radio>
      </el-radio-group>
    </db-group-box>
    <db-group-box title="时间" class="blk">
      <div class="time-row">
        <el-input-number
          v-model="minutes"
          :min="0"
          :max="999"
          :disabled="op !== 0"
          controls-position="right"
          style="width: 120px" />
        <span>分</span>
        <el-input-number
          v-model="seconds"
          :min="0"
          :max="59"
          :disabled="op !== 0"
          controls-position="right"
          style="width: 120px" />
        <span>秒</span>
      </div>
    </db-group-box>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'

export default {
  name: 'Cmd124Timer',
  components: { DbGroupBox },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { op: 0, minutes: 0, seconds: 0 }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0]
        this.op = p[0] === 1 ? 1 : 0
        const total = Math.max(0, Number(p[1]) || 0)
        this.minutes = Math.floor(total / 60)
        this.seconds = total % 60
      },
    },
  },
  methods: {
    ok() {
      const total = Math.max(0, (Number(this.minutes) || 0) * 60 + (Number(this.seconds) || 0))
      this.$emit('confirm', [
        {
          code: 124,
          indent: (this.command && this.command.indent) || 0,
          parameters: this.op === 0 ? [0, total] : [1, 0],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.blk {
  margin-bottom: 10px;
}
.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
