<template>
  <div v-if="modelValue" class="enemy-ed">
    <div class="col-mid">
      <db-group-box title="基本设置">
        <el-form size="small" label-width="72px" @submit.prevent>
          <el-form-item label="名称">
            <el-input v-model="modelValue.name" style="width: 220px" />
          </el-form-item>
          <el-form-item label="图像">
            <div class="battler-box" @click="battlerOpen = true">
              <canvas ref="battlerCv" width="128" height="128" class="battler-cv" />
              <div class="battler-meta">色相 {{ modelValue.battlerHue || 0 }}</div>
            </div>
          </el-form-item>
          <div class="params-grid">
            <div v-for="(lab, i) in labels" :key="i" class="param-item">
              <span class="param-lab">{{ lab }}</span>
              <el-input-number
                v-model="modelValue.params[i]"
                :min="0"
                controls-position="right"
                size="small"
                class="param-num" />
            </div>
          </div>
        </el-form>
      </db-group-box>

      <div class="row2 mt">
        <db-group-box title="报酬" class="rewards">
          <el-form size="small" label-width="56px" @submit.prevent>
            <el-form-item label="经验">
              <el-input-number v-model="modelValue.exp" :min="0" controls-position="right" />
            </el-form-item>
            <el-form-item label="金币">
              <el-input-number v-model="modelValue.gold" :min="0" controls-position="right" />
            </el-form-item>
          </el-form>
        </db-group-box>
        <db-group-box title="掉落物品" class="drops">
          <div v-for="(d, i) in modelValue.dropItems" :key="i" class="drop-row">
            <el-select v-model="d.kind" size="small" style="width: 88px">
              <el-option v-for="o in dropKinds" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <id-name-field
              v-if="d.kind > 0"
              v-model="d.dataId"
              :type="dropType(d.kind)"
              width="140px" />
            <span v-else class="drop-none">无</span>
            <span class="den-lab">1/</span>
            <el-input-number v-model="d.denominator" :min="1" size="small" controls-position="right" class="den" />
          </div>
        </db-group-box>
      </div>

      <db-group-box title="行动模式" class="mt">
        <div class="tools">
          <el-button size="small" @click="addAction">添加</el-button>
          <el-button size="small" :disabled="actionSel < 0" @click="editAction">编辑</el-button>
          <el-button size="small" :disabled="actionSel < 0" @click="removeAction">删除</el-button>
        </div>
        <el-table
          :data="modelValue.actions"
          size="small"
          max-height="200"
          highlight-current-row
          @current-change="onActionCurrent"
          @row-dblclick="(row) => openAction(row)">
          <el-table-column label="技能" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ skillName(row.skillId) }}</template>
          </el-table-column>
          <el-table-column label="条件" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ condText(row) }}</template>
          </el-table-column>
          <el-table-column label="评级" width="64" prop="rating" />
        </el-table>
      </db-group-box>
    </div>

    <div class="col-right">
      <db-group-box title="特性">
        <traits-table-editor v-model="modelValue.traits" />
      </db-group-box>
      <db-group-box title="备注" class="mt">
        <el-input v-model="modelValue.note" type="textarea" :rows="12" />
      </db-group-box>
    </div>

    <battler-picker-dialog
      v-model="battlerOpen"
      folder="enemies"
      :model-name="modelValue.battlerName || ''"
      :model-hue="modelValue.battlerHue || 0"
      :show-hue="true"
      @confirm="onBattler" />
    <enemy-action-edit-dialog
      v-model="actionOpen"
      :action="editActionObj"
      @confirm="onActionConfirm" />
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import TraitsTableEditor from './shared/TraitsTableEditor.vue'
import IdNameField from './shared/IdNameField.vue'
import EnemyActionEditDialog from './shared/EnemyActionEditDialog.vue'
import BattlerPickerDialog from '@/components/map/pickers/BattlerPickerDialog.vue'
import { paramLabels, formatRecordName } from './shared/systemLookups'
import {
  DROP_KIND_OPTIONS,
  ENEMY_ACTION_CONDITION_OPTIONS,
  optionLabel,
} from './shared/rpgDbConstants'
import { normalizeEnemy } from './shared/dbDefaults'
import { markRaw } from 'vue'
import { resolveBattlerAbsPath, loadImageFile } from '@/utils/imgAssets'

