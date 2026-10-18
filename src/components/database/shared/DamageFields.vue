<template>
  <el-form size="small" label-width="72px" class="damage-fields" @submit.prevent>
    <el-form-item label="类型">
      <el-select v-model="dmg.type" style="width: 140px">
        <el-option
          v-for="o in damageTypes"
          :key="o.value"
          :label="o.label"
          :value="o.value" />
      </el-select>
    </el-form-item>
    <el-form-item label="属性">
      <el-select v-model="dmg.elementId" :disabled="disabled" style="width: 140px">
        <el-option
          v-for="o in elementOpts"
          :key="o.value"
          :label="o.label"
          :value="o.value" />
      </el-select>
    </el-form-item>
    <el-form-item label="计算公式">
      <el-input v-model="dmg.formula" :disabled="disabled" />
    </el-form-item>
    <el-form-item label="分散度">
      <el-input-number
        v-model="dmg.variance"
        :min="0"
        :max="100"
        :disabled="disabled"
        controls-position="right" />
      <span class="suffix">%</span>
    </el-form-item>
    <el-form-item label="暴击">
      <el-select
        :model-value="dmg.critical ? 1 : 0"
        :disabled="disabled"
        style="width: 100px"
        @update:model-value="(v) => (dmg.critical = !!v)">
        <el-option :value="1" label="是" />
        <el-option :value="0" label="否" />
      </el-select>
    </el-form-item>
  </el-form>
</template>

<script>
import { DAMAGE_TYPE_OPTIONS } from './rpgDbConstants'
import { typeList, typeOptions } from './systemLookups'

export default {
  name: 'DamageFields',
  props: {
    modelValue: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    dmg() {
      if (!this.modelValue || typeof this.modelValue !== 'object') {
        const d = { type: 0, elementId: 0, formula: '0', variance: 20, critical: false }
        this.$emit('update:modelValue', d)
        return d
      }
      return this.modelValue
    },
    disabled() {
      return !(this.dmg && this.dmg.type > 0)
    },
    damageTypes() {
      return DAMAGE_TYPE_OPTIONS
    },
    elementOpts() {
      return typeOptions(typeList('elements'), { includeNone: true, noneLabel: '无' })
    },
  },
}
</script>

<style scoped>
.suffix {
  margin-left: 4px;
  font-size: 12px;
}
</style>
