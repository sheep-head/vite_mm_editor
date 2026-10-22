<template>
  <div class="div full-height">
    <el-divider content-position="left">洞穴地图设定</el-divider>
    <el-form ref="loginForm" class="login-form fixed-width" label-width="70px" :model="currentItem">
      <el-row>
        <el-col :span="24">
          <el-form-item label="地图" prop="description">
            <el-select @change="mapChanged" v-model="currentItem.mapId" multiple clearable filterable placeholder="请选择">
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
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'

export default {
  name: 'Cave',
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
    };
  },
  computed:{
    ...mapState(['mapInfos']),
  },
  methods:{
    mapChanged(mapId){
      if(!this.currentItem.n){
        this.currentItem.n = this.getMapName(mapId);
      }
    },
  },
  created(){
    window.cave = this;
  },
}
</script>
<style>
.place-name-input input{
  color: inherit!important;
}
</style>
