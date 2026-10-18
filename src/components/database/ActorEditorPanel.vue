<template>
  <div v-if="modelValue" class="actor-ed">
    <div class="col-left">
      <db-group-box title="基本设置">
        <el-form size="small" label-width="72px" @submit.prevent>
          <el-form-item label="名称">
            <el-input v-model="modelValue.name" />
          </el-form-item>
          <el-form-item label="昵称">
            <el-input v-model="modelValue.nickname" />
          </el-form-item>
          <el-form-item label="职业">
            <id-name-field v-model="modelValue.classId" type="class" />
          </el-form-item>
          <el-form-item label="初始等级">
            <el-input-number v-model="modelValue.initialLevel" :min="1" :max="99" controls-position="right" />
          </el-form-item>
          <el-form-item label="最高等级">
            <el-input-number v-model="modelValue.maxLevel" :min="1" :max="99" controls-position="right" />
          </el-form-item>
          <el-form-item label="简介">
            <el-input v-model="modelValue.profile" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
      </db-group-box>

      <db-group-box title="图像" class="mt">
        <div class="img-row">
          <div class="img-block" @click="openFace">
            <div class="img-cap">脸图</div>
            <canvas ref="faceCv" width="144" height="144" class="img-cv" />
          </div>
          <div class="img-block" @click="openChar">
            <div class="img-cap">行走图</div>
            <canvas ref="charCv" width="96" height="96" class="img-cv" />
          </div>
          <div class="img-block" @click="openBattler">
            <div class="img-cap">[侧视] 战斗图</div>
            <canvas ref="svCv" width="96" height="96" class="img-cv" />
          </div>
        </div>
      </db-group-box>

      <db-group-box title="初期装备" class="mt">
        <el-table :data="equipRows" size="small" max-height="240">
          <el-table-column label="类型" width="100" prop="label" />
          <el-table-column label="装备物品" min-width="180">
            <template #default="{ row }">
              <div class="equip-cell">
                <span class="equip-name">{{ equipDisplay(row.index) }}</span>
                <el-button size="small" @click="pickEquip(row)">…</el-button>
                <el-button size="small" link @click="clearEquip(row.index)">无</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </db-group-box>
    </div>

    <div class="col-right">
      <db-group-box title="特性">
        <traits-table-editor v-model="modelValue.traits" />
      </db-group-box>
      <db-group-box title="备注" class="mt">
        <el-input v-model="modelValue.note" type="textarea" :rows="8" />
      </db-group-box>
    </div>

    <face-sheet-picker-dialog
      v-model="faceOpen"
      :model-name="modelValue.faceName || ''"
      :model-index="modelValue.faceIndex || 0"
      @confirm="onFace" />
    <character-sheet-picker-dialog
      v-model="charOpen"
      :model-name="modelValue.characterName || ''"
      :model-index="modelValue.characterIndex || 0"
      @confirm="onChar" />
    <battler-picker-dialog
      v-model="svOpen"
      folder="sv_actors"
      :model-name="modelValue.battlerName || ''"
      :show-hue="false"
      @confirm="onBattler" />
    <id-name-picker-dialog
      v-model="equipPickerOpen"
      :type="equipPickerType"
      :model-id="equipPickerId"
      @confirm="onEquipPicked" />
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import TraitsTableEditor from './shared/TraitsTableEditor.vue'
import IdNameField from './shared/IdNameField.vue'
import {
  equipSlotCount,
  equipTypeLabel,
  isWeaponEquipSlot,
  formatRecordName,
} from './shared/systemLookups'
import { normalizeActor } from './shared/dbDefaults'
import {
  imageAbsPath,
  loadImageFile,
  drawFaceIndexPreview,
  drawCharacterIndexPreview,
} from '@/utils/imgAssets'
import FaceSheetPickerDialog from '@/components/map/pickers/FaceSheetPickerDialog.vue'
import CharacterSheetPickerDialog from '@/components/map/pickers/CharacterSheetPickerDialog.vue'
import BattlerPickerDialog from '@/components/map/pickers/BattlerPickerDialog.vue'
import IdNamePickerDialog from '@/components/map/pickers/IdNamePickerDialog.vue'

