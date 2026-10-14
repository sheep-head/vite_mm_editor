<template>
  <section class="el-container is-vertical full-height">
    <yt-header v-if="showChrome"></yt-header>
    <section class="el-container main-row">
      <main
        class="el-main"
        :class="{
          'is-workspace': !showChrome,
          'is-editor': isEditorMain,
          'is-page': showChrome && !isEditorMain,
        }">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive exclude="WorkspaceSelect">
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </main>
    </section>
  </section>
</template>
<script>
import YtHeader from '@/components/TheHeader.vue'

export default {
  name: 'App',
  components: {
    YtHeader,
  },
  computed: {
    showChrome() {
      return this.$route.path !== '/workspace'
    },
    isEditorMain() {
      return this.$route.path === '/' || this.$route.path === '/editor'
    },
  },
}
</script>
<style scoped>
.main-row {
  flex: 1;
  min-height: 0;
  height: calc(100% - 52px);
}
.el-main {
  padding: 0;
  min-height: 0;
  overflow: hidden;
}
.el-main.is-workspace {
  padding: 0;
}
.el-main.is-editor {
  padding: 0;
  height: 100%;
}
.el-main.is-page {
  padding: 12px;
  overflow: auto;
}
</style>
