import { createStore } from 'vuex'
import DataManager from '@/utils/DataManager'
import { loadSettings, saveSettings, DEFAULT_EDITOR_UI, applyEditorUiCss } from '@/utils/appSettings'

const CHAR_ORIG_KEY = 'editor-map-char-original-size'

const DEFAULT_MAP_TOOLS = {
  visible: false,
  x: 120,
  y: 60,
  w: 360,
  h: 300,
  charOriginalSize: false,
  previewWalkAnim: false,
  showHyperlinks: false,
  showHyperlinkImages: false,
}

function readMapToolsFromSettings() {
  const s = loadSettings()
  const mt = { ...DEFAULT_MAP_TOOLS, ...(s.mapTools || {}) }
  // 迁移旧 localStorage
  if (s.mapTools == null || s.mapTools.charOriginalSize === undefined) {
    try {
      if (localStorage.getItem(CHAR_ORIG_KEY) === '1') {
        mt.charOriginalSize = true
      }
      localStorage.removeItem(CHAR_ORIG_KEY)
    } catch (e) {
      /* ignore */
    }
  }
  return mt
}

function readEditorUi() {
  const s = loadSettings()
  const raw = s.editorUi || {}
  const ui = { ...DEFAULT_EDITOR_UI, ...raw }
  ui.blockedMapIds = Array.isArray(raw.blockedMapIds)
    ? raw.blockedMapIds.map((n) => Number(n)).filter((n) => n > 0)
    : []
  return ui
}

let _uiTimer = null
function persistEditorUi(editorUi) {
  if (_uiTimer) clearTimeout(_uiTimer)
  _uiTimer = setTimeout(() => {
    saveSettings({ editorUi: { ...editorUi } })
  }, 200)
}

const initialEditorUi = readEditorUi()
applyEditorUiCss(initialEditorUi)

let _saveTimer = null
function persistMapTools(mapTools) {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    saveSettings({ mapTools: { ...mapTools } })
  }, 200)
}

const initialMapTools = readMapToolsFromSettings()

function readEditorMode() {
  const mode = loadSettings().editorMode
  return mode === 'event' ? 'event' : 'map'
}

