<template>
  <teleport to="body">
    <ul
      v-show="visible"
      ref="menuEl"
      class="popup-context-menu"
      :class="menuClass"
      :style="style"
      @contextmenu.prevent
      @mousedown.stop>
      <slot :close="close" :action="action" />
    </ul>
  </teleport>
</template>

<script>
export default {
  name: 'PopupContextMenu',
  props: {
    visible: { type: Boolean, default: false },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    menuClass: { type: [String, Array, Object], default: '' },
  },
  emits: ['update:visible'],
  computed: {
    style() {
      return {
        left: `${this.x}px`,
        top: `${this.y}px`,
      }
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.$nextTick(() => this.clampPosition())
        document.addEventListener('mousedown', this.onDocDown, true)
        window.addEventListener('blur', this.close)
        window.addEventListener('resize', this.close)
      } else {
        document.removeEventListener('mousedown', this.onDocDown, true)
        window.removeEventListener('blur', this.close)
        window.removeEventListener('resize', this.close)
      }
    },
  },
  beforeUnmount() {
    document.removeEventListener('mousedown', this.onDocDown, true)
    window.removeEventListener('blur', this.close)
    window.removeEventListener('resize', this.close)
  },
  methods: {
    close() {
      if (this.visible) this.$emit('update:visible', false)
    },
    action(fn) {
      this.close()
      if (typeof fn === 'function') fn()
    },
    onDocDown(e) {
      const el = this.$refs.menuEl
      if (el && el.contains(e.target)) return
      this.close()
    },
    clampPosition() {
      const el = this.$refs.menuEl
      if (!el) return
      const pad = 4
      const rect = el.getBoundingClientRect()
      let left = this.x
      let top = this.y
      if (left + rect.width > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - rect.width - pad)
      }
      if (top + rect.height > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - rect.height - pad)
      }
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    },
  },
}
</script>

<style>
.popup-context-menu {
  position: fixed;
  z-index: 10050;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  min-width: 120px;
  background: #fff;
  border: 1px solid #c0c4cc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.popup-context-menu li {
  padding: 4px 14px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}
.popup-context-menu li:hover:not(.disabled) {
  background: #ecf5ff;
}
.popup-context-menu li.disabled {
  opacity: 0.4;
  pointer-events: none;
}
.popup-context-menu li.sep,
.popup-context-menu li.menu-sep {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  background: #e4e7ed;
  pointer-events: none;
}
</style>
