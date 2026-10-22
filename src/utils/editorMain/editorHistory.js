import {
  pushHistory,
  undo as historyUndo,
  redo as historyRedo,
  canUndo,
  canRedo,
} from '@/components/map/mapHistory'

export const editorHistoryMethods = {
    snapshotEvents() {
      const v = this.viewer()
      return v ? v.cloneEvents() : [null]
    },
    pushEventsHistory(label, before, after) {
      if (!this.selectedMapId) return
      pushHistory(this.selectedMapId, {
        type: 'events',
        label,
        before,
        after: after || this.snapshotEvents(),
      })
    },
    pushSystemHistory(label, before, after) {
      if (!this.selectedMapId) return
      pushHistory(this.selectedMapId, {
        type: 'system',
        label,
        before,
        after,
      })
    },
    doUndo() {
      if (!canUndo(this.selectedMapId)) return
      const entry = historyUndo(this.selectedMapId)
      if (!entry) return
      this.applyHistoryEntry(entry, 'before')
    },
    doRedo() {
      if (!canRedo(this.selectedMapId)) return
      const entry = historyRedo(this.selectedMapId)
      if (!entry) return
      this.applyHistoryEntry(entry, 'after')
    },
    applyHistoryEntry(entry, side) {
      const v = this.viewer()
      if (!v || !entry) return
      const snap = side === 'before' ? entry.before : entry.after
      if (entry.type === 'events') {
        v.applyEventsSnapshot(snap)
        this.saveMap()
      } else if (entry.type === 'system') {
        v.applyStartSnapshot(snap)
      } else if (entry.type === 'tiles') {
        v.applyTilesSnapshot(snap)
        this.mapDirty = true
      }
    }
}