export default {
  name: 'ActorEditorPanel',
  components: {
    DbGroupBox,
    TraitsTableEditor,
    IdNameField,
    FaceSheetPickerDialog,
    CharacterSheetPickerDialog,
    BattlerPickerDialog,
    IdNamePickerDialog,
  },
  props: {
    modelValue: { type: Object, default: null },
  },
  data() {
    return {
      faceOpen: false,
      charOpen: false,
      svOpen: false,
      equipPickerOpen: false,
      equipPickerType: 'weapon',
      equipPickerId: 0,
      equipPickerIndex: 0,
    }
  },
  computed: {
    equipRows() {
      const n = equipSlotCount() || 5
      const rows = []
      for (let i = 0; i < n; i++) {
        rows.push({ index: i, label: equipTypeLabel(i) })
      }
      return rows
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeActor(v)
        this.$nextTick(() => this.paintAll())
      },
    },
    'modelValue.faceName'() {
      this.paintFace()
    },
    'modelValue.faceIndex'() {
      this.paintFace()
    },
    'modelValue.characterName'() {
      this.paintChar()
    },
    'modelValue.characterIndex'() {
      this.paintChar()
    },
    'modelValue.battlerName'() {
      this.paintSv()
    },
  },
  methods: {
    openFace() {
      this.faceOpen = true
    },
    openChar() {
      this.charOpen = true
    },
    openBattler() {
      this.svOpen = true
    },
    onFace({ name, index }) {
      this.modelValue.faceName = name || ''
      this.modelValue.faceIndex = index || 0
      this.paintFace()
    },
    onChar({ name, index }) {
      this.modelValue.characterName = name || ''
      this.modelValue.characterIndex = index || 0
      this.paintChar()
    },
    onBattler({ name }) {
      this.modelValue.battlerName = name || ''
      this.paintSv()
    },
    equipDisplay(i) {
      const id = (this.modelValue.equips && this.modelValue.equips[i]) || 0
      if (!id) return '无'
      const file = isWeaponEquipSlot(i) ? 'Weapons' : 'Armors'
      return formatRecordName(file, id)
    },
    pickEquip(row) {
      this.equipPickerIndex = row.index
      this.equipPickerType = isWeaponEquipSlot(row.index) ? 'weapon' : 'armor'
      this.equipPickerId = (this.modelValue.equips && this.modelValue.equips[row.index]) || 0
      this.equipPickerOpen = true
    },
    onEquipPicked(id) {
      if (!Array.isArray(this.modelValue.equips)) this.modelValue.equips = []
      this.modelValue.equips[this.equipPickerIndex] = Number(id) || 0
    },
    clearEquip(i) {
      if (!Array.isArray(this.modelValue.equips)) return
      this.modelValue.equips[i] = 0
    },
    paintAll() {
      this.paintFace()
      this.paintChar()
      this.paintSv()
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
    async paintFace() {
      const canvas = this.$refs.faceCv
      if (!canvas || !this.modelValue) return
      const ctx = canvas.getContext('2d')
      this.checker(ctx, canvas.width, canvas.height)
      if (!this.modelValue.faceName) return
      const img = await loadImageFile(imageAbsPath('faces', this.modelValue.faceName))
      if (!img) return
      drawFaceIndexPreview(ctx, img, this.modelValue.faceName, this.modelValue.faceIndex || 0, 0, 0, 144, 144)
    },
    async paintChar() {
      const canvas = this.$refs.charCv
      if (!canvas || !this.modelValue) return
      const ctx = canvas.getContext('2d')
      this.checker(ctx, canvas.width, canvas.height)
      if (!this.modelValue.characterName) return
      const img = await loadImageFile(imageAbsPath('characters', this.modelValue.characterName))
      if (!img) return
      drawCharacterIndexPreview(
        ctx,
        img,
        this.modelValue.characterName,
        this.modelValue.characterIndex || 0,
        16,
        8,
        64,
        80
      )
    },
    async paintSv() {
      const canvas = this.$refs.svCv
      if (!canvas || !this.modelValue) return
      const ctx = canvas.getContext('2d')
      this.checker(ctx, canvas.width, canvas.height)
      if (!this.modelValue.battlerName) return
      const img = await loadImageFile(imageAbsPath('sv_actors', this.modelValue.battlerName))
      if (!img) return
      const fw = img.width / 9
      const fh = img.height / 6
      const scale = Math.min(96 / fw, 96 / fh, 1)
      const dw = fw * scale
      const dh = fh * scale
      ctx.drawImage(img, 0, 0, fw, fh, (96 - dw) / 2, (96 - dh) / 2, dw, dh)
    },
  },
}
</script>

<style scoped>
.actor-ed {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.col-left {
  flex: 1.2;
  min-width: 360px;
}
.col-right {
  flex: 1;
  min-width: 280px;
}
.mt {
  margin-top: 10px;
}
.img-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.img-block {
  cursor: pointer;
}
.img-cap {
  font-size: 11px;
  margin-bottom: 2px;
  color: var(--app-text-muted);
}
.img-cv {
  border: 1px solid var(--app-border);
  image-rendering: pixelated;
  display: block;
}
.equip-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
.equip-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
