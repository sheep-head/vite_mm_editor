<template>
  <move-route-editor
    :model-value="modelValue"
    show-target
    show-wait
    :character-id="characterId"
    :route="route"
    :map-events="mapEvents"
    :preview-map-id="selectedMapId || 0"
    :preview-starts="previewStarts"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="onConfirm" />
</template>
<script>
import { mapGetters } from 'vuex'
import DataManager from '@/utils/DataManager'
import MoveRouteEditor from '../MoveRouteEditor.vue'

export default {
  name: 'Cmd205MoveRoute',
  components: { MoveRouteEditor },
  inject: {
    editingMapEvent: { default: null },
  },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      characterId: 0,
      route: { list: [{ code: 0, parameters: [] }], repeat: false, skippable: false, wait: true },
      mapEvents: [],
      previewStarts: {},
    }
  },
  computed: {
    ...mapGetters(['selectedMapId']),
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, null]
        this.characterId = p[0] != null ? p[0] : 0
        const r = p[1] || {}
        this.route = {
          list: Array.isArray(r.list) ? r.list : [{ code: 0, parameters: [] }],
          repeat: !!r.repeat,
          skippable: !!r.skippable,
          wait: r.wait !== false,
        }
        this.loadMapEvents()
        this.buildPreviewStarts()
      },
    },
  },
  methods: {
    loadMapEvents() {
      const out = []
      try {
        const id = this.selectedMapId
        if (!id) {
          this.mapEvents = out
          return
        }
        const map = DataManager.$loadDataSync(`Map${String(id).padStart(3, '0')}`, false, false)
        const events = (map && map.events) || []
        events.forEach((ev) => {
          if (ev && ev.id > 0) out.push({ id: ev.id, name: ev.name || '' })
        })
      } catch (e) {
        console.error(e)
      }
      this.mapEvents = out
    },
    buildPreviewStarts() {
      const starts = {}
      let map = null
      try {
        const id = this.selectedMapId
        if (id) map = DataManager.$loadDataSync(`Map${String(id).padStart(3, '0')}`, false, false)
      } catch (e) {
        map = null
      }
      let player = { x: 0, y: 0, characterName: '', characterIndex: 0, direction: 2 }
      try {
        const sys = DataManager.$loadDataSync('System', false, false) || {}
        if (sys.startMapId === this.selectedMapId) {
          player.x = sys.startX || 0
          player.y = sys.startY || 0
        }
        if (sys.airship) {
          /* keep empty player graphic; preview uses blank or default */
        }
      } catch (e) {
        /* ignore */
      }
      starts[-1] = player
      const selfEv = typeof this.editingMapEvent === 'function' ? this.editingMapEvent() : null
      const selfPage = selfEv && selfEv.pages && selfEv.pages[0]
      const selfImg = (selfPage && selfPage.image) || {}
      starts[0] = {
        x: (selfEv && selfEv.x) || 0,
        y: (selfEv && selfEv.y) || 0,
        characterName: selfImg.characterName || '',
        characterIndex: selfImg.characterIndex || 0,
        direction: selfImg.direction || 2,
      }
      ;(map && map.events ? map.events : []).forEach((ev) => {
        if (!ev || !ev.id) return
        const page = (ev.pages && ev.pages[0]) || {}
        const image = page.image || {}
        starts[ev.id] = {
          x: ev.x || 0,
          y: ev.y || 0,
          characterName: image.characterName || '',
          characterIndex: image.characterIndex || 0,
          direction: image.direction || 2,
        }
      })
      this.previewStarts = starts
    },
    onConfirm({ characterId, route }) {
      const indent = (this.command && this.command.indent) || 0
      const list = (route && route.list) || []
      const cmds = [
        {
          code: 205,
          indent,
          parameters: [characterId, route],
        },
      ]
      list.forEach((step) => {
        if (!step || step.code === 0) return
        cmds.push({ code: 505, indent, parameters: [step] })
      })
      this.$emit('confirm', cmds)
    },
  },
}
</script>
