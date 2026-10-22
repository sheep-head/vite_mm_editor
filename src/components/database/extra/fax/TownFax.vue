<template>
  <div class="div full-height">
    <section class="el-container full-height">
      <editor-side-list
        :items="dataList"
        :current-id="currentItem.id"
        label-key="n"
        @select="selectItem"
        @add="$addItem"
        @clear="$clearItem"
        @delete="$deleteItem"
        @copy="$onCopy"
        @paste="$onPaste" />
      <main class="el-main" v-if="currentItem.id">
        <el-form ref="loginForm" class="login-form fixed-width" label-width="70px" :model="currentItem">
          <el-row >
            <el-col :span="10">
              <el-form-item label="目的地名" prop="n">
                <el-input v-model="currentItem.n" clearable class="place-name-input" :style="{color:currentItem.c || 'black'}"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="" label-width="0" prop="c">
                <el-color-picker v-model="currentItem.c"></el-color-picker>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="10">
              <el-form-item label="说明" prop="name">
                <el-input v-model="currentItem.d" type="textarea"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="10">
              <el-form-item label="字号" prop="s">
                <el-input v-model="currentItem.s"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="4">
              <el-form-item label="x轴" prop="x">
                <el-input-number v-model="currentItem.x"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="y轴" prop="y">
                <el-input-number v-model="currentItem.y"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="4">
              <el-form-item label="地图x轴" prop="miniX">
                <el-input-number v-model="currentItem.miniX"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="地图y轴" prop="miniY">
                <el-input-number v-model="currentItem.miniY"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <!--          <el-row >
                      <el-col :span="8">
                        <el-form-item label="方向" prop="d">
                          <el-select v-model="currentItem.d" placeholder="请选择">
                            <el-option label="下" :value="2"></el-option>
                            <el-option label="左" :value="4"></el-option>
                            <el-option label="右" :value="6"></el-option>
                            <el-option label="上" :value="8"></el-option>
                          </el-select>
                        </el-form-item>
                      </el-col>
                    </el-row>-->
          <el-row>
            <el-col :span="10">
              <el-form-item label="地图" prop="description">
                <el-select @change="mapChanged" v-model="currentItem.mapId" clearable filterable placeholder="请选择">
                  <template v-for="item in mapInfos" :key="item && item.id">
                    <el-option v-if="item" :label="item.id + ':' + item.name" :value="item.id"></el-option>
                  </template>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="10">
              <el-form-item label="备注" prop="description">
                <el-input v-model="currentItem.description" placeholder="没有实际作用" prop="description"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </main>
    </section>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'
import EditorSideList from '@/components/shared/EditorSideList.vue'

export default {
  name: 'TownFax',
  components: { EditorSideList },
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
    };
  },
  computed:{
    ...mapState(['mapInfos']),
  },
  methods:{
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
    $onSave(){
      console.log("save");
      if(this.changed){
        if(this.$saveDataSync("TownFax",this.dataList)){
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
        s:15,
        x:0,
        y:0,
      })
    },
    mapChanged(mapId){
      if(!this.currentItem.n){
        this.currentItem.n = this.getMapName(mapId);
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
    window.townFax = this;
    this.$openLoading();
    let contents = this.$loadExtraDataSync("TownFax");
    if(contents == null){
      this.$closeLoading();
      this.$addItem();
      return this.$message.error("文件不存在，此次作为新增处理");
    }
    this.dataList = contents;
    this.$nextTick(()=>{
      this.selectItem(this.dataList[0]);
      this.$closeLoading();
    });
  },
}
</script>
<style>
.place-name-input input{
  color: inherit!important;
}
</style>
