<template>
  <div class="spirit-layout">
    <aside class="spirit-side">
      <div class="side-title">特性库</div>
      <div class="list-panel">
        <el-button size="small" type="primary" @click="$emit('add')">添加特性</el-button>
        <ul class="item-ul">
          <li
            v-for="key in traitKeys"
            :key="key"
            tabindex="0"
            data-editor-list-item
            :class="{ active: selectedKey === key }"
            @click="selectKey(key, $event)">
            {{ key }} · {{ config.traits[key] && config.traits[key].name }}
          </li>
        </ul>
      </div>
    </aside>
    <main class="spirit-main">
      <el-form v-if="trait" label-width="100px" class="spirit-form dense">
        <div class="form-grid">
          <el-form-item label="标识 Key">
            <el-input :model-value="selectedKey" disabled />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="trait.name" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="trait.type" class="ctrl-full">
              <el-option v-for="o in traitTypes" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item class="full" label="说明">
            <el-input v-model="trait.desc" type="textarea" :rows="2" />
          </el-form-item>
          <template v-if="trait.type === 'partyParam'">
            <el-form-item label="能力项">
              <el-select v-model="trait.paramId" class="ctrl-full">
                <el-option v-for="o in paramIds" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="加成倍率">
              <el-input-number v-model="trait.rate" :step="0.01" controls-position="right" class="ctrl-full" />
            </el-form-item>
          </template>
          <el-form-item v-if="trait.type === 'preemptive'" label="触发概率">
            <el-input-number v-model="trait.chance" :min="0" :max="1" :step="0.01" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item v-if="trait.type === 'goldRate' || trait.type === 'expRate'" label="倍率">
            <el-input-number v-model="trait.rate" :step="0.01" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item v-if="trait.type === 'special'" class="span-2" label="处理器键名">
            <el-input v-model="trait.handler" placeholder="TraitHandlers 键名" />
          </el-form-item>
          <el-form-item
            v-if="trait.type === 'special' && trait.handler === 'autoFarm'"
          >
            <template #label>挂机档位<FieldHelp :text="help.autoFarmTier" /></template>
            <el-select v-model="autoFarmTier" class="ctrl-full">
              <el-option label="低级 low" value="low" />
              <el-option label="中级 mid" value="mid" />
              <el-option label="高级 high" value="high" />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="trait.type === 'special' && trait.handler === 'autoFarm'"
          >
            <template #label>光标间隔<FieldHelp :text="help.autoFarmCursorDelay" /></template>
            <el-input-number
              v-model="autoFarmCursorDelay"
              :min="0"
              :max="60"
              controls-position="right"
              class="ctrl-full" />
          </el-form-item>
          <el-form-item class="full" label-width="0">
            <el-button type="danger" @click="$emit('remove')">删除此特性</el-button>
          </el-form-item>
        </div>
      </el-form>
    </main>
  </div>
</template>

<script>
import FieldHelp from '@/components/spirit/FieldHelp.vue'
import { PARAM_ID_OPTIONS, TRAIT_TYPE_OPTIONS } from '@/utils/spiritDefaults'

export default {
  name: 'SpiritTraitsPanel',
  components: { FieldHelp },
  props: {
    config: { type: Object, required: true },
    help: { type: Object, required: true },
    selectedKey: { type: String, default: '' },
  },
  emits: ['update:selectedKey', 'add', 'remove'],
  data() {
    return {
      paramIds: PARAM_ID_OPTIONS,
      traitTypes: TRAIT_TYPE_OPTIONS,
    }
  },
  computed: {
    traitKeys() {
      return Object.keys(this.config.traits || {})
    },
    trait() {
      if (!this.selectedKey) return null
      return this.config.traits[this.selectedKey] || null
    },
    autoFarmTier: {
      get() {
        const t = this.trait
        if (!t) return 'mid'
        if (!t.params) t.params = { tier: 'mid', cursorDelay: 8 }
        return t.params.tier || 'mid'
      },
      set(v) {
        const t = this.trait
        if (!t) return
        if (!t.params) t.params = {}
        t.params.tier = v
      },
    },
    autoFarmCursorDelay: {
      get() {
        const t = this.trait
        if (!t) return 8
        if (!t.params) t.params = { tier: 'mid', cursorDelay: 8 }
        if (t.params.cursorDelay == null) t.params.cursorDelay = t.params.tier === 'high' ? 0 : 8
        return t.params.cursorDelay
      },
      set(v) {
        const t = this.trait
        if (!t) return
        if (!t.params) t.params = {}
        const n = Number(v)
        t.params.cursorDelay = Number.isNaN(n) ? 8 : Math.max(0, Math.min(60, Math.round(n)))
      },
    },
  },
  methods: {
    selectKey(key, e) {
      this.$emit('update:selectedKey', key)
      if (e && e.currentTarget && e.currentTarget.focus) e.currentTarget.focus()
    },
  },
}
</script>

<style scoped src="./spiritShared.css"></style>
