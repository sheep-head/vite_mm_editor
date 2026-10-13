<template>
  <div class="menu-main-div" :style="{width: isCollapse ? '64px' : '200px'}">
    <aside class="el-aside">
      <div style="text-align: right;padding-right: 15px;">
        <yt-icon
            :name="isCollapse ? 'el-icon-s-fold' : 'el-icon-s-unfold'"
            class="collapse-icon"
            @click="isCollapse = !isCollapse"></yt-icon>
      </div>
      <el-menu
          :default-openeds="openeds"
          :default-active="activeIndex"
          :collapse="isCollapse"
          class="el-menu-vertical-demo"
          @select="handleSelect"
      >
          <template v-for="(item, index) in routeMenu" :key="item.id">
            <el-sub-menu :index="item.id">
              <template #title>
                <yt-icon :name="item.icon"></yt-icon>
                <span>{{item.name}}</span>
              </template>
            <template v-if="item.children">
              <template v-for="(child, index) in item.children" :key="index">
                <el-menu-item-group v-if="child.groupName">
                  <template #title>{{child.groupName}}</template>
                  <el-menu-item :key="child2.path" v-for="(child2, index) in child.list" :index="child2.path"><yt-icon v-if="child2.icon" :name="child2.icon"></yt-icon>{{child2.name}}</el-menu-item>
                </el-menu-item-group>
                <el-menu-item-group v-else>
                  <el-menu-item :index="child.path"><yt-icon v-if="child.icon" :name="child.icon"></yt-icon>{{child.name}}</el-menu-item>
                </el-menu-item-group>
              </template>
            </template>
            </el-sub-menu>
          </template>
      </el-menu>
    </aside>
  </div>
</template>
<script>
import { routeMenu } from '@/router'

export default {
  name: 'MenuSlider',
  data() {
    return {
      activeIndex:"",
      isCollapse:false,
      openeds: ['1'],
      routeMenu
    };
  },
  methods:{
    handleSelect(path) {
      if (!path || path === this.$route.path) {
        this.activeIndex = path || this.$route.path;
        return;
      }
      this.activeIndex = path;
      this.$router.push({ path }).catch(() => true);
    }
  },
  watch:{
    //解决浏览器前进后退按钮，导航正常高亮显示
    $route(to){
      this.activeIndex = to.path;
    }
  },
  mounted(){
    window.menu = this;
    this.activeIndex = this.$route.path;
  },
}
</script>
<style>
.menu-main-div{
  transition: all .3s;
  background-color: var(--app-menu-bg);
  flex-shrink: 0;
  overflow: hidden;
  box-sizing: border-box;
}
.menu-main-div .el-aside{
  width: 100% !important;
  --el-aside-width: 100%;
  box-sizing: border-box;
}
.menu-main-div .collapse-icon{
  cursor: pointer;
  color: var(--app-menu-text);
}
.el-menu-vertical-demo{
  width: 64px;
  border-right: none;
}
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}
.el-container{
  overflow: hidden;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-orient: horizontal;
  -webkit-box-direction: normal;
  -ms-flex-direction: row;
  flex-direction: row;
  -webkit-box-flex: 1;
  -ms-flex: 1;
  flex: 1;
  -ms-flex-preferred-size: auto;
  flex-basis: auto;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  min-width: 0;
}
.el-container.is-vertical {
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  -ms-flex-direction: column;
  flex-direction: column;
}
.full-height {
  height: 100%;
}
</style>
