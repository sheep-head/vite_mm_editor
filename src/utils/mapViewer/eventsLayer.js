import DataManager from '@/utils/DataManager'

export const eventsLayerMethods = {
  getEventById(id) {
    if (!this.currentMapData || !this.currentMapData.events) return null
    return this.currentMapData.events.find((ev) => ev && ev.id === id) || null
  },

  findEventAt(mx, my) {
    if (!this.currentMapData || !this.currentMapData.events) return null
    return this.currentMapData.events.find((ev) => ev && ev.x === mx && ev.y === my) || null
  },

  refreshEventsLayer() {
    this.render()
  },

  upsertEvent(event) {
    if (!this.currentMapData || !event) return
    if (!Array.isArray(this.currentMapData.events)) this.currentMapData.events = [null]
    while (this.currentMapData.events.length <= event.id) {
      this.currentMapData.events.push(null)
    }
    this.currentMapData.events[event.id] = event
    this.selectedEventId = event.id
    this.refreshEventsLayer()
    this.$emit('map-dirty')
  },

  removeEventById(id) {
    if (!this.currentMapData || !this.currentMapData.events) return false
    if (!this.currentMapData.events[id]) return false
    this.currentMapData.events[id] = null
    if (this.selectedEventId === id) this.selectedEventId = 0
    this.refreshEventsLayer()
    this.$emit('map-dirty')
    return true
  },

  cloneEvents() {
    if (!this.currentMapData) return [null]
    return JSON.parse(JSON.stringify(this.currentMapData.events || [null]))
  },

  applyEventsSnapshot(events) {
    if (!this.currentMapData) return
    this.currentMapData.events = JSON.parse(JSON.stringify(events || [null]))
    this.refreshEventsLayer()
    this.$emit('map-dirty')
  },

  getStartSnapshot() {
    return JSON.parse(JSON.stringify(this.startMarkers))
  },

  applyStartSnapshot(markers) {
    if (!markers) return false
    const sys = DataManager.$loadDataSync('System', false, false)
    if (!sys) return false
    const p = markers.player || {}
    sys.startMapId = p.mapId || 0
    sys.startX = p.x || 0
    sys.startY = p.y || 0
    ;['boat', 'ship', 'airship'].forEach((kind) => {
      const m = markers[kind] || {}
      if (!sys[kind]) sys[kind] = {}
      sys[kind].startMapId = m.mapId || 0
      sys[kind].startX = m.x || 0
      sys[kind].startY = m.y || 0
    })
    const ok = DataManager.$saveDataSync('System', sys)
    if (ok) {
      this.loadStartPosition()
      this.render()
    }
    return ok
  },
}
