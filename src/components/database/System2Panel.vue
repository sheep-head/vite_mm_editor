<template>
  <div class="s2">
    <div class="s2-left">
      <db-group-box title="图块大小">
        <el-radio-group v-model="data.tileSize">
          <el-radio :value="48">48×48</el-radio>
          <el-radio :value="32">32×32</el-radio>
          <el-radio :value="24">24×24</el-radio>
          <el-radio :value="16">16×16</el-radio>
        </el-radio-group>
      </db-group-box>
      <db-group-box title="菜单指令">
        <el-checkbox v-for="(label, i) in menuLabels" :key="i" v-model="data.menuCommands[i]">{{ label }}</el-checkbox>
      </db-group-box>
      <db-group-box title="物品类别">
        <el-checkbox v-for="(label, i) in itemLabels" :key="'c' + i" v-model="data.itemCategories[i]">{{ label }}</el-checkbox>
      </db-group-box>

      <db-group-box title="[侧视]魔法技能">
        <div class="magic-head">技能类型</div>
        <focus-list
          v-model="magicFocus"
          :items="data.magicSkills"
          empty-text="（无）"
          @activate="onMagicActivate"
          @remove="removeMagic"
          @insert="addMagic"
          @contextmenu="onMagicCtx">
          <template #default="{ item }">{{ skillTypeName(item) }}</template>
        </focus-list>
      </db-group-box>

      <db-group-box title="[侧视]攻击动作">
        <table class="motion-table">
          <thead>
            <tr>
              <th class="col-type">类型</th>
              <th class="col-motion">动作</th>
              <th class="col-img">图像</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in data.attackMotions" :key="i">
              <td class="col-type">{{ motionTypeLabel(i) }}</td>
              <td class="col-motion">
                <el-select v-model="row.type" size="small">
                  <el-option v-for="o in motionOptions" :key="o.value" :value="o.value" :label="o.label" />
                </el-select>
              </td>
              <td class="col-img">
                <el-select v-model="row.weaponImageId" size="small">
                  <el-option v-for="o in weaponImages" :key="o.value" :value="o.value" :label="o.label" />
                </el-select>
              </td>
            </tr>
          </tbody>
        </table>
      </db-group-box>
    </div>

    <db-group-box title="进阶设置" class="s2-adv">
      <table class="adv-table">
        <thead>
          <tr>
            <th class="adv-name">名称</th>
            <th class="adv-val">值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in advancedRows" :key="row.key">
            <td class="adv-name">{{ row.label }}</td>
            <td class="adv-val">
              <el-input-number
                v-if="row.kind === 'number'"
                v-model="data.advanced[row.key]"
                size="small"
                :controls="false"
                :min="row.min"
                :max="row.max"
                class="adv-input" />
              <el-input
                v-else
                v-model="data.advanced[row.key]"
                size="small"
                class="adv-input" />
            </td>
          </tr>
        </tbody>
      </table>
    </db-group-box>

    <popup-context-menu
      :visible="menu.visible"
      :x="menu.x"
      :y="menu.y"
      @update:visible="(v) => (menu.visible = v)">
      <template #default="{ action }">
        <li @click="action(() => addMagic())">添加</li>
        <li :class="{ disabled: !data.magicSkills.length }" @click="action(() => editMagic(magicFocus))">更改</li>
        <li :class="{ disabled: !data.magicSkills.length }" @click="action(() => removeMagic(magicFocus))">删除</li>
        <li class="sep" />
        <li :class="{ disabled: !canMagicMove(-1) }" @click="action(() => moveMagic(-1))">上移</li>
        <li :class="{ disabled: !canMagicMove(1) }" @click="action(() => moveMagic(1))">下移</li>
      </template>
    </popup-context-menu>

    <el-dialog v-model="magicPickVisible" title="技能类型" width="360px" append-to-body :close-on-click-modal="false">
      <el-select v-model="magicPickId" size="small" style="width: 100%" filterable>
        <el-option v-for="o in skillTypeOptions" :key="o.value" :value="o.value" :label="o.label" />
      </el-select>
      <template #footer>
        <el-button @click="magicPickVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMagicPick">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import FocusList from '@/components/shared/FocusList.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'
import { typeList, typeOptions } from './shared/systemLookups'

const MENU = ['物品', '技能', '装备', '状态', '整队', '保存']
const ITEMS = ['物品', '武器', '防具', '重要物品']
const MOTIONS = [
  { value: 0, label: '突刺' },
  { value: 1, label: '挥舞' },
  { value: 2, label: '投掷' },
]
const WEAPON_IMAGES = [
  '无', '匕首', '剑', '链枷', '斧', '矛', '弓', '弩', '枪', '爪', '手套', '魔杖',
]

