<template>
  <el-dialog
    :model-value="modelValue"
    title="商店处理"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="shop-wrap">
      <div class="shop-head">
        <span class="col-name">商品</span>
        <span class="col-price">价格</span>
      </div>
      <focus-list
        ref="shopList"
        v-model="focusIndex"
        :items="displayRows"
        list-class="shop-list"
        :row-class="(row) => ({ empty: row.empty })"
        :striped="true"
        @activate="onActivate"
        @remove="removeAt"
        @insert="openNew"
        @contextmenu="onShopCtx">
        <template #default="{ item }">
          <div class="shop-row-inner">
            <span class="col-name">{{ item.name }}</span>
            <span class="col-price">{{ item.price }}</span>
          </div>
        </template>
      </focus-list>
    </div>
    <div class="shop-footer">
      <el-checkbox v-model="purchaseOnly">只能购买</el-checkbox>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>

    <popup-context-menu
      :visible="menu.visible"
      :x="menu.x"
      :y="menu.y"
      @update:visible="(v) => (menu.visible = v)">
      <template #default="{ action }">
        <li :class="{ disabled: !canEdit }" @click="action(() => openEdit(focusIndex))">编辑</li>
        <li @click="action(() => openNew())">新建</li>
        <li :class="{ disabled: !canDelete }" @click="action(() => removeAt(focusIndex))">删除</li>
        <li class="sep" />
        <li :class="{ disabled: !canMove(-1) }" @click="action(() => moveAt(focusIndex, -1))">上移</li>
        <li :class="{ disabled: !canMove(1) }" @click="action(() => moveAt(focusIndex, 1))">下移</li>
      </template>
    </popup-context-menu>

    <cmd302-shop-goods v-model="goodsVisible" :goods="editingGoods" @confirm="onGoodsConfirm" />
  </el-dialog>
</template>

<script>
import { formatRecordName, loadDataArray } from '@/components/database/shared/systemLookups'
import FocusList from '@/components/shared/FocusList.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'
import Cmd302ShopGoods from './Cmd302ShopGoods.vue'

const FILE_BY_TYPE = ['Items', 'Weapons', 'Armors']

function emptyGoods() {
  return { type: 0, id: 1, priceType: 0, price: 0 }
}

export default {
  name: 'Cmd302Shop',
  components: { Cmd302ShopGoods, FocusList, PopupContextMenu },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      purchaseOnly: false,
      goods: [emptyGoods()],
      editOnly: false,
      focusIndex: 0,
      goodsVisible: false,
      editingIndex: -1,
      editingGoods: emptyGoods(),
      menu: { visible: false, x: 0, y: 0 },
    }
  },
  computed: {
    displayRows() {
      const rows = this.goods.map((g) => ({
        empty: false,
        name: this.goodsName(g),
        price: this.goodsPrice(g),
      }))
      rows.push({ empty: true, name: '', price: '' })
      return rows
    },
    canEdit() {
      return this.focusIndex >= 0 && this.focusIndex < this.goods.length
    },
    canDelete() {
      return this.canEdit && this.goods.length > 0
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.menu.visible = false
        const c = this.command
        const p = (c && c.parameters) || []
        if (c && c.code === 302 && p.length >= 4 && typeof p[0] === 'number') {
          this.goods = [{ type: p[0] || 0, id: p[1] || 1, priceType: p[2] || 0, price: p[3] || 0 }]
          this.purchaseOnly = !!p[4]
          this.editOnly = true
        } else if (Array.isArray(p[0])) {
          this.goods = [emptyGoods()]
          this.purchaseOnly = !!p[1]
          this.editOnly = false
        } else {
          this.goods = [emptyGoods()]
          this.purchaseOnly = false
          this.editOnly = false
        }
        if (Array.isArray(c && c._extraGoods)) {
          this.goods = this.goods.concat(
            c._extraGoods.map((g) => ({
              type: g.type || 0,
              id: g.id || 1,
              priceType: g.priceType || 0,
              price: g.price || 0,
            })),
          )
        }
        this.focusIndex = 0
        this.$nextTick(() => this.$refs.shopList && this.$refs.shopList.focus())
      },
    },
  },
  methods: {
    goodsName(g) {
      const file = FILE_BY_TYPE[g.type] || 'Items'
      return formatRecordName(file, g.id || 1)
    },
    goodsPrice(g) {
      if (g.priceType === 1) return String(g.price ?? 0)
      const file = FILE_BY_TYPE[g.type] || 'Items'
      const list = loadDataArray(file)
      const rec = list[g.id]
      if (rec && rec.price != null) return String(rec.price)
      return '标准'
    },
    canMove(dir) {
      if (!this.canEdit) return false
      const j = this.focusIndex + dir
      return j >= 0 && j < this.goods.length
    },
    onShopCtx({ event }) {
      if (this.goodsVisible) return
      this.menu = { visible: true, x: event.clientX, y: event.clientY }
    },
    onActivate(i) {
      if (this.goodsVisible) return
      if (i < 0) return
      if (i >= this.goods.length) this.openNew()
      else this.openEdit(i)
    },
    openEdit(i) {
      if (i < 0 || i >= this.goods.length) return
      this.editingIndex = i
      this.editingGoods = { ...this.goods[i] }
      this.goodsVisible = true
    },
    openNew() {
      this.editingIndex = this.goods.length
      this.editingGoods = emptyGoods()
      this.goodsVisible = true
    },
    onGoodsConfirm(g) {
      const next = {
        type: g.type || 0,
        id: g.id || 1,
        priceType: g.priceType || 0,
        price: g.price || 0,
      }
      if (this.editingIndex >= 0 && this.editingIndex < this.goods.length) {
        this.goods.splice(this.editingIndex, 1, next)
        this.focusIndex = this.editingIndex
      } else {
        this.goods.push(next)
        this.focusIndex = this.goods.length - 1
      }
    },
    removeAt(i) {
      if (i < 0 || i >= this.goods.length) return
      this.goods.splice(i, 1)
      if (!this.goods.length) this.goods.push(emptyGoods())
      this.focusIndex = Math.min(i, this.goods.length - 1)
    },
    moveAt(i, dir) {
      const j = i + dir
      if (i < 0 || i >= this.goods.length || j < 0 || j >= this.goods.length) return
      const [row] = this.goods.splice(i, 1)
      this.goods.splice(j, 0, row)
      this.focusIndex = j
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const list = this.goods.length ? this.goods : [emptyGoods()]
      const first = list[0]
      const cmd302 = {
        code: 302,
        indent,
        parameters: [first.type, first.id, first.priceType, first.price, this.purchaseOnly],
      }
      const commands = [cmd302]
      for (let i = 1; i < list.length; i++) {
        const g = list[i]
        commands.push({
          code: 605,
          indent,
          parameters: [g.type, g.id, g.priceType, g.price],
        })
      }
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.shop-wrap {
  border: 1px solid var(--app-border, #c0c4cc);
}
.shop-head,
.shop-row-inner {
  display: flex;
  align-items: center;
  font-size: 13px;
  min-height: 26px;
}
.shop-head {
  padding: 0 8px;
  background: var(--app-surface, #f5f5f5);
  border-bottom: 1px solid var(--app-border, #ddd);
  font-weight: 600;
}
.shop-list {
  height: 280px;
  border: none !important;
  border-radius: 0;
}
.shop-row-inner {
  width: 100%;
  min-width: 0;
}
.col-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-price {
  width: 100px;
  text-align: right;
  flex-shrink: 0;
}
.shop-footer {
  margin-top: 10px;
}
</style>