const store = createStore({
  state: {
    mapInfos: null,
    actors: null,
    animations: null,
    editor: {
      mode: readEditorMode(),
      editLayer: 'auto',
      showGrid: false,
      showRegions: false,
      showEvents: true,
      zoomPercent: 100,
      zoomRequest: null,
      selectedMapId: 0,
      paletteTab: 'A',
      paintTool: 'pencil',
      databaseVisible: false,
      mapToolsVisible: !!initialMapTools.visible,
      mapToolsGeom: {
        x: initialMapTools.x,
        y: initialMapTools.y,
        w: initialMapTools.w,
        h: initialMapTools.h,
      },
      mapCharOriginalSize: !!initialMapTools.charOriginalSize,
      previewWalkAnim: !!initialMapTools.previewWalkAnim,
      showHyperlinks: !!initialMapTools.showHyperlinks,
      showHyperlinkImages: !!initialMapTools.showHyperlinkImages,
      focusEventRequest: null,
      editorUi: initialEditorUi,
    },
  },
  getters: {
    mapInfos(state) {
      return state.mapInfos
    },
    actors(state) {
      return state.actors
    },
    editor(state) {
      return state.editor
    },
    editorMode(state) {
      return state.editor.mode
    },
    editLayer(state) {
      return state.editor.editLayer
    },
    showGrid(state) {
      return state.editor.showGrid
    },
    showRegions(state) {
      return state.editor.showRegions
    },
    showEvents(state) {
      return state.editor.showEvents
    },
    zoomPercent(state) {
      return state.editor.zoomPercent
    },
    zoomRequest(state) {
      return state.editor.zoomRequest
    },
    selectedMapId(state) {
      return state.editor.selectedMapId
    },
    paletteTab(state) {
      return state.editor.paletteTab
    },
    paintTool(state) {
      return state.editor.paintTool || 'pencil'
    },
    databaseVisible(state) {
      return state.editor.databaseVisible
    },
    mapToolsVisible(state) {
      return state.editor.mapToolsVisible
    },
    mapToolsGeom(state) {
      return state.editor.mapToolsGeom
    },
    mapCharOriginalSize(state) {
      return state.editor.mapCharOriginalSize
    },
    previewWalkAnim(state) {
      return state.editor.previewWalkAnim
    },
    showHyperlinks(state) {
      return state.editor.showHyperlinks
    },
    showHyperlinkImages(state) {
      return !!state.editor.showHyperlinkImages
    },
    focusEventRequest(state) {
      return state.editor.focusEventRequest
    },
    editorUi(state) {
      return state.editor.editorUi
    },
    mapToolsPayload(state) {
      const e = state.editor
      return {
        visible: e.mapToolsVisible,
        x: e.mapToolsGeom.x,
        y: e.mapToolsGeom.y,
        w: e.mapToolsGeom.w,
        h: e.mapToolsGeom.h,
        charOriginalSize: e.mapCharOriginalSize,
        previewWalkAnim: e.previewWalkAnim,
        showHyperlinks: e.showHyperlinks,
        showHyperlinkImages: e.showHyperlinkImages,
      }
    },
  },
  mutations: {
    setWorkspaceData(state, payload) {
      state.mapInfos = payload.mapInfos
      state.actors = payload.actors
      state.animations = payload.animations
    },
    setMapInfos(state, list) {
      state.mapInfos = list
    },
    setEditorMode(state, mode) {
      const next = mode === 'event' ? 'event' : 'map'
      state.editor.mode = next
      saveSettings({ editorMode: next })
    },
    setEditLayer(state, layer) {
      state.editor.editLayer = layer
    },
    setShowGrid(state, v) {
      state.editor.showGrid = !!v
    },
    setShowRegions(state, v) {
      state.editor.showRegions = !!v
    },
    setShowEvents(state, v) {
      state.editor.showEvents = !!v
    },
    setZoomPercent(state, n) {
      state.editor.zoomPercent = Math.round(n) || 100
    },
    setZoomRequest(state, req) {
      state.editor.zoomRequest = req
    },
    clearZoomRequest(state) {
      state.editor.zoomRequest = null
    },
    setSelectedMapId(state, id) {
      state.editor.selectedMapId = id || 0
    },
    setPaletteTab(state, tab) {
      state.editor.paletteTab = tab || 'A'
      if (tab === 'R') {
        state.editor.showRegions = true
      }
    },
    setPaintTool(state, tool) {
      const ok = ['pencil', 'rect', 'ellipse', 'fill', 'shadow']
      state.editor.paintTool = ok.includes(tool) ? tool : 'pencil'
    },
    setDatabaseVisible(state, v) {
      state.editor.databaseVisible = !!v
    },
    setMapToolsVisible(state, v) {
      state.editor.mapToolsVisible = !!v
    },
    setMapToolsGeom(state, geom) {
      state.editor.mapToolsGeom = {
        x: Math.round(geom.x),
        y: Math.round(geom.y),
        w: Math.round(geom.w),
        h: Math.round(geom.h),
      }
    },
    setMapCharOriginalSize(state, v) {
      state.editor.mapCharOriginalSize = !!v
    },
    setPreviewWalkAnim(state, v) {
      state.editor.previewWalkAnim = !!v
    },
    setShowHyperlinks(state, v) {
      state.editor.showHyperlinks = !!v
      if (!v) state.editor.showHyperlinkImages = false
    },
    setShowHyperlinkImages(state, v) {
      state.editor.showHyperlinkImages = !!v && !!state.editor.showHyperlinks
    },
    setFocusEventRequest(state, req) {
      state.editor.focusEventRequest = req
    },
    clearFocusEventRequest(state) {
      state.editor.focusEventRequest = null
    },
    setEditorUi(state, partial) {
      const prev = state.editor.editorUi || {}
      const next = { ...prev, ...partial }
      state.editor.editorUi = next
      // 仅滚动条相关 CSS 变化时才写变量，避免透明度等无关改动触发布局/ResizeObserver
      if (
        prev.scrollSize !== next.scrollSize ||
        prev.scrollTrack !== next.scrollTrack ||
        prev.scrollThumb !== next.scrollThumb
      ) {
        applyEditorUiCss(next)
      }
    },
  },
  actions: {
    requestZoom({ commit }, kind) {
      commit('setZoomRequest', kind)
    },
    persistMapTools({ getters }) {
      persistMapTools(getters.mapToolsPayload)
    },
    toggleMapTools({ commit, state, dispatch }) {
      commit('setMapToolsVisible', !state.editor.mapToolsVisible)
      dispatch('persistMapTools')
    },
    updateMapToolsGeom({ commit, dispatch }, geom) {
      commit('setMapToolsGeom', geom)
      dispatch('persistMapTools')
    },
    setMapCharOriginalSizePersist({ commit, dispatch }, v) {
      commit('setMapCharOriginalSize', v)
      dispatch('persistMapTools')
    },
    setPreviewWalkAnimPersist({ commit, dispatch }, v) {
      commit('setPreviewWalkAnim', v)
      dispatch('persistMapTools')
    },
    setShowHyperlinksPersist({ commit, dispatch }, v) {
      commit('setShowHyperlinks', v)
      dispatch('persistMapTools')
    },
    setShowHyperlinkImagesPersist({ commit, dispatch }, v) {
      commit('setShowHyperlinkImages', v)
      dispatch('persistMapTools')
    },
    closeMapTools({ commit, dispatch }) {
      commit('setMapToolsVisible', false)
      dispatch('persistMapTools')
    },
    updateEditorUi({ commit, state }, partial) {
      commit('setEditorUi', partial)
      persistEditorUi(state.editor.editorUi)
    },
    requestFocusEvent({ commit }, payload) {
      // { mapId, eventId }
      commit('setFocusEventRequest', { ...payload, ts: Date.now() })
    },
  },
})

/** 在工作空间就绪后调用：重新从磁盘加载基础数据进 Vuex */
export function reloadStoreData(targetStore = store) {
  DataManager.clearCache()
  DataManager.init()
  targetStore.commit('setWorkspaceData', {
    mapInfos: DataManager.$loadDataSync('MapInfos', false, false),
    actors: DataManager.$loadDataSync('Actors', false, false),
    animations: DataManager.$loadDataSync('Animations', false, false),
  })
}

export default store
