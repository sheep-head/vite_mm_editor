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
      <db-group-box title="[侧视]攻击动作">
        <el-table :data="data.attackMotions" size="small" max-height="220">
          <el-table-column label="类型" width="90">
            <template #default="{ $index }">{{ motionTypeLabel($index) }}</template>
          </el-table-column>
          <el-table-column label="动作" width="110">
            <template #default="{ row }">
              <el-select v-model="row.type" size="small">
                <el-option v-for="o in motionOptions" :key="o.value" :value="o.value" :label="o.label" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="图像" min-width="110">
            <template #default="{ row }">
              <el-select v-model="row.weaponImageId" size="small">
                <el-option v-for="o in weaponImages" :key="o.value" :value="o.value" :label="o.label" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </db-group-box>
    </div>
    <db-group-box title="[侧视]魔法技能" class="s2-magic">
      <ul>
        <li v-for="(id, i) in data.magicSkills" :key="i">
          <el-select v-model="data.magicSkills[i]" size="small" style="width: 160px">
            <el-option v-for="o in skillTypeOptions" :key="o.value" :value="o.value" :label="o.label" />
          </el-select>
          <el-button link type="danger" @click="data.magicSkills.splice(i, 1)">删除</el-button>
        </li>
      </ul>
      <el-button size="small" @click="data.magicSkills.push(1)">添加</el-button>
    </db-group-box>
    <db-group-box title="进阶设置" class="s2-adv">
      <el-form label-width="120px" size="small">
        <el-form-item label="游戏编码">
          <el-input-number v-model="data.advanced.gameId" :controls="false" />
        </el-form-item>
        <el-form-item label="画面宽度">
          <el-input-number v-model="data.advanced.screenWidth" :controls="false" />
        </el-form-item>
        <el-form-item label="画面高度">
          <el-input-number v-model="data.advanced.screenHeight" :controls="false" />
        </el-form-item>
        <el-form-item label="界面区域宽度">
          <el-input-number v-model="data.advanced.uiAreaWidth" :controls="false" />
        </el-form-item>
        <el-form-item label="界面区域高度">
          <el-input-number v-model="data.advanced.uiAreaHeight" :controls="false" />
        </el-form-item>
        <el-form-item label="主字体文件名">
          <el-input v-model="data.advanced.mainFontFilename" />
        </el-form-item>
        <el-form-item label="数字字体文件名">
          <el-input v-model="data.advanced.numberFontFilename" />
        </el-form-item>
        <el-form-item label="后备字体">
          <el-input v-model="data.advanced.fallbackFonts" />
        </el-form-item>
        <el-form-item label="字体大小">
          <el-input-number v-model="data.advanced.fontSize" :controls="false" />
        </el-form-item>
        <el-form-item label="窗口不透明度">
          <el-input-number v-model="data.advanced.windowOpacity" :min="0" :max="255" :controls="false" />
        </el-form-item>
      </el-form>
    </db-group-box>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
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
  components: { DbGroupBox },
  props: { data: { type: Object, required: true } },
  data() {
    return {
      menuLabels: MENU,
      itemLabels: ITEMS,
      motionOptions: MOTIONS,
    }
  },
  computed: {
    skillTypeOptions() {
      return typeOptions(typeList('skillTypes'), { includeNone: false })
    },
    weaponImages() {
      return WEAPON_IMAGES.map((label, value) => ({ value, label }))
    },
  },
  methods: {
    motionTypeLabel(index) {
      const types = typeList('weaponTypes')
      return types[index + 1] || (index === 0 ? '空手' : `类型${index}`)
    },
  },
}
</script>

<style scoped>
.s2 {
  display: grid;
  grid-template-columns: 1.3fr 0.8fr 1fr;
  gap: 8px;
  align-items: start;
}
.s2-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.s2-left :deep(.el-checkbox),
.s2 :deep(.el-radio) {
  display: flex;
  margin-right: 8px;
}
ul {
  list-style: none;
  margin: 0 0 6px;
  padding: 0;
}
li {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
</style>
