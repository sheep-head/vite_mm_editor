<template>
  <div class="div full-height">
    <section class="el-container full-height">
      <editor-side-list
        :items="dataList"
        :current-id="currentItem.id"
        label-key="name"
        @select="selectItem"
        @add="$addItem"
        @clear="$clearItem"
        @delete="$deleteItem"
        @copy="$onCopy"
        @paste="$onPaste" />
      <main class="el-main" v-if="currentItem.id">
        <el-form ref="loginForm" class="login-form fixed-width" label-width="70px" :model="currentItem">
          <el-row >
            <el-col :span="4">
              <el-form-item label="绑定角色" prop="description">
                <el-select v-model="currentItem.actorId" clearable filterable placeholder="请选择">
                  <template v-for="item in actors" :key="item && item.id">
                    <el-option v-if="item" :label="item.id + ':' + item.name" :value="item.id"></el-option>
                  </template>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="战车名" prop="name">
                <el-input v-model="currentItem.name" clearable class="place-name-input" :style="{color:currentItem.c || 'black'}"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="2">
              <el-form-item label="" label-width="0" prop="c">
                <el-color-picker v-model="currentItem.c"></el-color-picker>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="4">
              <el-form-item label="初始x轴" prop="x">
                <el-input-number v-model="currentItem.x"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="初始y轴" prop="y">
                <el-input-number v-model="currentItem.y"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="初始方向" prop="d">
                <el-select v-model="currentItem.d" placeholder="请选择">
                  <el-option label="下" :value="2"></el-option>
                  <el-option label="左" :value="4"></el-option>
                  <el-option label="右" :value="6"></el-option>
                  <el-option label="上" :value="8"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="初始地图" prop="description">
                <el-select @change="mapChanged" v-model="currentItem.mapId" clearable filterable placeholder="请选择">
                  <template v-for="item in mapInfos" :key="item && item.id">
                    <el-option v-if="item" :label="item.id + ':' + item.name" :value="item.id"></el-option>
                  </template>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="4">
              <el-form-item label="回收x轴" prop="x">
                <el-input-number v-model="currentItem.rx"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="回收y轴" prop="y">
                <el-input-number v-model="currentItem.ry"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="回收方向" prop="d">
                <el-select v-model="currentItem.rd" placeholder="请选择">
                  <el-option label="下" :value="2"></el-option>
                  <el-option label="左" :value="4"></el-option>
                  <el-option label="右" :value="6"></el-option>
                  <el-option label="上" :value="8"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="回收地图" prop="rMapId">
                <el-select v-model="currentItem.rMapId" clearable filterable placeholder="请选择">
                  <template v-for="item in mapInfos" :key="item && item.id">
                    <el-option v-if="item" :label="item.id + ':' + item.name" :value="item.id"></el-option>
                  </template>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="4">
              <el-form-item label="默认荷台" prop="defaultBagSize">
                <el-input-number v-model="currentItem.defaultBagSize"  controls-position="right" :min="1" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="最大荷台" prop="maxBagSize">
                <el-input-number v-model="currentItem.maxBagSize"  controls-position="right" :min="currentItem.defaultBagSize || 1" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="默认弹仓" prop="defaultBagSize">
                <el-input-number v-model="currentItem.defaultShellSize"  controls-position="right" :min="1" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="最大弹仓" prop="maxBagSize">
                <el-input-number v-model="currentItem.maxShellSize"  controls-position="right" :min="currentItem.defaultBagSize || 1" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12">
              <el-form-item label="装备槽" prop="slot">
                <el-dropdown>
                  <el-button>
                    添加装备槽<yt-icon name="el-icon-arrow-down" class="el-icon--right"></yt-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="addSlot(0)">空</el-dropdown-item>
                      <el-dropdown-item @click="addSlot(1)">主炮</el-dropdown-item>
                      <el-dropdown-item @click="addSlot(2)">副炮</el-dropdown-item>
                      <el-dropdown-item @click="addSlot(3)">S-E</el-dropdown-item>
                      <el-dropdown-item @click="addSlot(4)">C装置</el-dropdown-item>
                      <el-dropdown-item @click="addSlot(5)">引擎</el-dropdown-item>
                      <el-dropdown-item @click="addSlot(6)">底盘</el-dropdown-item>
                      <el-dropdown-item @click="addSlot(7)">装饰品</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <Drag v-model="currentItem.slot" :dict-map="slotTypeList"></Drag>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label-width="0">
