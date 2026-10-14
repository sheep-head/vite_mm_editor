<template>
  <div class="db-system" v-if="data">
    <el-tabs v-model="subTab" type="card">
      <el-tab-pane label="系统 1" name="s1">
        <el-form label-width="120px" size="small">
          <el-form-item label="游戏标题">
            <el-input v-model="data.gameTitle" />
          </el-form-item>
          <el-form-item label="货币单位">
            <el-input v-model="data.currencyUnit" />
          </el-form-item>
          <el-form-item label="起始地图 ID">
            <el-input-number v-model="data.startMapId" :controls="false" />
          </el-form-item>
          <el-form-item label="起始 X">
            <el-input-number v-model="data.startX" :controls="false" />
          </el-form-item>
          <el-form-item label="起始 Y">
            <el-input-number v-model="data.startY" :controls="false" />
          </el-form-item>
          <el-form-item label="战斗系统">
            <el-input-number v-model="data.battleSystem" :controls="false" />
          </el-form-item>
          <el-divider>选项</el-divider>
          <el-form-item label="跟随队员">
            <el-switch v-model="data.optFollowers" />
          </el-form-item>
          <el-form-item label="显示 TP">
            <el-switch v-model="data.optDisplayTp" />
          </el-form-item>
          <el-form-item label="侧面战斗">
            <el-switch v-model="data.optSideView" />
          </el-form-item>
          <el-form-item label="自动存档">
            <el-switch v-model="data.optAutosave" />
          </el-form-item>
          <el-form-item label="跳过标题">
            <el-switch v-model="data.optDrawTitle" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="系统 2 / advanced" name="s2">
        <el-form label-width="140px" size="small" v-if="data.advanced">
          <el-form-item label="gameId">
            <el-input-number v-model="data.advanced.gameId" :controls="false" />
          </el-form-item>
          <el-form-item label="画面宽">
            <el-input-number v-model="data.advanced.screenWidth" :controls="false" />
          </el-form-item>
          <el-form-item label="画面高">
            <el-input-number v-model="data.advanced.screenHeight" :controls="false" />
          </el-form-item>
          <el-form-item label="UI 区宽">
            <el-input-number v-model="data.advanced.uiAreaWidth" :controls="false" />
          </el-form-item>
          <el-form-item label="UI 区高">
            <el-input-number v-model="data.advanced.uiAreaHeight" :controls="false" />
          </el-form-item>
          <el-form-item label="主字体文件">
            <el-input v-model="data.advanced.mainFontFilename" />
          </el-form-item>
          <el-form-item label="数字字体文件">
            <el-input v-model="data.advanced.numberFontFilename" />
          </el-form-item>
          <el-form-item label="字号">
            <el-input-number v-model="data.advanced.fontSize" :controls="false" />
          </el-form-item>
          <el-form-item label="窗口不透明度">
            <el-input-number v-model="data.advanced.windowOpacity" :controls="false" />
          </el-form-item>
        </el-form>
        <el-alert v-else type="info" :closable="false" title="当前 System.json 无 advanced 字段（非 MZ 形数据也可先手工补）" />
        <el-divider>类型数组（JSON）</el-divider>
        <el-form label-width="100px" size="small">
          <el-form-item label="elements">
            <el-input :model-value="arrJson('elements')" type="textarea" :rows="3" @update:model-value="(v) => setArr('elements', v)" />
          </el-form-item>
          <el-form-item label="skillTypes">
            <el-input :model-value="arrJson('skillTypes')" type="textarea" :rows="3" @update:model-value="(v) => setArr('skillTypes', v)" />
          </el-form-item>
          <el-form-item label="weaponTypes">
            <el-input :model-value="arrJson('weaponTypes')" type="textarea" :rows="3" @update:model-value="(v) => setArr('weaponTypes', v)" />
          </el-form-item>
          <el-form-item label="armorTypes">
            <el-input :model-value="arrJson('armorTypes')" type="textarea" :rows="3" @update:model-value="(v) => setArr('armorTypes', v)" />
          </el-form-item>
          <el-form-item label="equipTypes">
            <el-input :model-value="arrJson('equipTypes')" type="textarea" :rows="3" @update:model-value="(v) => setArr('equipTypes', v)" />
          </el-form-item>
          <el-form-item label="switches(名)">
            <el-input :model-value="arrJson('switches')" type="textarea" :rows="4" @update:model-value="(v) => setArr('switches', v)" />
          </el-form-item>
          <el-form-item label="variables(名)">
            <el-input :model-value="arrJson('variables')" type="textarea" :rows="4" @update:model-value="(v) => setArr('variables', v)" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </div>
  <div v-else class="db-empty">System 未加载</div>
</template>

<script>
import DataManager from '@/utils/DataManager'

export default {
  name: 'DatabaseSystemPanel',
  emits: ['dirty-change'],
  data() {
    return {
      data: null,
      dirty: false,
      subTab: 's1',
      _watchStop: null,
    }
  },
  watch: {
    dirty(v) {
      this.$emit('dirty-change', v)
    },
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    if (this._watchStop) this._watchStop()
  },
  methods: {
    load() {
      if (this._watchStop) this._watchStop()
      const raw = DataManager.$loadDataSync('System', false, false)
      if (!raw || typeof raw !== 'object') {
        this.data = null
        this.$message.error('System 加载失败')
        return
      }
      this.data = JSON.parse(JSON.stringify(raw))
      if (!this.data.advanced) {
        this.data.advanced = {
          gameId: 0,
          screenWidth: 816,
          screenHeight: 624,
          uiAreaWidth: 816,
          uiAreaHeight: 624,
          mainFontFilename: 'GameFont',
          numberFontFilename: '',
          fallbackFonts: 'Verdana, sans-serif',
          fontSize: 26,
          windowOpacity: 255,
          screenScale: 1,
          picturesUpperLimit: 100,
        }
      }
      this.dirty = false
      this._watchStop = this.$watch(
        'data',
        () => {
          this.dirty = true
        },
        { deep: true }
      )
    },
    arrJson(key) {
      try {
        return JSON.stringify(this.data[key] ?? [], null, 2)
      } catch (e) {
        return '[]'
      }
    },
    setArr(key, text) {
      try {
        this.data[key] = JSON.parse(text)
        this.dirty = true
      } catch (e) {
        this.$message.warning(`${key} JSON 无效`)
      }
    },
    save() {
      const ok = DataManager.$saveDataSync('System', this.data)
      if (ok) {
        this.dirty = false
        this.$message.success('System 已保存')
      } else {
        this.$message.error('System 保存失败')
      }
      return ok
    },
    isDirty() {
      return this.dirty
    },
    reload() {
      this.load()
    },
  },
}
</script>

<style scoped>
.db-system {
  height: 100%;
  overflow: auto;
  padding: 8px 12px;
}
.db-empty {
  padding: 40px;
  text-align: center;
  color: var(--app-text-muted);
}
</style>
