<template>
  <el-dialog
    :model-value="modelValue"
    title="共通事件"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="共通事件">
        <el-input-number v-model="eventId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
        <span v-if="eventName" class="hint">{{ eventName }}</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog
      v-model="pickerVisible"
      type="commonEvent"
      :model-id="eventId"
      @confirm="onPick" />
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'

export default {
  name: 'Cmd117CommonEvent',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { eventId: 1, pickerVisible: false }
  },
  computed: {
    eventName() {
      try {
        const list = DataManager.$loadDataSync('CommonEvents', false, false) || []
        const ev = list[this.eventId]
        return ev && ev.name ? ev.name : ''
      } catch (e) {
        return ''
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1]
        this.eventId = p[0] || 1
      },
    },
  },
  methods: {
    onPick(id) {
      this.eventId = id
    },
    ok() {
      this.$emit('confirm', [
        {
          code: 117,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.eventId],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.hint {
  margin-left: 8px;
  color: var(--app-text-muted, #888);
  font-size: 12px;
}
</style>
