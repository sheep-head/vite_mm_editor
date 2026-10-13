<template>
  <section class="el-container is-vertical full-height">
    <yt-header v-if="showChrome"></yt-header>
    <section class="el-container">
      <menu-slider v-if="showChrome"></menu-slider>
      <main class="el-main" :class="{ 'is-workspace': !showChrome }">
        <!--
          必须只有一个稳定的 router-view。
          keep-alive 内的 <component> 不要绑动态 key，否则 Vue3 会报
          parentComponent.ctx.deactivate is not a function，路由全部挂掉。
        -->
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
import MenuSlider from '@/components/MenuSlider.vue'

export default {
  name: 'App',
  components: {
    YtHeader,
    MenuSlider,
  },
  computed: {
    showChrome() {
      return this.$route.path !== '/workspace'
    }
  }
}
</script>
<style scoped>
.el-main.is-workspace {
  padding: 0;
}
</style>
