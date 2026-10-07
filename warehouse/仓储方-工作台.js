// ============================================================
// 仓储方-工作台
// 后端: GET /warehouse/workbench/stats
//       GET /warehouse/bill/list
//       GET /auth/isWarehouse/{chainAddress}
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

// ============================================================
// 安全 DOM 工具
// ============================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================================
// Toast
// ============================================================
function showToast(msg) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('current_user') || 'null'); }
    catch { return null; }
}

function formatTime(t) {
    if (!t) return '--';
    try {
        const d = new Date(t);
        if (isNaN(d.getTime())) return String(t);
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch { return String(t); }
}

// ============================================================
// 工作台统计（✅ 用 request）
// ============================================================
async function fetchStats() {
    try {
        const data = await request.get('/warehouse/workbench/stats', null, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '统计接口异常');
        }
        const s = data.data || {};

        setText('statOrders', s.totalBills || 0);
        setText('statOrdersSub', '待处理 ' + (s.pendingBills || 0) + ' 单');
        setText('statVerified', s.totalSku || 0);
        setText('statVerifiedSub', '库存 SKU 总数');
        setText('statWarnings', s.lowStock || 0);
        setText('statWarningsSub', '低库存预警');
        setText('statUtilization', '--');
        setText('statUtilSub', '后端暂未提供');
        return s;
    } catch (e) {
        console.error('获取统计数据失败:', e);
        return {};
    }
}

// ============================================================
// 待办任务：仓单列表占位（✅ 用 request）
// ============================================================
async function fetchTasks() {
    try {
        const data = await request.get('/warehouse/bill/list', { page: 1, size: 5 }, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '查询失败');
        }
        const list = data.data?.list || [];
        const container = document.getElementById('taskList');
        if (!container) return list;

        if (list.length === 0) {
            container.innerHTML = '<div class="no-data">暂无待办任务</div>';
        } else {
            const statusText = { 0: '新建', 1: '已确权', 2: '已出库', 3: '质押锁定' };
            container.innerHTML = list.map(b => `
                <div class="task-item">
                    <div class="task-info">
                        <span class="task-badge normal">${statusText[b.billStatus] || '普通'}</span>
                        <span>仓单 ${b.warehouseBillNo || b.id} · ${b.qualityReport || '--'}</span>
                    </div>
                    <span class="task-time">${formatTime(b.createTime)}</span>
                </div>
            `).join('');
        }
        return list;
    } catch (e) {
        console.error('获取任务列表失败:', e);
        const container = document.getElementById('taskList');
        if (container) container.innerHTML = '<div class="no-data">加载失败</div>';
        return [];
    }
}

// ============================================================
// 近期上链记录（✅ 用 request）
// ============================================================
async function fetchChains() {
    try {
        const data = await request.get('/warehouse/bill/list', { page: 1, size: 5 }, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '查询失败');
        }
        const list = data.data?.list || [];
        const container = document.getElementById('chainList');
        if (!container) return list;

        if (list.length === 0) {
            container.innerHTML = '<div class="no-data">暂无上链记录</div>';
        } else {
            container.innerHTML = list.map(b => `
                <div class="chain-item">
                    <span class="chain-id">${b.warehouseBillNo || b.id}</span>
                    <span class="chain-status">${b.dataHash ? '已上链' : '待上链'}</span>
                    <span class="chain-time">${formatTime(b.createTime)}</span>
                </div>
            `).join('');
        }
        return list;
    } catch (e) {
        console.error('获取上链记录失败:', e);
        const container = document.getElementById('chainList');
        if (container) container.innerHTML = '<div class="no-data">加载失败</div>';
        return [];
    }
}

// ============================================================
// 补上 fetchMonitor / fetchSync（原来未定义，refreshAll 会报错）
// ============================================================
async function fetchMonitor() {
    // 后端无此接口，占位
    return [];
}
async function fetchSync() {
    // 后端无此接口，占位
    return [];
}

// ============================================================
// 企业信息 + 角色校验（✅ 用 request）
// ============================================================
async function fetchCompanyInfo() {
    const user = getCurrentUser();
    if (!user) return {};

    const name = user.companyName || '仓储物流中心';
    setText('companyName', name);
    setText('avatarText', name.charAt(0));
    setText('notifBadge', 0);

    if (user.chainAddress) {
        try {
            const data = await request.get('/auth/isWarehouse/' + user.chainAddress, null, { autoRedirect: false });
            if (data && Number(data.code) === 200 && data.data !== true) {
                showToast('当前账号不是仓储方角色');
            }
        } catch (e) {
            console.warn('角色校验失败:', e);
        }
    }
    return user;
}

// ============================================================
// 初始化 & 定时刷新
// ============================================================
let refreshInterval = null;

async function refreshAll() {
    // ✅ allSettled：一个失败不影响其他
    await Promise.allSettled([
        fetchStats(),
        fetchTasks(),
        fetchChains(),
        fetchMonitor(),
        fetchSync(),
        fetchCompanyInfo()
    ]);
}

async function init() {
    await refreshAll();
    refreshInterval = setInterval(refreshAll, 30000);
    console.log('仓储方 · 工作台已启动 (API: ' + API_BASE + ')');
}
init();