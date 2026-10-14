import { createStore } from 'vuex'
import DataManager from '@/utils/DataManager'
import { loadSettings, saveSettings } from '@/utils/appSettings'

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

let _saveTimer = null
function persistMapTools(mapTools) {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    saveSettings({ mapTools: { ...mapTools } })
  }, 200)
}

const initialMapTools = readMapToolsFromSettings()

const store = createStore({
  state: {
    mapInfos: null,
    actors: null,
    animations: null,
    editor: {
      mode: 'map',
      editLayer: 'auto',
      showGrid: false,
      showRegions: false,
      showEvents: true,
      zoomPercent: 100,
      zoomRequest: null,
      selectedMapId: 0,
      paletteTab: 'A',
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
      focusEventRequest: null,
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
    focusEventRequest(state) {
      return state.editor.focusEventRequest
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
      }
    },
  },
  mutations: {
    setWorkspaceData(state, payload) {
      state.mapInfos = payload.mapInfos
      state.actors = payload.actors
      state.animations = payload.animations
    },
    setEditorMode(state, mode) {
      state.editor.mode = mode
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
    },
    setFocusEventRequest(state, req) {
      state.editor.focusEventRequest = req
    },
    clearFocusEventRequest(state) {
      state.editor.focusEventRequest = null
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
    closeMapTools({ commit, dispatch }) {
      commit('setMapToolsVisible', false)
      dispatch('persistMapTools')
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
