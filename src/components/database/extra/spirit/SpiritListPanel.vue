<template>
  <div class="spirit-layout">
    <aside class="spirit-side">
      <div class="side-title">精灵列表</div>
      <div class="list-panel">
        <div class="list-actions">
          <el-button size="small" type="primary" @click="$emit('add')">添加</el-button>
          <el-button size="small" :disabled="spiritIndex < 0" @click="$emit('dup')">复制</el-button>
          <el-button size="small" type="danger" :disabled="spiritIndex < 0" @click="$emit('remove')">删除</el-button>
        </div>
        <ul class="item-ul">
          <li
            v-for="(sp, i) in config.spirits"
            :key="i"
            tabindex="0"
            data-editor-list-item
            :class="{ active: spiritIndex === i }"
            :style="{ color: qualityEditorColor(sp.quality) }"
            @click="selectIndex(i, $event)">
            #{{ sp.actorId }} {{ sp.name || '(未命名)' }}
            <span class="q-tag">〔{{ qualityLabel(sp.quality) }}〕</span>
          </li>
        </ul>
      </div>
    </aside>
    <main class="spirit-main">
      <div v-if="spirit" class="spirit-editor">
        <el-form label-width="108px" class="spirit-form dense">
          <el-divider content-position="left">身份</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>绑定角色<FieldHelp :text="help.actorId" /></template>
              <el-select v-model="spirit.actorId" clearable filterable placeholder="请选择" class="ctrl-full">
                <template v-for="item in actors" :key="item && item.id">
                  <el-option v-if="item" :label="item.id + ':' + item.name" :value="item.id" />
                </template>
              </el-select>
            </el-form-item>
            <el-form-item>
              <template #label>名称<FieldHelp :text="help.name" /></template>
              <el-input v-model="spirit.name" />
            </el-form-item>
            <el-form-item>
              <template #label>品级<FieldHelp :text="help.quality" /></template>
              <el-select v-model="spirit.quality" class="ctrl-full">
                <el-option
                  v-for="key in qualityKeys"
                  :key="key"
                  :label="qualities[key].name"
                  :value="key">
                  <span class="q-opt">
                    <i
                      class="q-dot"
                      :class="{ 'is-normal': key === 'normal' }"
                      :style="{ background: qualities[key].color }" />
                    <span :style="{ color: qualityEditorColor(key) }">{{ qualities[key].name }}</span>
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item>
              <template #label>无敌<FieldHelp :text="help.invincible" /></template>
              <el-switch v-model="spirit.invincible" />
            </el-form-item>
            <el-form-item>
              <template #label>解锁开关<FieldHelp :text="help.unlockSwitchId" /></template>
              <el-input-number v-model="spirit.unlockSwitchId" :min="0" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item class="full">
              <template #label>介绍<FieldHelp :text="help.desc" /></template>
              <el-input v-model="spirit.desc" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item class="full" label="特性引用">
              <el-select v-model="spirit.traits" multiple filterable class="ctrl-full" placeholder="选择特性">
                <el-option v-for="k in traitKeys" :key="k" :label="k + ' · ' + (config.traits[k] && config.traits[k].name)" :value="k" />
              </el-select>
            </el-form-item>
          </div>

          <el-divider content-position="left">序列帧外观</el-divider>
          <div class="form-grid">
            <el-form-item class="full">
              <template #label>图片<FieldHelp :text="help['sprite.path']" /></template>
              <ImageAssetPicker v-model="spirit.sprite.path" />
            </el-form-item>
            <el-form-item>
              <template #label>帧宽<FieldHelp :text="help['sprite.frameW']" /></template>
              <el-input-number v-model="spirit.sprite.frameW" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>帧高<FieldHelp :text="help['sprite.frameH']" /></template>
              <el-input-number v-model="spirit.sprite.frameH" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>切帧间隔<FieldHelp :text="help['sprite.frameWait']" /></template>
              <el-input-number v-model="spirit.sprite.frameWait" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>横向帧数<FieldHelp :text="help['sprite.frames']" /></template>
              <el-input-number v-model="spirit.sprite.frames" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>纵向行数<FieldHelp :text="help['sprite.rows']" /></template>
              <el-input-number v-model="spirit.sprite.rows" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>缩放<FieldHelp :text="help['sprite.scale']" /></template>
              <el-input-number v-model="spirit.sprite.scale" :min="0.1" :step="0.1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>锚点 X<FieldHelp :text="help['sprite.anchorX']" /></template>
              <el-input-number v-model="spirit.sprite.anchorX" :step="0.1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>锚点 Y<FieldHelp :text="help['sprite.anchorY']" /></template>
              <el-input-number v-model="spirit.sprite.anchorY" :step="0.1" controls-position="right" class="ctrl-full" />
            </el-form-item>
          </div>

          <el-divider content-position="left">浮动</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>启用<FieldHelp :text="help['float.enabled']" /></template>
              <el-switch v-model="spirit.float.enabled" />
            </el-form-item>
            <el-form-item>
              <template #label>振幅<FieldHelp :text="help['float.amplitude']" /></template>
              <el-input-number v-model="spirit.float.amplitude" :min="0" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>速度<FieldHelp :text="help['float.speed']" /></template>
              <el-input-number v-model="spirit.float.speed" :min="0.01" :step="0.01" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="跟随中浮动">
              <el-switch v-model="spirit.float.whileFollow" />
            </el-form-item>
            <el-form-item label="待机浮动">
              <el-switch v-model="spirit.float.whileIdle" />
            </el-form-item>
          </div>

          <el-divider content-position="left">拖尾</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>启用<FieldHelp :text="help['trail.enabled']" /></template>
              <el-switch v-model="spirit.trail.enabled" />
            </el-form-item>
            <el-form-item>
              <template #label>拖尾库<FieldHelp :text="help['trail.trailId']" /></template>
              <el-select v-model="spirit.trail.trailId" clearable placeholder="空=内联残影" class="ctrl-full">
                <el-option
                  v-for="key in trailKeys"
                  :key="key"
                  :label="`${key} · ${(config.trails[key] && config.trails[key].name) || ''}`"
                  :value="key" />
              </el-select>
            </el-form-item>
            <template v-if="!spirit.trail.trailId">
              <el-form-item label="生成间隔">
                <el-input-number v-model="spirit.trail.interval" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="存活帧数">
                <el-input-number v-model="spirit.trail.life" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>最大数量<FieldHelp :text="help['trail.max']" /></template>
                <el-input-number v-model="spirit.trail.max" :min="1" :max="32" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="不透明度">
                <el-input-number v-model="spirit.trail.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="缩放">
                <el-input-number v-model="spirit.trail.scale" :step="0.05" controls-position="right" class="ctrl-full" />
              </el-form-item>
            </template>
            <el-form-item v-else class="full">
              <span class="trail-lib-hint">已绑定库「{{ spirit.trail.trailId }}」，参数请在拖尾库页调整</span>
            </el-form-item>
            <el-form-item>
              <template #label>演示移动<FieldHelp :text="help['trail.demoMove']" /></template>
              <el-switch v-model="demoMove" />
            </el-form-item>
            <el-form-item label="预览 SE">
              <el-switch v-model="playSfx" />
            </el-form-item>
          </div>

          <el-divider content-position="left">特效</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>缩放呼吸<FieldHelp :text="help['fx.scalePulse']" /></template>
              <el-input-number v-model="spirit.fx.scalePulse" :min="0" :step="0.01" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="透明度呼吸">
              <el-input-number v-model="spirit.fx.opacityPulse" :min="0" :max="255" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="按侧翻转">
              <el-switch v-model="spirit.fx.flipBySide" />
            </el-form-item>
            <el-form-item>
              <template #label>前冲像素<FieldHelp :text="help['fx.lungePx']" /></template>
              <el-input-number v-model="spirit.fx.lungePx" :min="0" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="发光不透明度">
              <el-input-number v-model="spirit.fx.glowOpacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
            </el-form-item>
          </div>

          <el-divider content-position="left">轮廓</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>启用<FieldHelp :text="help['outline.enabled']" /></template>
              <el-switch v-model="spirit.outline.enabled" />
            </el-form-item>
            <el-form-item>
              <template #label>外扩<FieldHelp :text="help['outline.expand']" /></template>
              <el-input-number v-model="spirit.outline.expand" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="颜色">
              <el-color-picker v-model="spirit.outline.color" color-format="hex" />
              <span class="color-hex">{{ spirit.outline.color }}</span>
            </el-form-item>
            <el-form-item label="不透明度">
              <el-input-number v-model="spirit.outline.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="透明阈值">
              <el-input-number v-model="spirit.outline.alphaThreshold" :min="0" :max="255" controls-position="right" class="ctrl-full" />
            </el-form-item>
          </div>

          <el-divider content-position="left">懒跟随</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>启用<FieldHelp :text="help['lazy.enabled']" /></template>
              <el-switch v-model="spirit.lazy.enabled" />
            </el-form-item>
            <el-form-item>
              <template #label>待机等待帧<FieldHelp :text="help['lazy.idleAfterFrames']" /></template>
              <el-input-number v-model="spirit.lazy.idleAfterFrames" :min="0" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>追赶距离<FieldHelp :text="help['lazy.catchUpTiles']" /></template>
              <el-input-number v-model="spirit.lazy.catchUpTiles" :min="0.1" :step="0.1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>追赶平滑<FieldHelp :text="help['lazy.catchUpLerp']" /></template>
              <el-input-number v-model="spirit.lazy.catchUpLerp" :min="0" :step="0.01" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>待机环绕<FieldHelp :text="help['lazy.idleOrbit']" /></template>
              <el-switch v-model="spirit.lazy.idleOrbit" />
            </el-form-item>
            <el-form-item>
              <template #label>环绕半径<FieldHelp :text="help['lazy.orbitRadius']" /></template>
              <div class="ctrl-with-btn">
                <el-input-number v-model="spirit.lazy.orbitRadius" :step="0.05" controls-position="right" class="ctrl-full" />
                <el-button link type="primary" @click="spirit.lazy.orbitRadius = null">用全局</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <template #label>环绕角速度<FieldHelp :text="help['lazy.orbitSpeed']" /></template>
              <div class="ctrl-with-btn">
                <el-input-number v-model="spirit.lazy.orbitSpeed" :step="0.005" controls-position="right" class="ctrl-full" />
                <el-button link type="primary" @click="spirit.lazy.orbitSpeed = null">用全局</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <template #label>跟随平滑<FieldHelp :text="help['lazy.followLerp']" /></template>
              <div class="ctrl-with-btn">
                <el-input-number v-model="spirit.lazy.followLerp" :step="0.01" controls-position="right" class="ctrl-full" />
                <el-button link type="primary" @click="spirit.lazy.followLerp = null">用全局</el-button>
              </div>
            </el-form-item>
          </div>

          <el-divider content-position="left">气泡对话</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>启用<FieldHelp :text="help['bubble.enabled']" /></template>
              <el-switch v-model="spirit.bubble.enabled" />
            </el-form-item>
            <el-form-item>
              <template #label>主题<FieldHelp :text="help['bubble.theme']" /></template>
              <el-select v-model="spirit.bubble.theme" class="ctrl-full">
                <el-option label="黑底白字" value="dark" />
                <el-option label="白底黑字" value="light" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <template #label>透明度<FieldHelp :text="help['bubble.opacity']" /></template>
              <el-input-number v-model="spirit.bubble.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>字号<FieldHelp :text="help['bubble.fontSize']" /></template>
              <el-input-number v-model="spirit.bubble.fontSize" :min="10" :max="36" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>最大宽度<FieldHelp :text="help['bubble.width']" /></template>
              <el-input-number v-model="spirit.bubble.width" :min="40" :max="480" :step="10" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>偏移 X<FieldHelp :text="help['bubble.offset']" /></template>
              <el-input-number v-model="spirit.bubble.offsetX" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>偏移 Y<FieldHelp :text="help['bubble.offset']" /></template>
              <el-input-number v-model="spirit.bubble.offsetY" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>显示帧数<FieldHelp :text="help['bubble.duration']" /></template>
              <el-input-number v-model="spirit.bubble.duration" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>淡出帧数<FieldHelp :text="help['bubble.fadeFrames']" /></template>
              <el-input-number v-model="spirit.bubble.fadeFrames" :min="0" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>待机间隔帧<FieldHelp :text="help['bubble.idleInterval']" /></template>
              <el-input-number v-model="spirit.bubble.idleInterval" :min="30" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>待机概率<FieldHelp :text="help['bubble.idleChance']" /></template>
              <el-input-number v-model="spirit.bubble.idleChance" :min="0" :max="1" :step="0.05" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item class="span-2">
              <template #label>追赶台词<FieldHelp :text="help['bubble.onCatchUp']" /></template>
              <el-input
                :model-value="catchUpLinesText"
                type="textarea"
                :rows="3"
                placeholder="一行一句，例如：等等我呀~"
                @update:model-value="onCatchUpLinesInput" />
            </el-form-item>
            <el-form-item class="span-2">
              <template #label>待机台词<FieldHelp :text="help['bubble.onIdle']" /></template>
              <el-input
                :model-value="idleLinesText"
                type="textarea"
                :rows="3"
                placeholder="一行一句"
                @update:model-value="onIdleLinesInput" />
            </el-form-item>
          </div>

          <el-divider content-position="left">菜单附加按钮</el-divider>
          <div v-for="(act, ai) in spirit.menuActions" :key="ai" class="menu-action-row">
            <el-input v-model="act.name" placeholder="显示名" />
            <el-input v-model="act.symbol" placeholder="符号" />
            <el-button type="danger" link @click="spirit.menuActions.splice(ai, 1)">删</el-button>
          </div>
          <el-button size="small" @click="spirit.menuActions.push({ name: '', symbol: '' })">添加按钮</el-button>
        </el-form>
      </div>
    </main>

    <div
      v-if="spirit"
      class="spirit-float-preview"
      :style="floatPreviewStyle"
      @pointerdown.stop>
      <div class="float-title" @pointerdown="onPreviewDragStart">
        <span>预览</span>
        <span class="float-tip">拖标题移动 · 拖边缘缩放</span>
      </div>
      <div class="float-body">
        <SpiritPreview
          :spirit="spirit"
          :trails-lib="config.trails"
          :size="previewSize"
          :demo-move="demoMove"
          :play-sfx="playSfx" />
      </div>
      <div class="resize-e" @pointerdown="onPreviewResizeStart($event, 'e')" />
      <div class="resize-s" @pointerdown="onPreviewResizeStart($event, 's')" />
      <div class="resize-se" @pointerdown="onPreviewResizeStart($event, 'se')" />
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import FieldHelp from '@/components/spirit/FieldHelp.vue'
import ImageAssetPicker from '@/components/spirit/ImageAssetPicker.vue'
import SpiritPreview from '@/components/spirit/SpiritPreview.vue'
import {
  linesToText,
  textToLines,
  SPIRIT_QUALITIES,
  SPIRIT_QUALITY_KEYS,
  qualityMeta,
  qualityEditorColor as resolveQualityEditorColor,
} from '@/utils/spiritDefaults'

