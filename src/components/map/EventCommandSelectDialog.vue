<template>
  <el-dialog
    :model-value="modelValue"
    title="事件指令"
    width="720px"
    top="8vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="ev-cmd-select"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="ecs-tabs">
      <button
        v-for="p in [1, 2, 3]"
        :key="p"
        type="button"
        class="ecs-tab"
        :class="{ active: page === p }"
        @click="page = p">
        {{ p }}
      </button>
    </div>
    <div class="ecs-body">
      <div class="ecs-col">
        <fieldset v-for="g in leftGroups" :key="'L' + g.name" class="ecs-group">
          <legend>{{ g.name }}</legend>
          <button
            v-for="item in g.items"
            :key="item.label + item.code"
            type="button"
            class="ecs-btn"
            @click="pick(item)">
            {{ item.label }}
          </button>
        </fieldset>
      </div>
      <div class="ecs-col">
        <fieldset v-for="g in rightGroups" :key="'R' + g.name" class="ecs-group">
          <legend>{{ g.name }}</legend>
          <button
            v-for="item in g.items"
            :key="item.label + item.code"
            type="button"
            class="ecs-btn"
            @click="pick(item)">
            {{ item.label }}
          </button>
        </fieldset>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { getCatalogByPage } from './eventCommandCatalog'

/** 各页左右列分组名（对齐截图） */
const PAGE_SPLIT = {
  1: {
    left: ['信息', '游戏进程', '流程控制'],
    right: ['队伍', '角色'],
  },
  2: {
    left: ['移动', '人物', '图片'],
    right: ['定时', '画面', '音频和视频'],
  },
  3: {
    left: ['场景控制', '系统设置'],
    right: ['地图', '战斗', '高级'],
  },
}

export default {
  name: 'EventCommandSelectDialog',
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'select'],
  data() {
    return { page: 1 }
  },
  computed: {
    groups() {
      return getCatalogByPage(this.page)
    },
    leftGroups() {
      const names = PAGE_SPLIT[this.page].left
      return this.groups.filter((g) => names.includes(g.name))
    },
    rightGroups() {
      const names = PAGE_SPLIT[this.page].right
      return this.groups.filter((g) => names.includes(g.name))
    },
  },
  watch: {
    modelValue(v) {
      if (v) this.page = 1
    },
  },
  methods: {
    pick(item) {
      // 由父组件决定是否关闭（插入需参数时先关墙，取消参数再开回）
      this.$emit('select', item)
    },
  },
}
</script>

<style scoped>
.ecs-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--app-border);
}
.ecs-tab {
  min-width: 40px;
  height: 28px;
  border: 1px solid var(--app-border);
  border-bottom: none;
  margin-right: 2px;
  background: var(--app-surface-2);
  cursor: pointer;
  color: var(--app-text);
}
.ecs-tab.active {
  background: var(--app-surface);
  font-weight: 600;
  color: var(--app-active-color);
}
.ecs-body {
  display: flex;
  gap: 12px;
  max-height: 60vh;
  overflow: auto;
  padding: 4px;
}
.ecs-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ecs-group {
  margin: 0;
  padding: 8px 10px 10px;
  border: 1px solid var(--app-border);
  border-radius: 4px;
}
.ecs-group legend {
  padding: 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-muted);
}
.ecs-btn {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 5px 8px;
  text-align: left;
  border: 1px solid var(--app-border);
  border-radius: 3px;
  background: linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-2) 100%);
  color: var(--app-text);
  font-size: 12px;
  cursor: pointer;
}
.ecs-btn:hover {
  border-color: var(--app-active-color);
  color: var(--app-active-color);
}
</style>
