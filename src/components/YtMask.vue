<template>
  <div v-show='show'>
    <div class="vue-mask-content" @touchmove.prevent>
      <div class="vue-dialog-mask" :style="{'top':top}" @click='clickShadow'></div>
      <slot></slot>
    </div>
  </div>
</template>
<script>
export default {
  name: 'YtMask',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    closeOnClickShadow: Boolean,
    top: {
      type: String,
      default: "0"
    }
  },
  methods: {
    clickShadow() {
      if (this.closeOnClickShadow) {
        this.close();
      }
      this.$emit("click-shadow");
    },
    close() {
      this.$emit("update:show", false);
    }
  },
}
</script>
