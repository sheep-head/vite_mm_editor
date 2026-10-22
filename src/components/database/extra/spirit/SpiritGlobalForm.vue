<template>
  <div class="spirit-layout">
    <aside class="spirit-side">
      <div class="side-title">全局设定</div>
      <p class="side-hint">在右侧编辑伴游全局参数</p>
    </aside>
    <main class="spirit-main">
      <el-form label-width="108px" class="spirit-form dense">
        <div class="form-grid">
          <el-form-item>
            <template #label>总开关 ID<FieldHelp :text="help.enableSwitchId" /></template>
            <el-input-number v-model="config.enableSwitchId" :min="0" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item>
            <template #label>环绕半径<FieldHelp :text="help.orbitRadius" /></template>
            <el-input-number v-model="config.orbitRadius" :min="0.1" :max="5" :step="0.05" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item>
            <template #label>跟随平滑<FieldHelp :text="help.followLerp" /></template>
            <el-input-number v-model="config.followLerp" :min="0.01" :max="1" :step="0.01" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item>
            <template #label>环绕角速度<FieldHelp :text="help.orbitSpeed" /></template>
            <el-input-number v-model="config.orbitSpeed" :min="0.001" :max="0.2" :step="0.005" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item>
            <template #label>战斗偏移 X<FieldHelp :text="help.battleOffsetX" /></template>
            <el-input-number v-model="config.battleOffsetX" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item>
            <template #label>战斗偏移 Y<FieldHelp :text="help.battleOffsetY" /></template>
            <el-input-number v-model="config.battleOffsetY" controls-position="right" class="ctrl-full" />
          </el-form-item>
          <el-form-item class="full">
            <template #label>菜单图标<FieldHelp :text="help.menuIcon" /></template>
            <ImageAssetPicker
              v-model="config.menuIcon"
              lock-folder="pictures"
              import-folder="pictures" />
          </el-form-item>
        </div>
      </el-form>
    </main>
  </div>
</template>

<script>
import FieldHelp from '@/components/spirit/FieldHelp.vue'
import ImageAssetPicker from '@/components/spirit/ImageAssetPicker.vue'

export default {
  name: 'SpiritGlobalForm',
  components: { FieldHelp, ImageAssetPicker },
  props: {
    config: { type: Object, required: true },
    help: { type: Object, required: true },
  },
}
</script>

<style scoped src="./spiritShared.css"></style>
