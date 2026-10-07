// ============================================================
// auth-check.js  —— 统一登录态校验
// 用法：在需要登录才能访问的页面 <head> 最前面引入
//   <script src="auth-check.js"></script>
// ============================================================
(function () {
    // ---------- 读取登录态 ----------
    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('current_user') || 'null');
        } catch (e) {
            return null;
        }
    }

    // ---------- 页面 → 允许角色 映射 ----------
    // 1=贸易商  2=仓储方  3=物流方  5=平台管理员
    var ROLE_MAP = {
        '首页.html': [1],
        '仓储方-工作台.html': [2],
        '物流方-工作台.html': [3],
        '物流方-单证中心.html': [3],
        '物流方-存证档案.html': [3],
        '导出税务.html': [1, 2, 3, 5],
        '扫码核验.html': [1, 2, 3],
        '管理界面.html': [5],
        '用户管理.html': [5],
        '权限管理.html': [5],
        '发票赋额.html': [5],
        '存证溯源.html': [5],
        '活动日志.html': [5]
    };

    // ---------- 页面 → 对应登录页 映射 ----------
    var LOGIN_MAP = {
        1: '登录-贸易商.html',
        2: '登录-仓储方.html',
        3: '登录-物流方.html',
        5: '登录-平台管理.html'
    };

    function getFileName() {
        var path = window.location.pathname;
        return path.substring(path.lastIndexOf('/') + 1);
    }

    function getAllowedRoles() {
        return ROLE_MAP[getFileName()] || null;
    }

    // ---------- 跳回登录页 ----------
    function redirectToLogin(role) {
        var loginPage = LOGIN_MAP[Number(role)] || '登录-贸易商.html';
        // 防止死循环：已经在登录页就不再跳
        if (getFileName() === loginPage) return;
        window.location.replace(loginPage);
    }

    // ---------- 校验 ----------
    function checkAuth() {
        var user = getCurrentUser();
        var allowedRoles = getAllowedRoles();

        if (!user) {
            console.warn('[auth] 未检测到登录信息，跳回登录页');
            redirectToLogin(null);
            return false;
        }

        if (allowedRoles && allowedRoles.indexOf(Number(user.roleType)) === -1) {
            console.warn('[auth] 角色不匹配，当前 roleType =', user.roleType);
            redirectToLogin(user.roleType);
            return false;
        }

        // 校验通过，挂到 window 方便页面使用
        window.currentUser = user;
        return true;
    }

    // ---------- 对外暴露 ----------
    window.Auth = {
        check: checkAuth,
        getUser: getCurrentUser,
        logout: function () {
            localStorage.removeItem('current_user');
            localStorage.removeItem('token');
            redirectToLogin(getCurrentUser() ? getCurrentUser().roleType : null);
        }
    };

    // 页面一加载就校验
    checkAuth();
})();