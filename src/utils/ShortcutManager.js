import shortcut from './shortcut'

class ShortcutManager {

    static vueInstance;

    static init() {
        shortcut.add("Ctrl+S", () => {
            this.save();
        }, { type: 'keydown', propagate: true, target: document });
        shortcut.add("DELETE", () => {
            this.delete();
        }, { type: 'keydown', propagate: true, target: document });
        shortcut.add("Ctrl+C", () => {
            if (this.isListItemFocused()) {
                this.copy();
            }
        }, { type: 'keydown', propagate: true, target: document });
        shortcut.add("Ctrl+V", () => {
            if (this.isListItemFocused()) {
                this.paste();
            }
        }, { type: 'keydown', propagate: true, target: document });
        shortcut.add("up", () => {
            this.pressUp();
        }, { type: 'keydown', propagate: true, target: document });
        shortcut.add("down", () => {
            this.pressDown();
        }, { type: 'keydown', propagate: true, target: document });
    }

    /** 仅列表行获得焦点时才走编辑器整条复制/粘贴 */
    static isListItemFocused() {
        const el = document.activeElement;
        return !!(el && el.closest && el.closest('[data-editor-list-item]'));
    }

    static install(vueInstance) {
        this.vueInstance = vueInstance;
    }

    static uninstall() {
        this.vueInstance = null;
    }

    static save() {
        this.vueInstance && this.vueInstance.$onSave();
    }

    static delete() {
        if (!this.isListItemFocused()) return;
        const vm = this.vueInstance;
        if (vm && typeof vm.$onDelete === 'function') vm.$onDelete();
    }

    static copy() {
        this.vueInstance && this.vueInstance.$onCopy();
    }

    static paste() {
        this.vueInstance && this.vueInstance.$onPaste();
    }

    static pressUp() {
        if (!this.isListItemFocused()) return;
        const vm = this.vueInstance;
        if (vm && typeof vm.$prevItem === 'function') vm.$prevItem();
    }

    static pressDown() {
        if (!this.isListItemFocused()) return;
        const vm = this.vueInstance;
        if (vm && typeof vm.$nextItem === 'function') vm.$nextItem();
    }

}

ShortcutManager.init();

export default ShortcutManager
