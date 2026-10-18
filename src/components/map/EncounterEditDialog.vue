<template>
  <el-dialog
    :model-value="modelValue"
    title="遇敌"
    width="440px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="敌群和权重">
      <div class="row">
        <span class="k">敌群</span>
        <id-name-field v-model="troopId" type="troop" :allow-none="false" width="100%" />
      </div>
      <div class="row">
        <span class="k">权重</span>
        <el-input-number v-model="weight" size="small" :min="1" :max="1000" controls-position="right" />
      </div>
    </db-group-box>
    <db-group-box title="出现范围" class="range-box">
      <el-radio-group v-model="rangeMode" class="range-radios">
        <el-radio value="all">整个地图</el-radio>
        <el-radio value="region">用区域编码指定</el-radio>
      </el-radio-group>
      <div class="regs">
        <el-input-number
          v-for="(n, i) in regions"
          :key="i"
          v-model="regions[i]"
          size="small"
          :min="0"
          :max="255"
          :disabled="rangeMode !== 'region'"
          controls-position="right" />
      </div>
    </db-group-box>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!troopId" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import IdNameField from '@/components/database/shared/IdNameField.vue'

function padRegions(set) {
  const src = Array.isArray(set) ? set : []
  return [0, 1, 2].map((i) => {
    const n = Number(src[i])
    return Number.isFinite(n) && n > 0 ? n : 0
  })
}

export default {
  name: 'EncounterEditDialog',
  components: { DbGroupBox, IdNameField },
  props: {
    modelValue: { type: Boolean, default: false },
    encounter: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      troopId: 1,
      weight: 5,
      rangeMode: 'all',
      regions: [0, 0, 0],
    }
  },
  watch: {
    modelValue(v) {
      if (!v) return
      const e = this.encounter || {}
      const set = Array.isArray(e.regionSet) ? e.regionSet.filter((n) => n > 0) : []
      this.troopId = Number(e.troopId) || 1
      this.weight = Math.max(1, Number(e.weight) || 5)
      this.rangeMode = set.length ? 'region' : 'all'
      this.regions = padRegions(set)
    },
  },
  methods: {
    confirm() {
      if (!this.troopId) return
      const regionSet = this.rangeMode === 'region'
        ? this.regions.map((n) => Number(n) || 0).filter((n) => n > 0)
        : []
      this.$emit('confirm', {
        troopId: this.troopId,
        weight: Math.max(1, Number(this.weight) || 1),
        regionSet,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.range-box {
  margin-top: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.k {
  flex: 0 0 36px;
  font-size: 12px;
}
.row :deep(.id-name-field) {
  flex: 1;
  min-width: 0;
}
.row :deep(.el-input) {
  flex: 1;
}
.range-radios {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 8px;
}
.regs {
  display: flex;
  gap: 8px;
  padding-left: 22px;
}
.regs :deep(.el-input-number) {
  width: 88px;
}
</style>
