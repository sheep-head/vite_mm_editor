<template>
  <move-route-editor
    :model-value="modelValue"
    show-target
    show-wait
    :character-id="characterId"
    :route="route"
    :map-events="mapEvents"
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
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      characterId: 0,
      route: { list: [{ code: 0, parameters: [] }], repeat: false, skippable: false, wait: true },
      mapEvents: [],
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
