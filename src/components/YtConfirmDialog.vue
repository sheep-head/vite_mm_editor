<template>
  <div v-show='show2'>
    <div class="vue-dialog-mask"></div>
    <div class="vue-dialog">
      <div id="acceptDiv" class="vue-winDiv" :class="[active ? 'active' : '']">
        <div class="winTitleDiv">{{title}}</div>
        <slot name='content'></slot>
        <slot name='footer'>
          <div class="winButtonDiv">
            <button class="winOkBtn" style='float: left' @click="decided">确定</button>
            <button class="winCancelBtn" style='float: right' @click="cancel">取消</button>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'YtConfirmDialog',
  props: {
    title: {
      type: String,
      default: "提示"
    },
    show: {
      type: Boolean,
      default: false
    },
    closeOnDecided: Boolean,
  },
  data() {
    return {
      active: false,
      show2: false,
    }
  },
  methods: {
    decided() {
      if (this.closeOnDecided) {
        this.close();
      }
      this.$emit("decided");
    },
    cancel() {
      this.$emit("cancel");
      this.close();
    },
    close() {
      this.$emit("update:show", false);
    }
  },
  watch: {
    show: {
      handler() {
        if (this.show) {
          this.show2 = this.show
          setTimeout(() => { this.active = this.show }, 200)
        } else {
          this.active = this.show
          setTimeout(() => { this.show2 = this.show }, 200)

        }
      }, immediate: true
    }
  },
}
</script>
