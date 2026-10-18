<template>
  <fieldset class="db-group">
    <legend v-if="title" class="db-group-title">{{ title }}</legend>
    <div class="db-group-body">
      <slot />
    </div>
  </fieldset>
</template>

<script>
export default {
  name: 'DbGroupBox',
  props: {
    title: { type: String, default: '' },
  },
}
</script>

<style scoped>
.db-group {
  margin: 0;
  padding: 8px 10px 10px;
  border: 1px solid var(--app-border, #c0c4cc);
  border-radius: 2px;
  background: var(--app-surface, #f7f8fa);
  min-width: 0;
}
.db-group-title {
  padding: 0 6px;
  font-size: 12px;
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
}
.db-group-body {
  min-width: 0;
}
</style>