<!--                <Drag v-model="currentItem.slot" :dict-map="slotTypeList"></Drag>-->
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12">
              <el-form-item label="类型" prop="slot">
                <el-select v-model="currentItem.type" class="full-width" multiple clearable filterable placeholder="请选择">
                  <el-option label="履带式" :value="0"></el-option>
                  <el-option label="摩托" :value="1"></el-option>
                  <el-option label="轮式" :value="2"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12">
              <el-form-item label="备注" prop="description">
                <el-input v-model="currentItem.description" placeholder="没有实际作用" prop="description"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="4">
              <el-form-item label="" >
                <el-button @click="dialogVisible = true">展示！</el-button>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="" >

              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </main>
    </section>
    <el-dialog
        title="选择图片"
        v-model="dialogVisible"
        append-to-body
        width="50%">
      <div class="el-dialog-div">
        <section class="el-container full-height">
          <div style="width: 60%;overflow-y: auto">
            <el-tree
                ref="tree"
                :props="props"
                :load="loadNode"
                @node-click="handleNodeClick"
                lazy>
            </el-tree>
          </div>
          <main class="el-main" style="overflow-y: auto">
            <img v-if="imageSrc" style="max-width: 100%;" :src="imageSrc" alt="">
            <span v-else style="color: var(--app-text); opacity: 0.6;">点击左侧文件预览图片</span>
          </main>
        </section>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDialog">取 消</el-button>
          <el-button type="primary" @click="closeDialog">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'
import { useEditorData } from '@/composables/useEditorData'
import Drag from '@/components/Draggable.vue'
import EditorSideList from '@/components/shared/EditorSideList.vue'

const tankStore = useEditorData({ fileName: 'TankData' })

export default {
  name: 'TankData',
  components: {
    Drag,
    EditorSideList,
  },
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
      meta:{
        dataType: 'tank',
      },
      props: {
        label: 'name',
        children: 'zones',
        isLeaf: 'leaf'
      },
      dialogVisible:false,
      defaultSlot:[0],
      slotTypeList:{
        0:"空",
        1:"主炮",
        2:"副炮",
        3:"S-E",
        4:"C装置",
        5:"引擎",
        6:"底盘",
        7:"装饰品",
      },
      imagePath:'',
      imageSrc:'',
    };
  },
  computed:{
    ...mapState(['mapInfos','actors']),
  },
  methods:{
    loadNode(node, resolve) {
      if (node.level === 0) {
        resolve(this.$getRootDirFilesSync());
      } else {
        resolve(this.$getDirFilesSync(node.data.relativePath));
      }
    },
    handleNodeClick(data){
      if (data.type !== 'file') {
        return;
      }
      this.imagePath = data.relativePath;
      this.imageSrc = '';
      try {
        const abs = data.path || this.$getPath(data.relativePath);
        if (!this.$fs || !this.$fs.existsSync(abs)) {
          return;
        }
        const normalized = String(abs).replace(/\\/g, '/');
        this.imageSrc = /^[A-Za-z]:/.test(normalized)
          ? `file:///${normalized}`
          : `file://${normalized}`;
      } catch (e) {
        console.log(e);
        this.$message.error('图片读取失败');
      }
    },
    closeDialog() {
      this.dialogVisible = false;
      this.imageSrc = '';
    },
    selectItem(item){
      this.watcher && this.watcher();
      if(item){
        this.currentItem = item;
        if(this.currentItem){
          this.watcher = this.$watch("currentItem",{
            handler(newVal,oldVal){
              this.changed = true;
            },
            deep:true
          });
        }
      }
    },
    addSlot(type){
      this.currentItem.slot.push(type);
    },
    $onSave(){
      console.log("save");
      if(this.changed){
        if(tankStore.save(this.dataList)){
          this.$message.success("保存成功");
          this.changed = false;
        }else {
          this.$message.error("保存失败");
        }
      }
    },
    $addItem(){
      this.dataList.push({
        id:this.dataList.length + 1,
        get:false,
        s:15,
        x:0,
        y:0,
        slot:this.defaultSlot,
      })
    },
    mapChanged(mapId){
      if(!this.currentItem.name){
        this.currentItem.name = this.getMapName(mapId);
      }
    },
    handleClick(){
      // this.$router.push("/hash2");
    },
    getMapName(id){
      console.log(id);
      let map = this.mapInfos.find(item=>item && item.id === id);
      return map ? map.name : "";
    },
  },
  created(){
    window.tankData = this;
    this.$openLoading();
    let contents = tankStore.load();
    if(contents == null){
      this.dataList = [];
      this.$closeLoading();
      this.$addItem();
      return this.$message.error("文件不存在，此次作为新增处理");
    }
    this.dataList = Array.isArray(contents) ? contents : [];
    this.$nextTick(()=>{
      if (this.dataList.length) {
        this.selectItem(this.dataList[0]);
      }
      this.$closeLoading();
    });
  },
}
</script>
<style>
.place-name-input input{
  color: inherit!important;
}
.full-width.el-select{
  width:100%;
}
.el-dialog-div{
  height: 60vh;
  /*overflow: auto;*/
}
</style>
