/// ============================================================
// 管理界面（平台管理员）
// ============================================================
const API_CONFIG = {
    baseURL: 'http://192.168.0.3:10001/api',   // 保留
    headers: { 'Content-Type': 'application/json' }
};

// 安全 DOM 工具
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

const ApiService = {
    // ✅ 保留 request(endpoint, options) 签名，内部改用 window.request
    async request(endpoint, options = {}) {
        const method = (options.method || 'GET').toUpperCase();

        // 解析 endpoint 上的 query（如 /user/list?page=1&size=1）
        let path = endpoint;
        let params = null;
        const qIdx = endpoint.indexOf('?');
        if (qIdx !== -1) {
            path = endpoint.slice(0, qIdx);
            params = {};
            new URLSearchParams(endpoint.slice(qIdx + 1)).forEach((v, k) => {
                params[k] = v;
            });
        }

        // 解析 body
        let body = null;
        if (options.body) {
            try {
                body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            } catch (e) {
                body = options.body;
            }
        }

        // ✅ 用 request，自动带 token、统一处理 401
        let cleanPath = path;
        if (cleanPath.startsWith('/api/')) cleanPath = cleanPath.slice(4);
        else if (cleanPath === '/api') cleanPath = '';

        switch (method) {
            case 'GET':
                return await request.get(cleanPath, params, { autoRedirect: false });
            case 'POST':
                return await request.post(cleanPath, body, { autoRedirect: false });
            case 'PUT':
                return await request.put(cleanPath, body, { autoRedirect: false });
            case 'DELETE':
                return await request.delete(cleanPath, params, { autoRedirect: false });
            default:
                return await request(cleanPath, { method, params, body, autoRedirect: false });
        }
    },

    // ============================================================
    // ✅ 新增：对接后端 3 个 dashboard 接口
    //   GET /dashboard/stats
    //   GET /dashboard/activities
    //   GET /dashboard/todos
    // 保留原有 getStats() 的调用方式与返回结构，其它逻辑一行未动
    // ============================================================
    async getStats() {
        // 兜底：如果 /dashboard/stats 挂了，至少让 "注册用户" 不空白
        let usersTotal = 0;
        try {
            const userRes = await this.request('/user/list?page=1&size=1');
            usersTotal = userRes?.data?.total || 0;
        } catch (e) { usersTotal = 0; }

        try {
            const res = await this.request('/dashboard/stats');
            if (res && Number(res.code) === 200 && res.data) {
                const d = res.data || {};
                return {
                    revenue: d.revenue != null ? Number(d.revenue) : 0,
                    revenueChange: d.revenueChange || '--',
                    users: d.users != null ? Number(d.users) : usersTotal,
                    usersChange: d.usersChange || '注册用户总数',
                    pending: d.pending != null ? d.pending : '--',
                    pendingChange: d.pendingChange || '--'
                };
            }
        } catch (e) {
            console.warn('获取 dashboard/stats 失败，回退到本地统计:', e);
        }

        // 后端不可用时的兜底
        return {
            revenue: 0,
            revenueChange: '--',
            users: usersTotal,
            usersChange: '注册用户总数',
            pending: '--',
            pendingChange: '--'
        };
    },

    async getActivities() {
        try {
            const res = await this.request('/dashboard/activities');
            if (!res || Number(res.code) !== 200) return [];
            const d = res.data;
            const list = Array.isArray(d) ? d : (d && d.list) || [];
            return list.map(item => ({
                icon: item.icon || '',
                iconBg: item.iconBg || '#eef2f6',
                title: item.title || '--',
                desc: item.desc || item.description || '--',
                time: item.time || item.createTime || '--'
            }));
        } catch (e) {
            console.warn('获取 dashboard/activities 失败:', e);
            return [];
        }
    },

    async getTodos() {
        try {
            const res = await this.request('/dashboard/todos');
            if (!res || Number(res.code) !== 200) return [];
            const d = res.data;
            const list = Array.isArray(d) ? d : (d && d.list) || [];
            return list.map(item => ({
                id: item.id,
                text: item.text || item.title || '--',
                tag: item.tag || item.tagText || '待处理',
                tagClass: item.tagClass || ''
            }));
        } catch (e) {
            console.warn('获取 dashboard/todos 失败:', e);
            return [];
        }
    },

    async completeTodo() { return { success: true }; }
};

function renderStats(data) {
    setText('statRevenue', data.revenue ? `¥${data.revenue.toLocaleString()}` : '--');
    setText('statRevenueChange', data.revenueChange || '--');
    setText('statUsers', data.users ? data.users.toLocaleString() : '--');
    setText('statUsersChange', data.usersChange || '--');
    setText('statPending', data.pending || '--');
    setText('statPendingChange', data.pendingChange || '--');
}

