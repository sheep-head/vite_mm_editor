<template>
  <el-icon v-if="component" :class="['yt-icon', name]">
    <component :is="component" />
  </el-icon>
</template>
<script>
import {
  DataAnalysis,
  MapLocation,
  Sort,
  Warning,
  Location,
  Setting,
  Tickets,
  Checked,
  HomeFilled,
  Fold,
  Expand,
  ArrowDown,
  CircleClose,
  Close,
  Search,
  Loading
} from '@element-plus/icons-vue'

/**
 * element-ui 的字体图标名 -> element-plus 的 svg 图标组件
 * 路由菜单里的 icon 名称保持和原项目一致，这里统一做一次映射
 */
const ICON_MAP = {
  'el-icon-s-data': DataAnalysis,
  'el-icon-map-location': MapLocation,
  'el-icon-sort': Sort,
  'el-icon-warning-outline': Warning,
  'el-icon-location': Location,
  'el-icon-setting': Setting,
  'el-icon-tickets': Tickets,
  'el-icon-s-check': Checked,
  'el-icon-s-home': HomeFilled,
  'el-icon-s-fold': Fold,
  'el-icon-s-unfold': Expand,
  'el-icon-arrow-down': ArrowDown,
  'el-icon-circle-close': CircleClose,
  'el-icon-close': Close,
  'el-icon-search': Search,
  'el-icon-loading': Loading
}

export default {
  name: 'YtIcon',
  props: {
    name: {
      type: String,
      default: ''
    }
  },
  computed: {
    component() {
      return ICON_MAP[this.name] || null
    }
  }
}
</script>
