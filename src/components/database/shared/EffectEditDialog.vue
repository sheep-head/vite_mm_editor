<template>
  <el-dialog
    :model-value="modelValue"
    title="效果"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="分类">
        <el-select v-model="categoryId" style="width: 160px" @change="onCategory">
          <el-option v-for="c in categories" :key="c.id" :label="c.label" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="种类">
        <el-select v-model="draft.code" style="width: 200px" @change="onCode">
          <el-option
            v-for="it in categoryItems"
            :key="it.code"
            :label="it.label"
            :value="it.code" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="meta && meta.data !== 'none'" label="对象">
        <el-select v-model="draft.dataId" filterable style="width: 240px">
          <el-option
            v-for="o in dataOptions"
            :key="o.value"
            :label="o.label"
            :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="meta && meta.v1 === 'percent'" label="比率">
        <el-input-number
          :model-value="Math.round((draft.value1 || 0) * 100)"
          :min="0"
          :max="1000"
          controls-position="right"
          @update:model-value="(v) => (draft.value1 = (Number(v) || 0) / 100)" />
        <span class="suffix">%</span>
      </el-form-item>
      <el-form-item v-else-if="meta && (meta.v1 === 'number' || meta.v1 === 'turns')" :label="meta.v1 === 'turns' ? '回合' : '数值'">
        <el-input-number v-model="draft.value1" controls-position="right" />
      </el-form-item>
      <el-form-item v-if="meta && meta.v2 === 'number'" label="固定值">
        <el-input-number v-model="draft.value2" controls-position="right" />
      </el-form-item>
      <el-form-item v-if="!meta" label="自定义">
        <el-input-number v-model="draft.code" :controls="false" class="w80" />
        <el-input-number v-model="draft.dataId" :controls="false" class="w80" />
        <el-input-number v-model="draft.value1" :step="0.01" :controls="false" class="w80" />
        <el-input-number v-model="draft.value2" :step="0.01" :controls="false" class="w80" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import {
  EFFECT_CATEGORIES,
  findEffectMeta,
  SPECIAL_EFFECT_LABELS,
} from './rpgDbConstants'
import { typeList, typeOptions, loadDataArray, paramLabels } from './systemLookups'

function recordOptions(fileName) {
  const arr = loadDataArray(fileName)
  const out = [{ value: 0, label: '无' }]
  for (let i = 1; i < arr.length; i++) {
    if (!arr[i]) continue
    out.push({
      value: i,
      label: `${String(i).padStart(4, '0')} ${arr[i].name || ''}`,
    })
  }
  return out
}

export default {
  name: 'EffectEditDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    effect: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      categories: EFFECT_CATEGORIES,
      categoryId: 'recover',
      draft: { code: 11, dataId: 0, value1: 0, value2: 0 },
    }
  },
  computed: {
    categoryItems() {
      const c = this.categories.find((x) => x.id === this.categoryId)
      return (c && c.items) || []
    },
    meta() {
      return findEffectMeta(this.draft.code)
    },
    dataOptions() {
      const m = this.meta
      if (!m || m.data === 'none') return []
      switch (m.data) {
        case 'state':
          return recordOptions('States')
        case 'param':
          return paramLabels().map((label, i) => ({ value: i, label }))
        case 'skill':
          return recordOptions('Skills')
        case 'commonEvent':
          return recordOptions('CommonEvents')
        case 'specialEffect':
          return SPECIAL_EFFECT_LABELS.map((label, i) => ({ value: i, label }))
        case 'element':
          return typeOptions(typeList('elements'), { includeNone: false })
        default:
          return []
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const e = this.effect || { code: 11, dataId: 0, value1: 0, value2: 0 }
        this.draft = {
          code: e.code != null ? e.code : 11,
          dataId: e.dataId != null ? e.dataId : 0,
          value1: e.value1 != null ? e.value1 : 0,
          value2: e.value2 != null ? e.value2 : 0,
        }
        this.syncCategory()
      },
    },
  },
  methods: {
    syncCategory() {
      for (const c of this.categories) {
        if (c.items.some((i) => i.code === this.draft.code)) {
          this.categoryId = c.id
          return
        }
      }
      this.categoryId = 'recover'
    },
    onCategory() {
      const first = this.categoryItems[0]
      if (first) {
        this.draft.code = first.code
        this.onCode()
      }
    },
    onCode() {
      const m = this.meta
      if (!m) return
      if (m.data !== 'none' && this.dataOptions.length) {
        const ok = this.dataOptions.some((o) => o.value === this.draft.dataId)
        if (!ok) this.draft.dataId = this.dataOptions[0].value
      } else {
        this.draft.dataId = 0
      }
      if (m.v1 === 'percent' && !this.draft.value1) this.draft.value1 = 1
      if (m.v1 === 'turns' && !this.draft.value1) this.draft.value1 = 5
    },
    confirm() {
      this.$emit('confirm', {
        code: Number(this.draft.code) || 0,
        dataId: Number(this.draft.dataId) || 0,
        value1: Number(this.draft.value1) || 0,
        value2: Number(this.draft.value2) || 0,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.suffix {
  margin-left: 4px;
  font-size: 12px;
}
.w80 {
  width: 72px;
  margin-right: 4px;
}
</style>
