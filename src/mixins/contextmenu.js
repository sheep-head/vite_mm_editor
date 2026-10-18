import ShortcutManager from '@/utils/ShortcutManager'
import { optionsFromMeta, useEditorData } from '@/composables/useEditorData'

/**
 * 列表页的公共逻辑（搜索、右键菜单、复制粘贴、上下切换）
 * 对应原项目 js/vueComponent.js 里的 CONTEXTMENU_SLOT
 * 存读已委托 useEditorData；$loadSelfData / $saveSelfDataSync 仍兼容旧 meta.exportOptions
 */
export const CONTEXTMENU_SLOT = {
  data() {
    return {
      meta: {
        dataType: 'unknown',
        searchFlag: false,
        searchWord: '',
        fileName: '',
      },
      menu: {
        left: 0,
        top: 0,
        visible: false
      },
      currentItem: {},
      dataList: [],
      watcher: null,
      changed: false,
    }
  },
  methods: {
    openMenu(e) {
      this.menu.visible = true
      this.menu.left = 0
      this.menu.top = 0
      this.$nextTick(() => {
        const el = this.$el && this.$el.querySelector('.contextmenu')
        if (!el) return
        const h = el.offsetHeight || 0
        const w = el.offsetWidth || 0
        const parent = el.offsetParent || this.$el
        const prect = parent.getBoundingClientRect()
        const pad = 4
        let top = e.clientY - prect.top
        let left = e.clientX - prect.left
        if (e.clientY + h > window.innerHeight - pad) top = e.clientY - h - prect.top
        if (e.clientX + w > window.innerWidth - pad) left = e.clientX - w - prect.left
        if (top < 0) top = 0
        if (left < 0) left = 0
        this.menu.top = top
        this.menu.left = left
      })
    },
    closeMenu() {
      this.menu.visible = false;
    },
    handleScroll() {
      this.closeMenu()
    },
    /** 按当前 meta 拿到存读器（兼容旧 exportOptions；同页复用同一实例） */
    $getEditorData() {
      const opts = optionsFromMeta(this.meta)
      if (!opts.fileName) return null
      const key = `${opts.fileName}::${opts.mergeField || ''}::${opts.preferRecordMap ? 1 : 0}`
      if (!this.__editorData || this.__editorDataKey !== key) {
        this.__editorDataKey = key
        this.__editorData = useEditorData(opts)
      }
      return this.__editorData
    },
    $loadSelfData() {
      const store = this.$getEditorData()
      if (!store) return null
      return store.load()
    },
    $saveSelfDataSync(data) {
      data = data || this.dataList;
      const store = this.$getEditorData()
      if (!store) return false
      return store.save(data)
    },
    $clearItem() {
      if (this.currentItem) {
        const index = this.dataList.indexOf(this.currentItem);
        if (index > -1) {
          this.dataList[index] = { id: this.currentItem.id };
          this.selectItem(this.dataList[index]);
        } else {
          this.dataList[this.currentItem.id] = { id: this.currentItem.id };
          this.selectItem(this.dataList[this.currentItem.id]);
        }
      }
    },
    $deleteItem() {
      if (this.currentItem) {
        const index = this.dataList.indexOf(this.currentItem);
        if (index > -1) {
          this.dataList.splice(index, 1);
          let nextIndex = this.dataList[index] && this.dataList[index].id > 0 ? index : index - 1;
          this.selectItem(this.dataList[nextIndex]);
        }
      }
    },
    $onSave() {
    },
    $onDelete() {
    },
    $onCopy() {
      this.$clipboard.set(JSON.stringify({ dataType: this.meta.dataType, data: this.currentItem }));
      this.$message.success('复制成功');
    },
    $onPaste() {
      try {
        const text = this.$clipboard.get();
        if (text && this.currentItem.id > 0) {
          const item = JSON.parse(text);
          if (item.dataType === this.meta.dataType) {
            if (item.data.id > 0) {
              const index = this.dataList.indexOf(this.currentItem);
              if (index > -1) {
                item.data.id = this.currentItem.id;
                this.dataList[index] = item.data;
                this.selectItem(this.dataList[index]);
                this.$message.success('粘贴成功');
              }
            }
          } else {
            this.$message.error('粘贴失败,粘贴内容与当前内容类型不匹配');
          }
        }
      } catch (e) {
        console.log(e);
        this.$message.error('粘贴失败,无法解析粘贴内容');
      }
    },
    $prevItem() {
      if (this.currentItem) {
        const index = this.dataList.indexOf(this.currentItem);
        if (index > 0) {
          this.selectItem(this.dataList[index - 1]);
        }
      }
    },
    $nextItem() {
      if (this.currentItem) {
        const index = this.dataList.indexOf(this.currentItem);
        if (index < this.dataList.length - 1) {
          this.selectItem(this.dataList[index + 1]);
        }
      }
    },
    $onSearch() {
      this.meta.searchFlag = true;
      this.$nextTick(() => {
        if (this.visibleDataList.length > 0) {
          this.selectItem(this.visibleDataList[0]);
        } else {
          this.selectItem({});
        }
      })
    },
    $onClearSearch() {
      this.meta.searchFlag = false;
      this.selectItem(this.visibleDataList[1]);
    },
  },
  beforeCreate() {
    ShortcutManager.install(this);
  },
  beforeUnmount() {
    ShortcutManager.uninstall(this);
  },
  computed: {
    visibleDataList() {
      if (this.meta.searchFlag) {
        return this.dataList.filter(item => {
          return item && item.name.indexOf(this.meta.searchWord) > -1
        })
      } else {
        return this.dataList
      }
    }
  },
  watch: {
    "menu.visible"(value) {
      if (value) {
        document.body.addEventListener('click', this.closeMenu)
      } else {
        document.body.removeEventListener('click', this.closeMenu)
      }
    }
  },
}

export default CONTEXTMENU_SLOT
