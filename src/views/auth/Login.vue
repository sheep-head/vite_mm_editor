<template>
  <div class="div">
    <el-divider >羊头制作的登录dmeo</el-divider>
    <el-form ref="loginForm" class="login-form fixed-width" label-width="52px" :model="loginData" :rules="loginRules" v-if="!logged" align="center">
        <el-row :gutter="20" >
            <el-col align="center">
                <el-form-item label="帐号" prop="userId">
                    <el-input v-model="loginData.userId"></el-input>
                </el-form-item>
            </el-col>
        </el-row>
        <el-row>
            <el-col align="center">
                <el-form-item label="密码" prop="password">
                    <el-input v-model="loginData.password" prop="password"></el-input>
                </el-form-item>
            </el-col>
        </el-row>
        <el-row :gutter="20">
            <el-col align="center">
                <el-button @click="login">登录</el-button>
            </el-col>
        </el-row>
    </el-form>
    <div v-if="logged">
        <el-result icon="success" title="已成功登录" subTitle="请根据提示进行操作">
            <template #extra>
                <el-button @click="logout">登出</el-button>
                <el-button @click="getUserInfo">获取用户信息</el-button>
            </template>
        </el-result>
        <el-divider >简易模拟请求</el-divider>
        <el-form ref="loginForm" class="login-form" label-width="52px" align="center">
            <el-row :gutter="20" align="center" >
                <el-col :span="10">
                    <el-form-item label="url">
                        <el-dropdown :style="{width:'100%'}">
                            <el-input v-model="requestData.url" placeholder="相对路径"></el-input>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item v-for="(item,index) in dropdownList" :key="index" @click.stop="decidedUri(item,index)">
                                        {{item.uri}}&nbsp;<yt-icon name="el-icon-circle-close" class="rm-history" @click.stop="rmHistory(index)"></yt-icon>
                                    </el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>

                    </el-form-item>
                </el-col>
                <el-col :span="4">
                    <el-form-item label="方式">
                        <el-select v-model="requestData.method">
                            <el-option label="post" value="post"></el-option>
                            <el-option label="get" value="get"></el-option>
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>
            <el-row :gutter="20" v-for="(item,index) in requestData.params" :key="index">
                <el-col :span="6">
                    <el-form-item label="键">
                        <el-input v-model="item.key"></el-input>
                    </el-form-item>
                </el-col>
                <el-col :span="6">
                    <el-form-item label="值">
                        <el-input v-model="item.value"></el-input>
                    </el-form-item>
                </el-col>
                <el-col :span="1">
                    <el-form-item label="" label-width="0">
                        <el-popover
                                placement="top-start"
                                width="200"
                                trigger="hover"
                                content="添加一个参数">
                            <template #reference>
                                <el-button @click="addParam">+</el-button>
                            </template>
                        </el-popover>
                    </el-form-item>
                </el-col>
                <el-col :span="1">
                    <el-form-item label="" label-width="0">
                        <el-popover
                                v-if="requestData.params.length > 1"
                                placement="top-start"
                                width="200"
                                trigger="hover"
                                content="删除该参数">
                            <template #reference>
                                <el-button @click="rmParam(index)">-</el-button>
                            </template>
                        </el-popover>
                    </el-form-item>
                </el-col>
            </el-row>
            <el-row :gutter="20">
                <el-col :span="14" align="center">
                    <el-form-item label="结果" >
                        <el-input
                                type="textarea"
                                :rows="2"
                                autosize
                                readonly
                                placeholder="请求的结果将显示在这里"
                                v-model="reqResult">
                        </el-input>
                    </el-form-item>

                </el-col>
            </el-row>
            <el-row :gutter="20">
                <el-col align="center">
                    <el-button @click="testReq">请求</el-button>
                </el-col>
            </el-row>
        </el-form>
    </div>
  </div>
</template>
<script>
import { request, TOKEN_KEY } from '@/api/common'

export default {
  name: 'Login',
  data() {
    return {
      logged:false,
      loginData:{
        userId:null,
        password:null,
      },
      requestData:{
        url:"",
        method:"post",
        params:[
          {key:"",value:""}
        ],
      },
      reqResult:"",
      visible:false,
      token:localStorage.getItem(TOKEN_KEY) || "",
      loginRules: {
        userId: [
          { required: true, trigger: "blur", message: "用户名不能为空" }
        ],
        password: [
          { required: true, trigger: "blur", message: "密码不能为空" }
        ],
      },
      dropdownList:[]
    };
  },
  methods:{
    login(){
      if(this.logged){return}
      this.$refs.loginForm.validate(valid => {
        if (valid) {

          this.$message.success("登录成功！");
          localStorage.setItem(TOKEN_KEY,Math.random().toString());
          this.refreshLoginState();

/*          request.login(this.loginData).then((res) => {
            if(res.data && res.data.token){
              this.$message.success("登录成功！");
              localStorage.setItem(TOKEN_KEY,res.data.token);
              this.refreshLoginState();
            }else{
              this.$message.error(res.msg);
            }
          })*/
        }
      })
    },
    logout(){
      this.$message.success("已登出！");
      localStorage.removeItem(TOKEN_KEY);
      this.refreshLoginState();
    },
    getUserInfo(){
      request.getUserInfo().then((res) => {
        if(res.data){
          this.$message.success("请求获取已登录用户信息成功！即将呈现！");
          setTimeout(_=>{
            this.$message.info(JSON.stringify(res.data));
          },1000)
        }else{
          this.$message.error(res.msg);
        }
      })
    },
    refreshLoginState(){
      this.logged = !!localStorage.getItem(TOKEN_KEY);
    },
    addParam(){
      this.requestData.params.push({key:"",value:""});
    },
    rmParam(index){
      this.requestData.params.splice(index,1);
    },
    testReq(){
      localStorage.setItem("tempReqData",JSON.stringify(this.requestData))
      request.req(this.requestData).then(res=>{
        this.$message.success("请求结束!");
        this.reqResult = JSON.stringify(res);
        this.addHistory(this.requestData.url);
      }).catch(err => {
        console.log(this.$message.error(err))
      })
    },
    decidedUri(item){
      this.requestData.url = item.uri;
    },
    addHistory(uri){
      if(this.dropdownList.indexOf(uri) === -1){
        this.dropdownList.push({uri});
      }
    },
    rmHistory(index){
      this.dropdownList.splice(index,1);
    }
  },
  mounted(){
    this.refreshLoginState();
    let tempReqData = localStorage.getItem("tempReqData");
    if(tempReqData){
      // vue3 中已经没有 $set，直接赋值即可响应
      this.requestData = JSON.parse(tempReqData)
    }
    let dropdownList = localStorage.getItem("dropdownList");
    if(dropdownList){
      this.dropdownList = JSON.parse(dropdownList);
    }
  },
  watch:{
    dropdownList:{
      handler(val){
        localStorage.setItem("dropdownList",JSON.stringify(this.dropdownList))
      },
      deep:true
    }
  },
}
</script>
<style scoped >
  .login-form{
    width: 99.8%;
  }
  .login-form.fixed-width .el-form-item{
    width: 500px!important;
  }
  .rm-history:hover{
    color: red;
  }
</style>
