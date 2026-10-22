<template>
  <div class="spirit-page full-height">
    <div class="spirit-tabbar">
      <el-radio-group v-model="tab" size="small">
        <el-radio-button value="global">全局</el-radio-button>
        <el-radio-button value="traits">特性库</el-radio-button>
        <el-radio-button value="trails">拖尾库</el-radio-button>
        <el-radio-button value="spirits">精灵列表</el-radio-button>
      </el-radio-group>
    </div>

    <SpiritGlobalForm
      v-show="tab === 'global'"
      :config="config"
      :help="help" />

    <SpiritTraitsPanel
      v-show="tab === 'traits'"
      v-model:selected-key="selectedTraitKey"
      :config="config"
      :help="help"
      @add="addTrait"
      @remove="removeTrait" />

    <SpiritTrailsPanel
      v-show="tab === 'trails'"
      v-model:selected-key="selectedTrailKey"
      :config="config"
      :help="help"
      @add="addTrail"
      @remove="removeTrail" />

    <SpiritListPanel
      v-show="tab === 'spirits'"
      v-model:spirit-index="spiritIndex"
      :config="config"
      :help="help"
      @add="addSpirit"
      @dup="dupSpirit"
      @remove="removeSpirit" />
  </div>
</template>

<script>
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'
import { useEditorData } from '@/composables/useEditorData'
import {
  createDefaultSpiritConfig,
  createEmptySpirit,
  createEmptyTrailEntry,
  migrateSpiritConfig,
  SPIRIT_FIELD_HELP,
} from '@/utils/spiritDefaults'
import SpiritGlobalForm from './SpiritGlobalForm.vue'
import SpiritTraitsPanel from './SpiritTraitsPanel.vue'
import SpiritTrailsPanel from './SpiritTrailsPanel.vue'
import SpiritListPanel from './SpiritListPanel.vue'

const spiritStore = useEditorData({ fileName: 'SpiritCompanion' })

