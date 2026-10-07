// ============================================================
// request.js —— 统一请求封装（原生 fetch 版，等价于 axios 拦截器）
// 用法：
//   const res = await request('/order/list', { method: 'GET', params: { page: 1 } })
//   if (res.code === 200) { ... }
// ============================================================
(function () {
    // 后端地址（按你现有登录页的配置）
    const BASE_URL = 'http://192.168.0.3:10001/api';

    // 把 params 拼到 url 上
    function buildUrl(url, params) {
        if (!params) return BASE_URL + url;
        const qs = Object.keys(params)
            .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&');
        return BASE_URL + url + (qs ? (url.indexOf('?') === -1 ? '?' : '&') + qs : '');
    }

    // 统一跳登录
    function redirectToLogin(role) {
        const map = {
            1: '登录-贸易商.html',
            2: '登录-仓储方.html',
            3: '登录-物流方.html',
            5: '登录-平台管理.html'
        };
        const loginPage = map[Number(role)] || '登录-贸易商.html';
        const path = window.location.pathname;
        if (path.endsWith(loginPage)) return; // 防死循环
        window.location.replace(loginPage);
    }

    // 核心请求方法
    async function request(url, options = {}) {
        const {
            method = 'GET',
            params,
            body,
            headers = {},
            // 是否在 401 时自动跳登录，默认 true
            autoRedirect = true
        } = options;

        const finalUrl = buildUrl(url, params);

        const finalHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };

        // === 请求拦截器：自动带 token ===
        const token = localStorage.getItem('token');
        if (token) {
            finalHeaders['Authorization'] = 'Bearer ' + token;
        }

        let res;
        try {
            res = await fetch(finalUrl, {
                method,
                headers: finalHeaders,
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (err) {
            console.error('[request] 网络错误:', err);
            throw err;
        }

        // === 响应拦截器：401 自动跳登录 ===
        let data;
        try {
            data = await res.json();
        } catch (e) {
            data = null;
        }

        // 兼容 HTTP 401 和 body.code === 401 两种
        const is401 = res.status === 401 || (data && Number(data.code) === 401);
        if (is401) {
            localStorage.removeItem('token');
            localStorage.removeItem('current_user');
            if (autoRedirect) {
                const userStr = localStorage.getItem('current_user');
                let role = null;
                try { role = userStr ? JSON.parse(userStr).roleType : null; } catch (e) { }
                // 注意：current_user 已被移除，这里用移除前的 role 也行
                alert('登录已过期，请重新登录');
                redirectToLogin(role);
            }
            throw new Error('UNAUTHORIZED');
        }

        // 直接返回后端 {code, data, message}
        return data;
    }

    // GET / POST 快捷方法
    request.get = (url, params, options = {}) =>
        request(url, { ...options, method: 'GET', params });

    request.post = (url, body, options = {}) =>
        request(url, { ...options, method: 'POST', body });

    request.put = (url, body, options = {}) =>
        request(url, { ...options, method: 'PUT', body });

    request.delete = (url, params, options = {}) =>
        request(url, { ...options, method: 'DELETE', params });

    // 挂到 window
    window.request = request;
})();