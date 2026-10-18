<template>
  <div class="id-name-field">
    <el-input :model-value="display" size="small" readonly :disabled="disabled" :style="{ width: width }" />
    <el-button size="small" :disabled="disabled" @click="open = true">...</el-button>
    <id-name-picker-dialog
      v-model="open"
      :type="type"
      :model-id="modelValue || 0"
      :leading="leading"
      @confirm="onConfirm" />
  </div>
</template>

<script>
import IdNamePickerDialog from '@/components/map/pickers/IdNamePickerDialog.vue'
import { formatRecordName, loadSystem } from './systemLookups'

const FILE_MAP = {
  class: 'Classes',
  skill: 'Skills',
  animation: 'Animations',
  weapon: 'Weapons',
  armor: 'Armors',
  item: 'Items',
  actor: 'Actors',
  state: 'States',
  enemy: 'Enemies',
  troop: 'Troops',
  commonEvent: 'CommonEvents',
}

export default {
  name: 'IdNameField',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Number, default: 0 },
    type: { type: String, required: true },
    width: { type: String, default: '180px' },
    allowNone: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    /** id 为 0 时的显示，并作为选择列表首行 */
    zeroLabel: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  data() {
    return { open: false }
  },
  computed: {
    leading() {
      return this.zeroLabel ? { id: 0, name: this.zeroLabel } : null
    },
    display() {
      if (this.disabled) return ''
      if ((Number(this.modelValue) || 0) <= 0 && this.zeroLabel) return this.zeroLabel
      if (this.type === 'switch' || this.type === 'variable') {
        const sys = loadSystem()
        const arr = this.type === 'switch' ? (sys.switches || []) : (sys.variables || [])
        const id = Number(this.modelValue) || 0
        const name = arr[id] || ''
        const pad = `#${String(id).padStart(4, '0')}`
        return name ? `${pad} ${name}` : pad
      }
      const file = FILE_MAP[this.type]
      if (!file) return String(this.modelValue || 0)
      return formatRecordName(file, this.modelValue, this.allowNone ? '无' : '—')
    },
  },
  methods: {
    onConfirm(id) {
      this.$emit('update:modelValue', Number(id) || 0)
    },
  },
}
</script>

<style scoped>
.id-name-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
