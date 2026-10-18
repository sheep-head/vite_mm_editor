<template>
  <el-dialog
    :model-value="modelValue"
    title="设置"
    width="740px"
    top="6vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-tabs v-model="tab" class="set-tabs">
      <el-tab-pane label="常规" name="general">
        <el-form label-width="200px" size="small">
          <el-form-item label="界面主题">
            <el-radio-group v-model="dark">
              <el-radio :value="false">明亮色</el-radio>
              <el-radio :value="true">深暗色</el-radio>
            </el-radio-group>
            <p class="set-hint">影响编辑器整体配色，与游戏内画面无关。</p>
          </el-form-item>
          <el-form-item label="执行内容可选中文字">
            <el-switch v-model="ui.commandTextSelectable" @change="saveUi" />
            <p class="set-hint">开启后可在事件指令列表里拖选复制文字。</p>
          </el-form-item>
          <el-form-item label="显示执行内容 JSON">
            <el-switch v-model="ui.showCommandJson" @change="saveUi" />
            <p class="set-hint">关闭后隐藏「JSON…」按钮，日常编辑更清爽。</p>
          </el-form-item>
          <el-form-item label="放弃事件修改确认">
            <el-switch v-model="ui.confirmDiscardEvent" @change="saveUi" />
            <p class="set-hint">关闭事件编辑器且有未保存改动时，是否弹出确认。</p>
          </el-form-item>
          <el-form-item label="测试游戏命令">
            <el-input
              v-model="ui.playtestCommand"
              clearable
              placeholder="例如 Game.exe 或 nw ."
              @change="saveUi" />
            <p class="set-hint">顶栏「测试游戏」按钮执行的命令行；可用相对路径（相对下方工作目录）。</p>
          </el-form-item>
          <el-form-item label="测试游戏工作目录">
            <el-input
              v-model="ui.playtestCwd"
              clearable
              placeholder="空 = 当前工作空间"
              @change="saveUi" />
            <p class="set-hint">留空则使用当前打开的工程目录。</p>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="地图" name="map">
        <el-form label-width="200px" size="small">
          <el-form-item label="网格颜色">
            <el-color-picker v-model="ui.gridColor" show-alpha color-format="rgb" @change="saveUi" />
          </el-form-item>
          <el-form-item label="网格粗细">
            <el-input-number v-model="ui.gridWidth" :min="1" :max="8" @change="saveUi" />
            <p class="set-hint">仅编辑器预览；网格开关在地图工具面板。</p>
          </el-form-item>
          <el-form-item label="显示地图边缘">
            <el-switch v-model="ui.mapEdgeVisible" @change="saveUi" />
            <p class="set-hint">在地图四周画一圈边界线，缩小时无砖区域也能看出地图范围。</p>
          </el-form-item>
          <el-form-item label="地图边缘颜色">
            <el-color-picker
              v-model="ui.mapEdgeColor"
              show-alpha
              color-format="rgb"
              :disabled="ui.mapEdgeVisible === false"
              @change="saveUi" />
          </el-form-item>
          <el-form-item label="滚动条底色">
            <el-color-picker v-model="ui.scrollTrack" show-alpha color-format="rgb" @change="saveUi" />
          </el-form-item>
          <el-form-item label="滚动条滑块">
            <el-color-picker v-model="ui.scrollThumb" show-alpha color-format="rgb" @change="saveUi" />
          </el-form-item>
          <el-form-item label="滚动条粗细">
            <el-input-number v-model="ui.scrollSize" :min="8" :max="28" @change="saveUi" />
          </el-form-item>
          <el-form-item label="空白区域底色">
            <div class="set-row">
              <el-color-picker v-model="emptyColorModel" show-alpha color-format="rgb" @change="onEmptyColor" />
              <el-button size="small" @click="clearEmptyColor">棋盘格（透明）</el-button>
            </div>
            <p class="set-hint">
              透明时使用固定棋盘格（不随地图滚动）；指定颜色则整屏铺色，不再显示棋盘格。
            </p>
          </el-form-item>
          <el-form-item label="禁止打开的地图">
            <div class="set-row">
              <span class="set-summary" :title="blockedSummary">{{ blockedSummary || '（无）' }}</span>
              <el-button size="small" @click="blockedVisible = true">编辑…</el-button>
            </div>
            <p class="set-hint">勾选后无法从列表打开，适合超大或仅作占位的地图。</p>
          </el-form-item>
          <el-form-item label="地图外背景皮肤">
            <div class="set-row">
              <span class="set-summary">{{ ui.mapBgSkin || '（无）' }}</span>
              <el-button size="small" @click="mapSkinVisible = true">导入…</el-button>
              <el-button size="small" :disabled="!ui.mapBgSkin" @click="clearBgSkin">清除</el-button>
            </div>
            <div v-if="ui.mapBgSkin" class="set-row" style="margin-top: 6px">
              <span class="set-mini">不透明度</span>
              <el-slider
                v-model="ui.mapBgSkinOpacity"
                :min="0"
                :max="1"
                :step="0.05"
                style="width: 160px; margin: 0 8px"
                @input="onBgOpacityInput"
                @change="onBgOpacityCommit" />
              <span class="set-mini">{{ Math.round((ui.mapBgSkinOpacity || 0) * 100) }}%</span>
            </div>
            <p class="set-hint">铺在地图内容之下、不随平移缩放；用于编辑器视口装饰。</p>
          </el-form-item>
          <el-form-item label="数据库弹窗皮肤">
            <div class="set-row">
              <span class="set-summary">{{ ui.dbBgSkin || '（无）' }}</span>
              <el-button size="small" @click="openDbSkin">导入…</el-button>
              <el-button size="small" :disabled="!ui.dbBgSkin" @click="clearDbSkin">清除</el-button>
            </div>
            <div v-if="ui.dbBgSkin" class="set-row" style="margin-top: 6px">
              <span class="set-mini">不透明度</span>
              <el-slider
                v-model="ui.dbBgSkinOpacity"
                :min="0"
                :max="1"
                :step="0.05"
                style="width: 160px; margin: 0 8px"
                @change="saveUi" />
              <span class="set-mini">{{ Math.round((ui.dbBgSkinOpacity || 0) * 100) }}%</span>
            </div>
            <p class="set-hint">铺在数据库窗口内容之下，不随列表滚动。</p>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="事件" name="event">
        <el-form label-width="200px" size="small">
          <el-form-item label="事件底色">
            <el-color-picker v-model="ui.eventFillColor" show-alpha color-format="rgb" @change="saveUi" />
            <p class="set-hint">画在白色方框内部，默认黑色 30% 透明。</p>
          </el-form-item>
          <el-form-item label="大图事件渲染">
            <el-radio-group v-model="ui.eventLargeFit" @change="saveUi">
              <el-radio value="center">默认</el-radio>
              <el-radio value="fit">自适应</el-radio>
            </el-radio-group>
            <p class="set-hint">默认取当前帧正中间。自适应把整帧缩小到白框里。地图工具里的原尺寸是临时预览，不改变这项。</p>
          </el-form-item>
          <el-form-item label="锁定事件红圈">
            <el-radio-group v-model="ui.focusRingMode" @change="saveUi">
              <el-radio value="untilAction">持续到下次操作</el-radio>
              <el-radio value="timed">播放固定秒数</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="ui.focusRingMode === 'timed'" label="红圈秒数">
            <el-input-number v-model="ui.focusRingSeconds" :min="0.5" :max="30" :step="0.5" @change="saveUi" />
          </el-form-item>
          <el-form-item label="行走图选框颜色">
            <el-color-picker v-model="ui.charPickColor" show-alpha color-format="rgb" @change="saveUi" />
          </el-form-item>
          <el-form-item label="行走图选框粗细">
            <el-input-number v-model="ui.charPickWidth" :min="1" :max="12" @change="saveUi" />
            <p class="set-hint">事件图像选择器中高亮框的描边样式。</p>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button type="primary" @click="$emit('update:modelValue', false)">完成</el-button>
    </template>

    <image-drop-import-dialog
      v-model="mapSkinVisible"
      title="导入地图背景"
      file-prefix="map-bg-skin"
      :model-opacity="ui.mapBgSkinOpacity"
      @confirm="onMapSkin" />
    <image-drop-import-dialog
      v-model="dbSkinVisible"
      title="导入数据库皮肤"
      file-prefix="db-bg-skin"
      :model-opacity="ui.dbBgSkinOpacity"
      @confirm="onDbSkin" />

    <el-dialog
      v-model="blockedVisible"
      title="禁止打开的地图"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      class="blocked-maps-dlg">
      <p class="set-hint" style="margin-top: 0">父地图与子地图各自独立勾选，互不影响。</p>
      <div class="blocked-tree-wrap">
        <el-tree
          v-if="blockedVisible"
          ref="blockedTree"
          :data="mapTree"
          node-key="id"
          show-checkbox
          check-strictly
          default-expand-all
          :props="{ label: 'label', children: 'children' }"
          :default-checked-keys="[...ui.blockedMapIds]" />
      </div>
      <template #footer>
        <el-button @click="blockedVisible = false">取消</el-button>
        <el-button type="primary" @click="applyBlocked">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script>