export default {
  name: 'System2Panel',
  components: { DbGroupBox, FocusList, PopupContextMenu },
  props: { data: { type: Object, required: true } },
  data() {
    return {
      menuLabels: MENU,
      itemLabels: ITEMS,
      motionOptions: MOTIONS,
      magicFocus: 0,
      magicPickVisible: false,
      magicPickMode: 'add',
      magicPickIndex: -1,
      magicPickId: 1,
      menu: { visible: false, x: 0, y: 0 },
    }
  },
  computed: {
    skillTypeOptions() {
      return typeOptions(typeList('skillTypes'), { includeNone: false })
    },
    weaponImages() {
      return WEAPON_IMAGES.map((label, value) => ({ value, label }))
    },
    advancedRows() {
      const adv = this.data.advanced || {}
      const rows = [
        { key: 'gameId', label: '游戏编码', kind: 'number' },
        { key: 'screenWidth', label: '画面宽度', kind: 'number' },
        { key: 'screenHeight', label: '画面高度', kind: 'number' },
        { key: 'uiAreaWidth', label: '界面区域宽度', kind: 'number' },
        { key: 'uiAreaHeight', label: '界面区域高度', kind: 'number' },
        { key: 'mainFontFilename', label: '主字体名称', kind: 'text' },
        { key: 'numberFontFilename', label: '数字字体文件名', kind: 'text' },
        { key: 'fallbackFonts', label: '后备字体', kind: 'text' },
        { key: 'fontSize', label: '字体大小', kind: 'number' },
        { key: 'windowOpacity', label: '窗口不透明度', kind: 'number', min: 0, max: 255 },
      ]
      if (adv.screenScale != null) rows.push({ key: 'screenScale', label: '画面缩放', kind: 'number' })
      if (adv.picturesUpperLimit != null) {
        rows.push({ key: 'picturesUpperLimit', label: '图片上限', kind: 'number' })
      }
      return rows
    },
  },
  mounted() {
    this.ensureMotions()
  },
  methods: {
    ensureMotions() {
      const types = typeList('weaponTypes')
      const need = Math.max(1, (types.length || 1) - 1)
      while (this.data.attackMotions.length < need) {
        this.data.attackMotions.push({ type: 0, weaponImageId: 0 })
      }
    },
    motionTypeLabel(index) {
      const types = typeList('weaponTypes')
      return types[index + 1] || (index === 0 ? '空手' : `类型${index}`)
    },
    skillTypeName(id) {
      const o = this.skillTypeOptions.find((x) => x.value === id)
      return (o && o.label) || String(id)
    },
    onMagicCtx({ event }) {
      this.menu = { visible: true, x: event.clientX, y: event.clientY }
    },
    onMagicActivate(i) {
      if (i < 0 || !(this.data.magicSkills || []).length) this.addMagic()
      else this.editMagic(i)
    },
    addMagic() {
      this.magicPickMode = 'add'
      this.magicPickId = (this.skillTypeOptions[0] && this.skillTypeOptions[0].value) || 1
      this.magicPickVisible = true
    },
    editMagic(i) {
      if (i < 0 || i >= (this.data.magicSkills || []).length) return
      this.magicPickMode = 'edit'
      this.magicPickIndex = i
      this.magicPickId = this.data.magicSkills[i] || 1
      this.magicPickVisible = true
    },
    confirmMagicPick() {
      if (this.magicPickMode === 'edit' && this.magicPickIndex >= 0) {
        this.data.magicSkills.splice(this.magicPickIndex, 1, this.magicPickId)
        this.magicFocus = this.magicPickIndex
      } else {
        this.data.magicSkills.push(this.magicPickId)
        this.magicFocus = this.data.magicSkills.length - 1
      }
      this.magicPickVisible = false
    },
    removeMagic(i) {
      if (i < 0 || i >= (this.data.magicSkills || []).length) return
      this.data.magicSkills.splice(i, 1)
      this.magicFocus = Math.min(i, Math.max(0, this.data.magicSkills.length - 1))
    },
    canMagicMove(dir) {
      const j = this.magicFocus + dir
      return this.magicFocus >= 0 && j >= 0 && j < (this.data.magicSkills || []).length
    },
    moveMagic(dir) {
      if (!this.canMagicMove(dir)) return
      const i = this.magicFocus
      const j = i + dir
      const arr = this.data.magicSkills
      const [x] = arr.splice(i, 1)
      arr.splice(j, 0, x)
      this.magicFocus = j
    },
  },
}
</script>

<style scoped>
.s2 {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 10px;
  align-items: start;
  height: 100%;
  min-height: 0;
}
.s2-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.s2-left :deep(.el-checkbox),
.s2 :deep(.el-radio) {
  display: flex;
  margin-right: 8px;
}
.magic-head {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 0 4px;
}
.s2-left :deep(.focus-list) {
  min-height: 64px;
  max-height: 140px;
}
.motion-table,
.adv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.motion-table th,
.motion-table td,
.adv-table th,
.adv-table td {
  border-bottom: 1px solid var(--app-border, #eee);
  padding: 4px 6px;
  text-align: left;
}
.motion-table th,
.adv-table th {
  background: #f0f2f5;
  font-weight: 600;
}
.motion-table tbody tr:nth-child(even),
.adv-table tbody tr:nth-child(even) {
  background: #f7f8fa;
}
.col-type {
  width: 72px;
}
.col-motion {
  width: 110px;
}
.col-img {
  min-width: 110px;
}
.s2-adv {
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.adv-name {
  width: 42%;
}
.adv-val {
  width: 58%;
}
.adv-input {
  width: 100%;
}
</style>