export default {
  name: 'SpiritCompanionEditor',
  components: {
    SpiritGlobalForm,
    SpiritTraitsPanel,
    SpiritTrailsPanel,
    SpiritListPanel,
  },
  mixins: [CONTEXTMENU_SLOT],
  data() {
    return {
      meta: { dataType: 'spiritCompanion' },
      tab: 'spirits',
      config: createDefaultSpiritConfig(),
      selectedTraitKey: '',
      selectedTrailKey: '',
      spiritIndex: 0,
      help: SPIRIT_FIELD_HELP,
      ready: false,
    }
  },
  computed: {
    currentTrait() {
      if (!this.selectedTraitKey) return null
      return this.config.traits[this.selectedTraitKey] || null
    },
    currentTrail() {
      if (!this.selectedTrailKey || !this.config.trails) return null
      return this.config.trails[this.selectedTrailKey] || null
    },
    currentSpirit() {
      if (!this.config.spirits || this.spiritIndex < 0) return null
      return this.config.spirits[this.spiritIndex] || null
    },
    traitKeys() {
      return Object.keys(this.config.traits || {})
    },
    trailKeys() {
      return Object.keys(this.config.trails || {})
    },
  },
  watch: {
    config: {
      deep: true,
      handler() {
        if (this.ready) this.changed = true
      },
    },
  },
  methods: {
    $onSave() {
      if (!this.changed) return
      if (spiritStore.save(this.config)) {
        this.$message.success('保存成功（data/SpiritCompanion.json → $extraData.spiritCompanion）')
        this.changed = false
      } else {
        this.$message.error('保存失败')
      }
    },
    $onCopy() {
      if (this.tab === 'spirits' && this.currentSpirit) {
        this.$clipboard.set(JSON.stringify({ dataType: this.meta.dataType, data: this.currentSpirit }))
        this.$message.success('复制成功')
        return
      }
      if (this.tab === 'traits' && this.currentTrait) {
        this.$clipboard.set(JSON.stringify({
          dataType: this.meta.dataType + ':trait',
          key: this.selectedTraitKey,
          data: this.currentTrait,
        }))
        this.$message.success('复制成功')
        return
      }
      if (this.tab === 'trails' && this.currentTrail) {
        this.$clipboard.set(JSON.stringify({
          dataType: this.meta.dataType + ':trail',
          key: this.selectedTrailKey,
          data: this.currentTrail,
        }))
        this.$message.success('复制成功')
      }
    },
    $onPaste() {
      try {
        const text = this.$clipboard.get()
        if (!text) return
        const item = JSON.parse(text)
        if (this.tab === 'spirits' && item.dataType === this.meta.dataType && item.data && this.spiritIndex >= 0) {
          const actorId = this.currentSpirit.actorId
          const next = JSON.parse(JSON.stringify(item.data))
          next.actorId = actorId
          this.config.spirits.splice(this.spiritIndex, 1, next)
          this.$message.success('粘贴成功')
          return
        }
        if (this.tab === 'traits' && item.dataType === this.meta.dataType + ':trait' && item.data && this.selectedTraitKey) {
          this.config.traits[this.selectedTraitKey] = JSON.parse(JSON.stringify(item.data))
          this.$message.success('粘贴成功')
          return
        }
        if (this.tab === 'trails' && item.dataType === this.meta.dataType + ':trail' && item.data && this.selectedTrailKey) {
          this.config.trails[this.selectedTrailKey] = {
            ...createEmptyTrailEntry(),
            ...JSON.parse(JSON.stringify(item.data)),
            sfx: {
              ...createEmptyTrailEntry().sfx,
              ...(item.data.sfx || {}),
            },
            sprite: {
              ...createEmptyTrailEntry().sprite,
              ...(item.data.sprite || {}),
            },
          }
          this.$message.success('粘贴成功')
        }
      } catch (e) {
        console.log(e)
        this.$message.error('粘贴失败,无法解析粘贴内容')
      }
    },
    addTrait() {
      const key = 'trait' + Date.now().toString(36)
      this.config.traits[key] = {
        name: '新特性',
        desc: '',
        type: 'partyParam',
        paramId: 2,
        rate: 0.1,
      }
      this.selectedTraitKey = key
      this.tab = 'traits'
    },
    removeTrait() {
      if (!this.selectedTraitKey) return
      delete this.config.traits[this.selectedTraitKey]
      this.selectedTraitKey = this.traitKeys[0] || ''
    },
    addTrail() {
      if (!this.config.trails) this.config.trails = {}
      const key = 'trail' + Date.now().toString(36)
      this.config.trails[key] = createEmptyTrailEntry()
      this.selectedTrailKey = key
      this.tab = 'trails'
    },
    removeTrail() {
      if (!this.selectedTrailKey || !this.config.trails) return
      const key = this.selectedTrailKey
      delete this.config.trails[key]
      if (Array.isArray(this.config.spirits)) {
        this.config.spirits.forEach((sp) => {
          if (sp && sp.trail && sp.trail.trailId === key) sp.trail.trailId = ''
        })
      }
      this.selectedTrailKey = this.trailKeys[0] || ''
    },
    addSpirit() {
      const id = (this.config.spirits.reduce((m, s) => Math.max(m, Number(s.actorId) || 0), 0) || 0) + 1
      this.config.spirits.push(createEmptySpirit(id))
      this.spiritIndex = this.config.spirits.length - 1
      this.tab = 'spirits'
    },
    dupSpirit() {
      if (!this.currentSpirit) return
      const copy = JSON.parse(JSON.stringify(this.currentSpirit))
      copy.actorId = (Number(copy.actorId) || 1) + 1
      copy.name = (copy.name || '') + ' 副本'
      this.config.spirits.push(copy)
      this.spiritIndex = this.config.spirits.length - 1
    },
    removeSpirit() {
      if (this.spiritIndex < 0) return
      this.config.spirits.splice(this.spiritIndex, 1)
      this.spiritIndex = Math.min(this.spiritIndex, this.config.spirits.length - 1)
    },
  },
  created() {
    this.$openLoading()
    let data = spiritStore.load()
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
      data = createDefaultSpiritConfig()
      spiritStore.save(data)
      this.$message.info('已生成默认 data/SpiritCompanion.json')
    }
    migrateSpiritConfig(data)
    if (!data.traits) data.traits = {}
    if (!data.trails) data.trails = {}
    if (!Array.isArray(data.spirits)) data.spirits = []
    if (data.version == null) data.version = 1
    this.config = data
    this.selectedTraitKey = Object.keys(this.config.traits)[0] || ''
    this.selectedTrailKey = Object.keys(this.config.trails)[0] || ''
    this.spiritIndex = this.config.spirits.length ? 0 : -1
    this.$nextTick(() => {
      this.ready = true
      this.changed = false
      this.$closeLoading()
    })
  },
}
</script>

<style scoped>
.spirit-page {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.spirit-tabbar {
  flex-shrink: 0;
  padding: 6px 10px;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
}
.spirit-page > :deep(.spirit-layout) {
  flex: 1;
  min-height: 0;
}
</style>
