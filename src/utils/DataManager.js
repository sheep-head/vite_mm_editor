import { fs as nwFs, path as nwPath, config as nwConfig, net as nwNet } from './nw'
import { ElMessageBox } from 'element-plus'

class DataManager {

    static $fs = nwFs;
    static $path = nwPath;
    static $config = nwConfig;
    static $cache = {};
    static $watchers = [];

    static mapInfos;

    static init() {
        this.mapInfos = this.$loadDataSync("MapInfos");
    }

    static $getPath() {
        if (!this.$path || !this.$config || !this.$config.workSpace) {
            throw new Error('尚未选择工作空间');
        }
        return this.$path.resolve.apply(this, [this.$config.workSpace, ...arguments]);
    }

    static $loadDataSync(fileName, cache = false, tip = true) {
        if (!this.$fs || !this.$path || !this.$config) {
            // 非 NW.js 环境（例如浏览器里跑 vite dev），读不到本地文件
            if (tip) {
                ElMessageBox.alert("当前不是 NW.js 运行环境，无法读取本地数据文件");
            }
            return null;
        }
        if (!this.$config.workSpace) {
            if (tip) {
                ElMessageBox.alert("尚未选择工作空间，请先选择游戏工程目录");
            }
            return null;
        }
        const filePath = this.$getPath("data", `${fileName}.json`);
        if (!this.$fs.existsSync(filePath)) {
            if (tip) {
                ElMessageBox.alert(`${filePath} 文件不存在，请确认工作空间是否正确`);
            }
            return null;
        }
        if (cache) {
            if (this.$cache[fileName]) {
                return this.$cache[fileName];
            }
            this.$cache[filePath] = JSON.parse(this.$fs.readFileSync(filePath));
            return this.$cache[filePath];
        }
        return JSON.parse(this.$fs.readFileSync(filePath));
    }

    static $saveDataSync(fileName, data) {
        if (!this.$fs || !this.$path || !this.$config || !this.$config.workSpace) {
            return false;
        }
        try {
            const filePath = this.$getPath("data", `${fileName}.json`);
            this.$fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    static clearCache() {
        this.$cache = {};
        this.mapInfos = null;
    }


    static watchData(fileName, callback) {
        const filePath = this.$getPath("data", `${fileName}.json`);
        if (!this.$fs.existsSync(filePath)) {
            return null;
        }
        this.$watchers.push(this.$fs.watch(filePath, callback));
    }

}

const net = nwNet;

const tryUsePort = async function (port, portAvailableCallback) {
    function portUsed(port) {
        return new Promise((resolve, reject) => {
            let server = net.createServer().listen(port);
            server.on('listening', function () {
                server.close();
                resolve(port);
            });
            server.on('error', function (err) {
                if (err.code == 'EADDRINUSE') {
                    resolve(err);
                }
            });
        });
    }

    let res = await portUsed(port);
    if (res instanceof Error) {
        console.log(`端口：${port}被占用\n`);
        port++;
        tryUsePort(port, portAvailableCallback);
    } else {
        portAvailableCallback(port);
    }
}

/*    // 测试
    tryUsePort(8022 ,function(port){
        // do something ...
        console.log(`端口：${port}可用\n`);
    });*/

// 引入http模块，通过文件的方式读取不同文件下的html文件或者是图片，html的设置类型是text/html.字符串的设置类型是text/plain而图片不需要设置utf-8，jpg只需要设置image/jpeg即可
/*    const http  = require('http');
let server = http.createServer();
// 对请求进行处理
server.on('request',(req,res)=>{
    // 默认是-utf-8，但是浏览器不知道，浏览器的gbk
    // 解决方法就是正确告诉 浏览器我给你发送内容的编码
    var url = req.url;
    // console.log("嗨害嗨，来了奥",url);
    if(url[0] === '/'){
        url = url.substr(1);
    }
    const filePath = DataManager.$path.resolve(DataManager.$config.workSpace,url);
    if(!DataManager.$fs.existsSync(filePath)){
        res.setHeader('Content-Type','text/html;charset=utf-8');
        res.end("<h1>404</h1>");
        return;
    }
    DataManager.$fs.readFile(filePath,(err,data)=>{
        if(err){
            res.setHeader('Content-Type','text/plain;charset=utf-8');
            res.end('文件读取失败');
        }else{
            res.setHeader('Content-Type','image/jpeg');
            res.end(data);
        }
    });
});
server.listen(2521,()=>{
    console.log('系统已经开启！！！');
});*/

/*
    const app = require('express')();
    app.get('*', (req, res) => {
        //接收要转发的http地址
        let url = req.url.substr(1);
        console.log(url)
        if(url == "get"){
            res.send(JSON.stringify({qq:761303761}));
        }else{
            res.send(JSON.stringify({}));
        }

    })
    app.listen(3000, () => {
        console.log(`Example app listening at http://localhost:${3000}`)
    })

    var proxy=require("http-proxy").createProxyServer({});

    proxy.on("error",function(err,req,res){
        res.writeHead(500,{"Content-Type":"text/plain"});
    });

    var server=require("http").createServer(function(req,res){
        var host= req.headers.host;
        switch(host){
            case 'ytmm.com':
                proxy.web(req, res, { target: 'http://localhost:3000' });
                break;
            default:
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('Welcome to my server!');
        }
    });
    console.log("listening on port 80")
    server.listen(80);*/

DataManager.clearCache();

export default DataManager