export default {
  name: 'EnemyEditorPanel',
  components: {
    DbGroupBox,
    TraitsTableEditor,
    IdNameField,
    EnemyActionEditDialog,
    BattlerPickerDialog,
  },
  props: {
    modelValue: { type: Object, default: null },
  },
  data() {
    return {
      battlerOpen: false,
      actionOpen: false,
      actionSel: -1,
      editActionObj: null,
      editActionIndex: -1,
    }
  },
  computed: {
    labels() {
      return paramLabels()
    },
    dropKinds() {
      return DROP_KIND_OPTIONS
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeEnemy(v)
        this.$nextTick(() => this.paintBattler())
      },
    },
    'modelValue.battlerName'() {
      this.paintBattler()
    },
    'modelValue.battlerHue'() {
      this.paintBattler()
    },
  },
  methods: {
    dropType(kind) {
      return { 1: 'item', 2: 'weapon', 3: 'armor' }[kind] || 'item'
    },
    skillName(id) {
      return formatRecordName('Skills', id)
    },
    condText(row) {
      const t = optionLabel(ENEMY_ACTION_CONDITION_OPTIONS, row.conditionType)
      if (!row.conditionType) return t
      return `${t} (${row.conditionParam1}, ${row.conditionParam2})`
    },
    onBattler({ name, hue }) {
      this.modelValue.battlerName = name || ''
      this.modelValue.battlerHue = hue || 0
      this.paintBattler()
    },
    checker(ctx, w, h) {
      const s = 8
      for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
          ctx.fillStyle = (x / s + y / s) % 2 === 0 ? '#ccc' : '#fff'
          ctx.fillRect(x, y, s, s)
        }
      }
    },
    async paintBattler() {
      const canvas = this.$refs.battlerCv
      if (!canvas || !this.modelValue) return
      const ctx = canvas.getContext('2d')
      this.checker(ctx, canvas.width, canvas.height)
      if (!this.modelValue.battlerName) return
      const loaded = await loadImageFile(resolveBattlerAbsPath(this.modelValue.battlerName, 'enemies'))
      if (!loaded) return
      const img = markRaw(loaded)
      const scale = Math.min(128 / img.width, 128 / img.height, 1)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, (128 - dw) / 2, (128 - dh) / 2, dw, dh)
    },
    onActionCurrent(row) {
      this.actionSel = row ? this.modelValue.actions.indexOf(row) : -1
    },
    addAction() {
      this.editActionIndex = -1
      this.editActionObj = {
        skillId: 1,
        rating: 5,
        conditionType: 0,
        conditionParam1: 0,
        conditionParam2: 0,
      }
      this.actionOpen = true
    },
    editAction() {
      if (this.actionSel < 0) return
      this.openAction(this.modelValue.actions[this.actionSel])
    },
    openAction(row) {
      this.editActionIndex = this.modelValue.actions.indexOf(row)
      this.editActionObj = { ...row }
      this.actionOpen = true
    },
    removeAction() {
      if (this.actionSel < 0) return
      this.modelValue.actions.splice(this.actionSel, 1)
      this.actionSel = -1
    },
    onActionConfirm(a) {
      if (this.editActionIndex >= 0) this.modelValue.actions[this.editActionIndex] = a
      else this.modelValue.actions.push(a)
    },
  },
}
</script>

<style scoped>
.enemy-ed {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.col-mid {
  flex: 1.2;
  min-width: 380px;
}
.col-right {
  flex: 1;
  min-width: 280px;
}
.mt {
  margin-top: 10px;
}
.battler-box {
  cursor: pointer;
  display: inline-block;
}
.battler-cv {
  border: 1px solid var(--app-border);
  image-rendering: pixelated;
  display: block;
}
.battler-meta {
  font-size: 11px;
  color: var(--app-text-muted);
  margin-top: 2px;
}
.params-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-top: 8px;
}
.param-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.param-lab {
  width: 72px;
  font-size: 12px;
  flex-shrink: 0;
}
.param-num {
  width: 100px;
}
.row2 {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.rewards {
  width: 180px;
  flex-shrink: 0;
}
.drops {
  flex: 1;
  min-width: 280px;
}
.drop-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.drop-none {
  width: 140px;
  font-size: 12px;
  color: var(--app-text-muted);
}
.den-lab {
  font-size: 12px;
}
.den {
  width: 88px;
}
.tools {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
</style>
