import DataManager from '@/utils/DataManager'
import { fs, path, config, clipboard } from '@/utils/nw'

/**
 * 对应原项目 js/vueComponent.js 里挂到 Vue.prototype 上的全局属性和方法
 */

// 非 NW.js 环境（浏览器 vite dev）下给一个空实现，保证调用不报错
const clipboardStub = {
  set() { },
  get() { return '' }
}

export default {
  install(app) {
    const globalProperties = app.config.globalProperties;

    globalProperties.$fs = fs;
    globalProperties.$path = path;
    globalProperties.$config = config;
    globalProperties.$clipboard = clipboard || clipboardStub;

    window.__extend(globalProperties, {
      $openLoading() {
        this.___loading = this.$loading({
          lock: true,
          text: '加载中',
          background: 'rgba(0, 0, 0, 0.8)',
          target: '.el-table, .table-flex, .region',
          fullscreen: false,
          customClass: 'loadingclass'
        })
      },
      $closeLoading() {
        this.___loading && this.___loading.close();
      },
      $getPath() {
        if (!this.$path || !this.$config || !this.$config.workSpace) {
          throw new Error('尚未选择工作空间');
        }
        return this.$path.resolve.apply(this, [this.$config.workSpace, ...arguments]);
      },
      $loadDataSync(fileName, cache = false, tip = true) {
        return DataManager.$loadDataSync(fileName, cache, tip);
      },
      $loadExtraDataSync(fileName) {
        const filePath = this.$getPath("data", `${fileName}.json`);
        if (!this.$fs.existsSync(filePath)) {
          return null;
        }
        return JSON.parse(this.$fs.readFileSync(filePath, 'utf-8'));
      },
      $saveDataSync(fileName, data) {
        try {
          const filePath = this.$getPath("data", `${fileName}.json`);
          this.$fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
          return true;
        } catch (e) {
          console.log(e);
          return false;
        }
      },
      $getRootDirFilesSync() {
        return this.$getDirFilesSync("");
      },
      $getDirFilesSync(filePath = "") {
        const wPath = this.$path.join(this.$config.workSpace, filePath);
        //根据文件路径读取文件，返回文件列表
        const files = this.$fs.readdirSync(wPath);
        const nodes = [];
        //遍历读取到的文件列表
        files.forEach((filename) => {
          let node = {};
          if ([".idea", ".svn"].indexOf(filename) > -1) {
            return;
          }
          node.name = filename;
          node.relativePath = this.$path.join(filePath, filename);
          //获取当前文件的绝对路径
          node.path = this.$path.join(wPath, filename);
          //根据文件路径获取文件信息，返回一个fs.Stats对象
          const stats = this.$fs.statSync(node.path);
          if (stats.isDirectory()) {
            node.type = 'folder';
            node.leaf = false;
          } else {
            node.type = 'file';
            node.leaf = true;
          }
          nodes.push(node);
        });
        return nodes;
      }
    })
  }
}
