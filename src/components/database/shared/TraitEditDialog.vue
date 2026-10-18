<template>
  <el-dialog
    :model-value="modelValue"
    title="特性"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-tabs v-model="categoryId" type="card" @tab-change="onCategory">
      <el-tab-pane v-for="c in categories" :key="c.id" :label="c.label" :name="c.id">
        <div class="trait-rows">
          <div
            v-for="it in c.items"
            :key="it.code"
            class="trait-row"
            :class="{ active: draft.code === it.code }"
            @click="selectCode(it.code)">
            <el-radio :model-value="draft.code" :value="it.code" @change="selectCode(it.code)">
              {{ it.label }}
            </el-radio>
            <div class="trait-ctrls" @click.stop>
              <template v-if="it.picker === 'select'">
                <el-select
                  :model-value="draft.code === it.code ? draft.dataId : undefined"
                  :disabled="draft.code !== it.code"
                  filterable
                  size="small"
                  style="width: 160px"
                  @update:model-value="(v) => setDataId(v)">
                  <el-option
                    v-for="o in optionsFor(it)"
                    :key="o.value"
                    :label="o.label"
                    :value="o.value" />
                </el-select>
              </template>
              <template v-else-if="it.picker === 'id'">
                <el-input
                  :model-value="draft.code === it.code ? idLabel(it) : ''"
                  readonly
                  size="small"
                  style="width: 160px"
                  :disabled="draft.code !== it.code" />
                <el-button
                  size="small"
                  :disabled="draft.code !== it.code"
                  @click="openIdPicker(it)">
                  ...
                </el-button>
              </template>
              <div
                v-if="it.valueKind === 'percent' || it.valueKind === 'percentPlus'"
                class="trait-val">
                <span class="prefix">{{ it.valueKind === 'percentPlus' ? '+' : '*' }}</span>
                <el-input-number
                  :model-value="draft.code === it.code ? pctUi : undefined"
                  :disabled="draft.code !== it.code"
                  :min="0"
                  :max="1000"
                  size="small"
                  controls-position="right"
                  @update:model-value="setPct" />
                <span class="suffix">%</span>
              </div>
              <div v-else-if="it.valueKind === 'number'" class="trait-val">
                <el-input-number
                  :model-value="draft.code === it.code ? draft.value : undefined"
                  :disabled="draft.code !== it.code"
                  :step="1"
                  size="small"
                  controls-position="right"
                  @update:model-value="(v) => (draft.value = Number(v) || 0)" />
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <id-name-picker-dialog
      v-model="idPickerVisible"
      :type="idPickerType"
      :model-id="draft.dataId || 1"
      @confirm="onIdPicked" />
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNamePickerDialog from '@/components/map/pickers/IdNamePickerDialog.vue'
import {
  TRAIT_CATEGORIES,
  findTraitMeta,
  XPARAM_LABELS,
  SPARAM_LABELS,
  SPECIAL_FLAG_LABELS,
  COLLAPSE_LABELS,
  PARTY_ABILITY_LABELS,
  SLOT_TYPE_LABELS,
} from './rpgDbConstants'
import {
  typeList,
  typeOptions,
  loadDataArray,
  paramLabels,
  formatRecordName,
} from './systemLookups'

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

function labelOptions(labels) {
  return labels.map((label, i) => ({ value: i, label }))
}

const DATA_TO_PICKER = {
  state: 'state',
  skill: 'skill',
}

export default {
  name: 'TraitEditDialog',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    trait: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      categories: TRAIT_CATEGORIES,
      categoryId: 'rate',
      draft: { code: 11, dataId: 1, value: 1 },
      idPickerVisible: false,
      idPickerType: 'state',
    }
  },
  computed: {
    meta() {
      return findTraitMeta(this.draft.code)
    },
    pctUi() {
      return Math.round((Number(this.draft.value) || 0) * 100)
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const t = this.trait || { code: 11, dataId: 1, value: 1 }
        this.draft = {
          code: t.code != null ? t.code : 11,
          dataId: t.dataId != null ? t.dataId : 0,
          value: t.value != null ? t.value : 1,
        }
        this.syncCategory()
      },
    },
  },
  methods: {
    optionsFor(it) {
      switch (it.data) {
        case 'element':
          return typeOptions(typeList('elements'), { includeNone: false })
        case 'param':
          return paramLabels().map((label, i) => ({ value: i, label }))
        case 'xparam':
          return labelOptions(XPARAM_LABELS)
        case 'sparam':
          return labelOptions(SPARAM_LABELS)
        case 'state':
          return recordOptions('States')
        case 'skill':
          return recordOptions('Skills')
        case 'stype':
          return typeOptions(typeList('skillTypes'), { includeNone: false })
        case 'wtype':
          return typeOptions(typeList('weaponTypes'), { includeNone: false })
        case 'atype':
          return typeOptions(typeList('armorTypes'), { includeNone: false })
        case 'etype':
          return typeOptions(typeList('equipTypes'), { includeNone: false })
        case 'slotType':
          return labelOptions(SLOT_TYPE_LABELS)
        case 'specialFlag':
          return labelOptions(SPECIAL_FLAG_LABELS)
        case 'collapse':
          return labelOptions(COLLAPSE_LABELS)
        case 'partyAbility':
          return labelOptions(PARTY_ABILITY_LABELS)
        default:
          return []
      }
    },
    idLabel(it) {
      if (it.data === 'state') return formatRecordName('States', this.draft.dataId)
      if (it.data === 'skill') return formatRecordName('Skills', this.draft.dataId)
      return String(this.draft.dataId || '')
    },
    syncCategory() {
      for (const c of this.categories) {
        if (c.items.some((i) => i.code === this.draft.code)) {
          this.categoryId = c.id
          return
        }
      }
      this.categoryId = 'rate'
    },
    onCategory() {
      const c = this.categories.find((x) => x.id === this.categoryId)
      const first = c && c.items[0]
      if (first && !c.items.some((i) => i.code === this.draft.code)) {
        this.selectCode(first.code)
      }
    },
    selectCode(code) {
      if (this.draft.code === code) return
      this.draft.code = code
      const m = findTraitMeta(code)
      if (!m) return
      const opts = this.optionsFor(m)
      if (m.data !== 'none' && opts.length) {
        const ok = opts.some((o) => o.value === this.draft.dataId)
        if (!ok) this.draft.dataId = opts[0].value
      } else {
        this.draft.dataId = 0
      }
      if (m.valueKind === 'percent' || m.valueKind === 'percentPlus') {
        if (this.draft.value == null || this.draft.value === 0) this.draft.value = 1
      } else if (m.valueKind === 'none') {
        this.draft.value = 1
      } else if (m.valueKind === 'number' && this.draft.value == null) {
        this.draft.value = 0
      }
    },
    setDataId(v) {
      this.draft.dataId = v
    },
    setPct(v) {
      this.draft.value = (Number(v) || 0) / 100
    },
    openIdPicker(it) {
      this.idPickerType = DATA_TO_PICKER[it.data] || 'state'
      this.idPickerVisible = true
    },
    onIdPicked(id) {
      this.draft.dataId = id || 0
    },
    confirm() {
      this.$emit('confirm', {
        code: Number(this.draft.code) || 0,
        dataId: Number(this.draft.dataId) || 0,
        value: Number(this.draft.value) || 0,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.trait-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
}
.trait-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px;
  align-items: start;
  padding: 4px 0;
}
.trait-ctrls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.trait-val {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  margin-top: 2px;
}
.prefix,
.suffix {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
</style>
