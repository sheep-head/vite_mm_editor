<template>
  <div class="sys-sec" v-if="data">
    <system1-panel v-if="section === 's1'" :data="data" />
    <system2-panel v-else-if="section === 's2'" :data="data" />
    <system-types-panel v-else-if="section === 'types'" :data="data" />
    <system-terms-panel v-else-if="section === 'terms'" :data="data" />
  </div>
  <div v-else class="sys-sec sys-empty">System 未加载</div>
</template>

<script>
import System1Panel from './System1Panel.vue'
import System2Panel from './System2Panel.vue'
import SystemTypesPanel from './SystemTypesPanel.vue'
import SystemTermsPanel from './SystemTermsPanel.vue'
import { systemState, loadSystemSession, saveSystemSession } from './shared/systemSession'

export default {
  name: 'SystemSectionPanel',
  components: { System1Panel, System2Panel, SystemTypesPanel, SystemTermsPanel },
  props: {
    section: { type: String, default: 's1' },
  },
  data() {
    return { mute: true }
  },
  computed: {
    data() {
      return systemState.data
    },
  },
  watch: {
    data: {
      deep: true,
      handler() {
        if (this.mute) return
        systemState.dirty = true
      },
    },
  },
  created() {
    if (!systemState.data) {
      const ok = loadSystemSession()
      if (!ok) this.$message.error('System 加载失败')
    }
    this.$nextTick(() => {
      this.mute = false
    })
  },
  methods: {
    save() {
      const ok = saveSystemSession()
      if (ok) this.$message.success('System 已保存')
      else this.$message.error('System 保存失败')
      return ok
    },
    reload() {
      this.mute = true
      const ok = loadSystemSession()
      if (!ok) this.$message.error('System 加载失败')
      this.$nextTick(() => {
        this.mute = false
      })
    },
    isDirty() {
      return systemState.dirty
    },
  },
}
</script>

<style scoped>
.sys-sec {
  height: 100%;
  overflow: auto;
  padding: 8px;
  box-sizing: border-box;
}
.sys-empty {
  color: var(--el-text-color-secondary);
}
</style>