import { mapGetters } from 'vuex'
import { ElMessage } from 'element-plus'
import { isDark } from '@/utils/theme'
import { getMapBgSkinPath, isMapEmptyCheckerboard } from '@/utils/appSettings'
import { fs, isNw } from '@/utils/nw'
import ImageDropImportDialog from './ImageDropImportDialog.vue'

export default {
  name: 'EditorSettingsDialog',
  components: { ImageDropImportDialog },
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      tab: 'general',
      ui: {},
      blockedVisible: false,
      emptyColorModel: 'rgba(0,0,0,0)',
      mapSkinVisible: false,
      dbSkinVisible: false,
    }
  },
  computed: {
    ...mapGetters(['editorUi', 'mapInfos']),
    dark: {
      get() {
        return isDark.value
      },
      set(v) {
        isDark.value = v
      },
    },
    mapTree() {
      const list = Array.isArray(this.mapInfos) ? this.mapInfos.filter((m) => m && m.id > 0) : []
      const byParent = new Map()
      list.forEach((m) => {
        const pid = m.parentId || 0
        if (!byParent.has(pid)) byParent.set(pid, [])
        byParent.get(pid).push(m)
      })
      byParent.forEach((arr) => arr.sort((a, b) => (a.order || 0) - (b.order || 0)))
      const walk = (parentId) =>
        (byParent.get(parentId) || []).map((m) => ({
          id: m.id,
          label: `${String(m.id).padStart(3, '0')} ${m.name || '(无名称)'}`,
          children: walk(m.id),
        }))
      return walk(0)
    },
    blockedSummary() {
      const ids = this.ui.blockedMapIds || []
      if (!ids.length) return ''
      const infos = this.mapInfos || []
      const parts = ids.map((id) => {
        const m = infos.find((x) => x && x.id === id)
        return `${String(id).padStart(3, '0')} ${m && m.name ? m.name : ''}`
      })
      const s = parts.join(', ')
      return s.length > 42 ? s.slice(0, 40) + '…' : s
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.syncFromStore()
      },
    },
    editorUi: {
      deep: true,
      handler() {
        // 本弹窗正在写入时不要回写，否则与滑条形成同步环，可能把 NW 进程拖崩
        if (this.modelValue && !this._writingUi) this.syncFromStore()
      },
    },
  },
  methods: {
    syncFromStore() {
      const src = this.editorUi || {}
      this.ui = {
        ...src,
        blockedMapIds: [...(src.blockedMapIds || [])],
        mapBgSkinOpacity:
          typeof src.mapBgSkinOpacity === 'number' ? src.mapBgSkinOpacity : 1,
        dbBgSkinOpacity:
          typeof src.dbBgSkinOpacity === 'number' ? src.dbBgSkinOpacity : 1,
        playtestCommand: src.playtestCommand || '',
        playtestCwd: src.playtestCwd || '',
      }
      this.emptyColorModel = isMapEmptyCheckerboard(this.ui.mapEmptyColor)
        ? 'rgba(0,0,0,0)'
        : this.ui.mapEmptyColor || 'rgba(0,0,0,0)'
    },
    saveUi() {
      this._writingUi = true
      this.$store.dispatch('updateEditorUi', { ...this.ui })
      this.$nextTick(() => {
        this._writingUi = false
      })
    },
    onBgOpacityInput(v) {
      // 拖动时只改地图预览，不整表回写，避免深监听 + 布局抖动
      const opacity = typeof v === 'number' ? v : this.ui.mapBgSkinOpacity
      this._writingUi = true
      this.$store.commit('setEditorUi', { mapBgSkinOpacity: opacity })
      this.$nextTick(() => {
        this._writingUi = false
      })
    },
    onBgOpacityCommit() {
      this.saveUi()
    },
    onEmptyColor(c) {
      if (isMapEmptyCheckerboard(c)) {
        this.ui.mapEmptyColor = ''
      } else {
        this.ui.mapEmptyColor = c || ''
      }
      this.saveUi()
    },
    clearEmptyColor() {
      this.ui.mapEmptyColor = ''
      this.emptyColorModel = 'rgba(0,0,0,0)'
      this.saveUi()
    },
    applyBlocked() {
      const tree = this.$refs.blockedTree
      const keys = tree ? tree.getCheckedKeys(false) : []
      this.ui.blockedMapIds = keys.map((n) => Number(n)).filter((n) => n > 0)
      this.saveUi()
      this.blockedVisible = false
    },
    removeBgSkinFile(name) {
      if (!name || !isNw || !fs) return
      try {
        const p = getMapBgSkinPath(name)
        if (p && fs.existsSync(p)) fs.unlinkSync(p)
      } catch (e) {
        /* ignore */
      }
    },
    onMapSkin({ name, opacity }) {
      const oldName = this.ui.mapBgSkin
      this.ui.mapBgSkin = name
      this.ui.mapBgSkinOpacity = opacity
      this.saveUi()
      if (oldName && oldName !== name) this.removeBgSkinFile(oldName)
      ElMessage.success('已导入背景皮肤')
    },
    openDbSkin() {
      this.dbSkinVisible = true
    },
    onDbSkin({ name, opacity }) {
      const oldName = this.ui.dbBgSkin
      this.ui.dbBgSkin = name
      this.ui.dbBgSkinOpacity = opacity
      this.saveUi()
      if (oldName && oldName !== name) this.removeBgSkinFile(oldName)
      ElMessage.success('已导入数据库皮肤')
    },
    clearDbSkin() {
      this.removeBgSkinFile(this.ui.dbBgSkin)
      this.ui.dbBgSkin = ''
      this.saveUi()
    },
    clearBgSkin() {
      this.removeBgSkinFile(this.ui.mapBgSkin)
      this.ui.mapBgSkin = ''
      this.saveUi()
    },
  },
}
</script>

<style scoped>
.set-tabs :deep(.el-tabs__content) {
  max-height: 56vh;
  overflow: auto;
  padding-right: 4px;
}
.set-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  width: 100%;
}
.set-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}
.set-summary {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.set-mini {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.blocked-tree-wrap {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 4px 0;
}
</style>
