import axios from 'axios'
import Qs from 'qs'

let TOKEN_KEY = "Authorization";

export { TOKEN_KEY }

function toUrlParams(json) {
    return Object.keys(json).map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(json[key]);
    }).join("&");
}

axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'
const service = axios.create({
    baseURL: "http://localhost/newItower",
    // baseURL: "http://120.52.136.2:10269/newItower/",
    timeout: 30000 // 请求超时时间
})
const request = service;

service.interceptors.request.use(
    config => {
        let token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers[TOKEN_KEY] = token;
        }
        if (config.data) {
            config.data = toUrlParams(config.data);
        }
        // config.headers["Content-Type"] = 'application/x-www-form-urlencoded';
        // config.headers = getHeader(url, code) // 让每个请求携带自定义签名
        return config
    }, error => {
        console.log(error)
        Promise.reject(error)
    }
);
window.request = service;
// 响应拦截器
service.interceptors.response.use(res => {
    // 未设置状态码则默认成功状态
    const code = res.data.code || 200;
    // 获取错误信息
    const msg = res.data.msg
    return res.data
}, error => {
    console.log('err' + error)
    return Promise.reject(error)
});

service.req = function (options) {
    let params = {};
    if (options.params && options.params.length > 0) {
        options.params.forEach((item) => {
            params[item.key] = item.value;
        })
    }
    if (options.method === "get") {
        return request.get(options.url, { params });
    } else if (options.method === "post") {
        return request.post(options.url, params);
    }
}
service.logged = function () {
    return !!localStorage.getItem(TOKEN_KEY);
}
service.login = function (data) {
    return request.get("user/login.do", { params: data });
}
service.getUserInfo = function () {
    return request.get("user/getUserInfo.do");
}
// 分页获取附件
service.getEnterStationAttachList = function () {
    return request.get("enterStationAttachBean/list.do");
}
// 分页获取钥匙数据
service.getEnterStationKeyBeanList = function (params) {
    return request.get("enterStationKeyBean/list.do", { params });
}

service.getDictByCodes = function (codes) {
    return request.get("dict/getByDictCodes.do",
        {
            params: { codes },
            paramsSerializer(params) {
                return Qs.stringify(params, { indices: false })
            }
        });
}
/**
 request.getDictByCodes2({
    codes:["IDD_TEST_SITE","IDD_TEST_SITE"]
}).then(res=>{
    console.log(res)
})
 */



// 测试请求web端
service.testRequestWeb = function (params) {
    return request.get("enterStationBill/testRequest.do", { params });
}

export default service
export { service, request }