function renderActivities(activities) {
    const container = document.getElementById('activityList');
    if (!container) return;
    if (!activities || activities.length === 0) {
        container.innerHTML = '<li class="loading-text">暂无活动</li>';
        return;
    }
    container.innerHTML = activities.map(item => `
        <li>
            <span class="activity-icon" style="background:${item.iconBg || '#eef2f6'};">${item.icon || ''}</span>
            <div class="activity-content">
                <div class="title">${item.title}</div>
                <div class="desc">${item.desc}</div>
            </div>
            <span class="activity-time">${item.time}</span>
        </li>
    `).join('');
}

function renderTodos(todos) {
    const container = document.getElementById('todoList');
    const countEl = document.getElementById('todoCount');
    if (!container) return;

    if (!todos || todos.length === 0) {
        container.innerHTML = `<li class="todo-empty">所有待办已完成！</li>`;
        if (countEl) countEl.textContent = '0项待处理';
        return;
    }
    if (countEl) countEl.textContent = `${todos.length}项待处理`;
    container.innerHTML = todos.map(item => `
        <li class="todo-item" data-id="${item.id}">
            <input type="checkbox" class="todo-check" onchange="handleTodoComplete(${item.id}, this)">
            <span class="todo-text">${item.text}</span>
            <span class="todo-tag ${item.tagClass || ''}">${item.tag || '待处理'}</span>
        </li>
    `).join('');
}

async function handleTodoComplete(todoId, checkbox) {
    const todoItem = checkbox.closest('.todo-item');
    if (!todoItem) return;
    checkbox.disabled = true;
    try {
        const result = await ApiService.completeTodo(todoId);
        if (result.success) {
            todoItem.classList.add('removing');
            setTimeout(() => {
                todoItem.remove();
                const remaining = document.querySelectorAll('.todo-item:not(.removing)').length;
                setText('todoCount', `${remaining}项待处理`);
                if (remaining === 0) {
                    const tl = document.getElementById('todoList');
                    if (tl) tl.innerHTML = `<li class="todo-empty">所有待办已完成！</li>`;
                }
                updatePendingCount();
            }, 300);
        } else {
            checkbox.disabled = false;
            checkbox.checked = false;
        }
    } catch (error) {
        console.error('完成待办失败:', error);
        checkbox.disabled = false;
        checkbox.checked = false;
    }
}

function updatePendingCount() {
    const remaining = document.querySelectorAll('.todo-item:not(.removing)').length;
    setText('statPending', remaining);
    setText('statPendingChange', remaining > 0 ? '需关注' : '全部完成');
}

async function loadDashboard() {
    const al = document.getElementById('activityList');
    const tl = document.getElementById('todoList');
    if (al) al.innerHTML = '<li class="loading-text">加载中...</li>';
    if (tl) tl.innerHTML = '<li class="loading-text">加载中...</li>';

    try {
        // ✅ allSettled：一个失败不影响其他
        const results = await Promise.allSettled([
            ApiService.getStats(),
            ApiService.getActivities(),
            ApiService.getTodos()
        ]);

        const stats = results[0].status === 'fulfilled' ? results[0].value : {};
        const activities = results[1].status === 'fulfilled' ? results[1].value : [];
        const todos = results[2].status === 'fulfilled' ? results[2].value : [];

        renderStats(stats);
        renderActivities(activities);
        renderTodos(todos);

        const now = new Date();
        setText('updateTime',
            `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        if (al) al.innerHTML = `<li class="error-text">数据加载失败: ${error.message}</li>`;
        if (tl) tl.innerHTML = `<li class="error-text">数据加载失败: ${error.message}</li>`;
        ['statRevenue', 'statUsers', 'statPending'].forEach(id => setText(id, '--'));
        ['statRevenueChange', 'statUsersChange', 'statPendingChange'].forEach(id => setText(id, '--'));
    }
}

function handleSettings() { window.location.href = '设置.html'; }
function handleViewAllActivities() { window.location.href = '活动日志.html'; }
function handleLogout() {
    if (confirm('确认退出登录吗？')) {
        localStorage.removeItem('token');
        localStorage.removeItem('current_user');
        // ✅ 跳平台管理登录页
        window.location.href = '登录.html';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    setText('dateDisplay',
        `${year}年${month}月${day}日 ${weekdays[now.getDay()]}`);

    loadDashboard();

    const user = JSON.parse(localStorage.getItem('current_user') || '{}');
    if (user.name || user.companyName) {
        setText('userName', user.name || user.companyName);
        setText('userEmail', user.email || user.account || 'admin@demo.com');
        const av = document.getElementById('userAvatar');
        if (av) av.textContent = (user.name || user.companyName).charAt(0);
    }
});

window.handleTodoComplete = handleTodoComplete;
window.handleSettings = handleSettings;
window.handleViewAllActivities = handleViewAllActivities;
window.handleLogout = handleLogout;