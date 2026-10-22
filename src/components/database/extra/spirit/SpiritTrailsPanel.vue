<template>
  <div class="spirit-layout">
    <aside class="spirit-side">
      <div class="side-title">拖尾库</div>
      <div class="list-panel">
        <div class="list-actions">
          <el-button size="small" type="primary" @click="$emit('add')">添加</el-button>
          <el-button size="small" type="danger" :disabled="!selectedKey" @click="$emit('remove')">删除</el-button>
        </div>
        <ul class="item-ul">
          <li
            v-for="key in trailKeys"
            :key="key"
            tabindex="0"
            data-editor-list-item
            :class="{ active: selectedKey === key }"
            @click="selectKey(key, $event)">
            {{ key }} · {{ config.trails[key] && config.trails[key].name }}
            <span class="q-tag">〔{{ trailModeLabel(config.trails[key]) }}〕</span>
          </li>
        </ul>
      </div>
    </aside>
    <main class="spirit-main">
      <el-form v-if="trail" label-width="108px" class="spirit-form dense">
        <div class="form-grid">
          <el-form-item label="标识 Key">
            <el-input :model-value="selectedKey" disabled />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="trail.name" />
          </el-form-item>
          <el-form-item>
            <template #label>模式<FieldHelp :text="help.trailMode" /></template>
            <el-select v-model="trail.mode" class="ctrl-full">
              <el-option label="残影 afterimage" value="afterimage" />
              <el-option label="尾巴 tail" value="tail" />
            </el-select>
          </el-form-item>
          <el-form-item label="不透明度">
            <el-input-number v-model="trail.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="缩放">
            <el-input-number v-model="trail.scale" :step="0.05" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <template v-if="trail.mode === 'afterimage'">
            <el-form-item label="生成间隔">
              <el-input-number v-model="trail.interval" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="存活帧数">
              <el-input-number v-model="trail.life" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>最大数量<FieldHelp :text="help['trail.max']" /></template>
              <el-input-number v-model="trail.max" :min="1" :max="32" controls-position="right" class="ctrl-full" />
            </el-form-item>
          </template>
          <template v-else>
            <el-form-item label="节间距">
              <el-input-number v-model="trail.segmentGap" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="节数">
              <el-input-number v-model="trail.segments" :min="1" :max="24" controls-position="right" class="ctrl-full" />
            </el-form-item>
          </template>
        </div>

        <el-divider content-position="left">尾巴贴图（tail）</el-divider>
        <div class="form-grid" :class="{ 'is-disabled': trail.mode !== 'tail' }">
          <el-form-item class="full">
            <template #label>图片<FieldHelp :text="help['sprite.path']" /></template>
            <ImageAssetPicker v-model="trail.sprite.path" />
          </el-form-item>
          <el-form-item label="帧宽">
            <el-input-number v-model="trail.sprite.frameW" :min="1" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="帧高">
            <el-input-number v-model="trail.sprite.frameH" :min="1" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="横向帧">
            <el-input-number v-model="trail.sprite.frames" :min="1" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="纵向行">
            <el-input-number v-model="trail.sprite.rows" :min="1" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="帧等待">
            <el-input-number v-model="trail.sprite.frameWait" :min="1" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="锚点 X">
            <el-input-number v-model="trail.sprite.anchorX" :step="0.05" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="锚点 Y">
            <el-input-number v-model="trail.sprite.anchorY" :step="0.05" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="贴图缩放">
            <el-input-number v-model="trail.sprite.scale" :step="0.05" controls-position="right" class="ctrl-full" />
          </el-form-item>
        </div>

        <el-divider content-position="left">音效</el-divider>
        <div class="form-grid">
          <el-form-item>
            <template #label>启用 SE<FieldHelp :text="help.trailSfx" /></template>
            <el-switch v-model="trail.sfx.enabled" />
          </el-form-item>
          <el-form-item label="SE 文件名">
            <el-input v-model="trail.sfx.name" placeholder="audio/se 下无扩展名" />
          </el-form-item>
          <el-form-item label="音量">
            <el-input-number v-model="trail.sfx.volume" :min="0" :max="100" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="音调">
            <el-input-number v-model="trail.sfx.pitch" :min="50" :max="150" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="声道">
            <el-input-number v-model="trail.sfx.pan" :min="-100" :max="100" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item label="触发时机">
            <el-select v-model="trail.sfx.when" class="ctrl-full">
              <el-option label="移动中" value="moving" />
              <el-option label="待机" value="idle" />
              <el-option label="总是" value="always" />
            </el-select>
          </el-form-item>
          <el-form-item label="周期(帧)">
            <el-input-number v-model="trail.sfx.interval" :min="0" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item class="full" label="序列帧">
            <el-input
              :model-value="sfxFramesText"
              placeholder="逗号分隔，如 0,2,4"
              @update:model-value="onSfxFramesInput" />
          </el-form-item>
        </div>
      </el-form>
    </main>
  </div>
</template>

<script>
import FieldHelp from '@/components/spirit/FieldHelp.vue'
import ImageAssetPicker from '@/components/spirit/ImageAssetPicker.vue'

export default {
  name: 'SpiritTrailsPanel',
  components: { FieldHelp, ImageAssetPicker },
  props: {
    config: { type: Object, required: true },
    help: { type: Object, required: true },
    selectedKey: { type: String, default: '' },
  },
  emits: ['update:selectedKey', 'add', 'remove'],
  computed: {
    trailKeys() {
      return Object.keys(this.config.trails || {})
    },
    trail() {
      if (!this.selectedKey || !this.config.trails) return null
      return this.config.trails[this.selectedKey] || null
    },
    sfxFramesText() {
      const t = this.trail
      if (!t || !t.sfx || !Array.isArray(t.sfx.frames)) return ''
      return t.sfx.frames.join(',')
    },
  },
  methods: {
    selectKey(key, e) {
      this.$emit('update:selectedKey', key)
      if (e && e.currentTarget && e.currentTarget.focus) e.currentTarget.focus()
    },
    trailModeLabel(entry) {
      if (!entry) return ''
      return entry.mode === 'tail' ? '尾巴' : '残影'
    },
    onSfxFramesInput(val) {
      const t = this.trail
      if (!t || !t.sfx) return
      const parts = String(val || '')
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n) && n >= 0)
      t.sfx.frames = parts
    },
  },
}
</script>

<style scoped src="./spiritShared.css"></style>