const PREVIEW_MIN = 160
const PREVIEW_MAX = 420
const PREVIEW_DEFAULT = 220

export default {
  name: 'SpiritListPanel',
  components: { FieldHelp, ImageAssetPicker, SpiritPreview },
  props: {
    config: { type: Object, required: true },
    help: { type: Object, required: true },
    spiritIndex: { type: Number, default: -1 },
  },
  emits: ['update:spiritIndex', 'add', 'dup', 'remove'],
  data() {
    return {
      qualities: SPIRIT_QUALITIES,
      qualityKeys: SPIRIT_QUALITY_KEYS,
      previewSize: PREVIEW_DEFAULT,
      previewLeft: null,
      previewTop: null,
      demoMove: true,
      playSfx: false,
      _drag: null,
      _resize: null,
    }
  },
  computed: {
    ...mapState(['actors']),
    spirit() {
      if (!this.config.spirits || this.spiritIndex < 0) return null
      return this.config.spirits[this.spiritIndex] || null
    },
    traitKeys() {
      return Object.keys(this.config.traits || {})
    },
    trailKeys() {
      return Object.keys(this.config.trails || {})
    },
    catchUpLinesText() {
      const sp = this.spirit
      return sp && sp.bubble ? linesToText(sp.bubble.onCatchUp) : ''
    },
    idleLinesText() {
      const sp = this.spirit
      return sp && sp.bubble ? linesToText(sp.bubble.onIdle) : ''
    },
    floatPreviewStyle() {
      const size = this.previewSize
      const style = { width: size + 16 + 'px' }
      if (this.previewLeft != null && this.previewTop != null) {
        style.left = this.previewLeft + 'px'
        style.top = this.previewTop + 'px'
        style.right = 'auto'
        style.bottom = 'auto'
      }
      return style
    },
  },
  methods: {
    qualityEditorColor(key) {
      return resolveQualityEditorColor(key)
    },
    qualityLabel(key) {
      return qualityMeta(key).name
    },
    selectIndex(i, e) {
      this.$emit('update:spiritIndex', i)
      if (e && e.currentTarget && e.currentTarget.focus) e.currentTarget.focus()
    },
    onCatchUpLinesInput(val) {
      if (!this.spirit || !this.spirit.bubble) return
      this.spirit.bubble.onCatchUp = textToLines(val)
    },
    onIdleLinesInput(val) {
      if (!this.spirit || !this.spirit.bubble) return
      this.spirit.bubble.onIdle = textToLines(val)
    },
    clampPreviewSize(n) {
      return Math.max(PREVIEW_MIN, Math.min(PREVIEW_MAX, Math.round(n)))
    },
    onPreviewDragStart(e) {
      if (e.button != null && e.button !== 0) return
      const el = e.currentTarget.closest('.spirit-float-preview')
      if (!el) return
      const rect = el.getBoundingClientRect()
      this._drag = { ox: e.clientX - rect.left, oy: e.clientY - rect.top }
      if (this.previewLeft == null) {
        this.previewLeft = rect.left
        this.previewTop = rect.top
      }
      window.addEventListener('pointermove', this.onPreviewDragMove)
      window.addEventListener('pointerup', this.onPreviewDragEnd)
      e.preventDefault()
    },
    onPreviewDragMove(e) {
      if (!this._drag) return
      const w = this.previewSize + 16
      const h = this.previewSize + 44
      let left = e.clientX - this._drag.ox
      let top = e.clientY - this._drag.oy
      left = Math.max(0, Math.min(window.innerWidth - w, left))
      top = Math.max(0, Math.min(window.innerHeight - h, top))
      this.previewLeft = left
      this.previewTop = top
    },
    onPreviewDragEnd() {
      this._drag = null
      window.removeEventListener('pointermove', this.onPreviewDragMove)
      window.removeEventListener('pointerup', this.onPreviewDragEnd)
    },
    onPreviewResizeStart(e, edge) {
      if (e.button != null && e.button !== 0) return
      this._resize = { edge, startX: e.clientX, startY: e.clientY, startSize: this.previewSize }
      window.addEventListener('pointermove', this.onPreviewResizeMove)
      window.addEventListener('pointerup', this.onPreviewResizeEnd)
      e.preventDefault()
      e.stopPropagation()
    },
    onPreviewResizeMove(e) {
      if (!this._resize) return
      const dx = e.clientX - this._resize.startX
      const dy = e.clientY - this._resize.startY
      let delta = 0
      if (this._resize.edge === 'e') delta = dx
      else if (this._resize.edge === 's') delta = dy
      else delta = Math.max(dx, dy)
      this.previewSize = this.clampPreviewSize(this._resize.startSize + delta)
    },
    onPreviewResizeEnd() {
      this._resize = null
      window.removeEventListener('pointermove', this.onPreviewResizeMove)
      window.removeEventListener('pointerup', this.onPreviewResizeEnd)
    },
  },
  beforeUnmount() {
    this.onPreviewDragEnd()
    this.onPreviewResizeEnd()
  },
}
</script>

<style scoped src="./spiritShared.css"></style>
<style scoped>
.spirit-float-preview {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 40;
  background: var(--app-surface-2, #1e1e1e);
  border: 1px solid var(--app-border, #414243);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  padding: 0 8px 8px;
  user-select: none;
  box-sizing: border-box;
}
.float-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 32px;
  cursor: move;
  font-size: 13px;
  font-weight: 600;
  padding: 0 4px;
}
.float-tip {
  font-size: 11px;
  font-weight: 400;
  color: var(--app-text-muted, #909399);
}
.float-body { display: flex; justify-content: center; }
.resize-e, .resize-s, .resize-se { position: absolute; z-index: 2; }
.resize-e { top: 32px; right: 0; width: 8px; bottom: 8px; cursor: ew-resize; }
.resize-s { left: 0; right: 8px; bottom: 0; height: 8px; cursor: ns-resize; }
.resize-se { right: 0; bottom: 0; width: 14px; height: 14px; cursor: nwse-resize; }
</style>
