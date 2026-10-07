// ============================================================
// 物流方-工作台
// 后端: GET /logistics/list
//       GET /logistics/workbench/stats
//       GET /logistics/feed
//       GET /auth/isLogistics/{addr}
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

// 安全 DOM 工具
function setText(el, value) {
    if (el) el.textContent = value;
}

const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const searchInput = document.getElementById('taskSearchInput');
const searchBtn = document.getElementById('taskSearchBtn');
const filterTags = document.querySelectorAll('.filter-tag');
const feedList = document.getElementById('feedList');
const statOnChain = document.getElementById('statOnChain');
const statPending = document.getElementById('statPending');
const statTaxCalls = document.getElementById('statTaxCalls');

let taskData = [];
let feedData = [];
let currentFilter = 'all';
let currentSearch = '';

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
// ✅ 新增：本地存证档案读取（用于合并展示）
// ============================================================
function getLocalArchive() {
    try {
        const raw = localStorage.getItem('archive_records');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

// ============================================================
// 任务列表（✅ 修改：合并后端 + 本地新建物流）
// ============================================================
async function fetchTasks() {
    let serverTasks = [];
    try {
        const data = await request.get('/logistics/list', { page: 1, size: 20 }, { autoRedirect: false });
        if (data && Number(data.code) === 200) {
            const list = data.data?.list || [];
            serverTasks = list.map(item => ({
                id: item.logisticsNo || item.id,
                cargo: item.goodsName || ('订单 ' + item.orderId),
                from: '--',
                to: item.currentLocation || '--',
                status: item.logisticsStatus === 2 ? '已完成'
                    : item.logisticsStatus === 3 ? '异常'
                        : '进行中',
                dot: item.logisticsStatus === 2 ? 'green'
                    : item.logisticsStatus === 3 ? 'red'
                        : 'blue'
            }));
        }
    } catch (e) {
        console.warn('后端任务列表获取失败，使用本地数据补充:', e);
    }

    // ✅ 新增：合并本地新建的物流（存证档案中的数据）
    const localArchive = getLocalArchive();
    const localTasks = localArchive.map(rec => ({
        id: rec.taskId || rec.certId,
        cargo: rec.cargo || '--',
        from: rec.fromLocation || '--',
        to: rec.toLocation || rec.currentLocation || '--',
        status: rec.status === '通过' ? '已完成'
            : rec.status === '异常' ? '异常' : '进行中',
        dot: rec.status === '通过' ? 'green'
            : rec.status === '异常' ? 'red' : 'blue'
    }));

    // 以 id 去重（后端优先，本地补充）
    const idSet = new Set(serverTasks.map(t => String(t.id)));
    const merged = [...serverTasks];
    localTasks.forEach(t => {
        if (!idSet.has(String(t.id))) {
            merged.unshift(t);
            idSet.add(String(t.id));
        }
    });

    taskData = merged;
    renderTasks();
    return taskData;
}

// ============================================================
// 工作台统计（✅ 修改：后端 + 本地存证计数）
// ============================================================
async function fetchStats() {
    try {
        const data = await request.get('/logistics/workbench/stats', null, { autoRedirect: false });
        if (data && Number(data.code) === 200) {
            const stats = data.data || {};
            // ✅ 新增：本地存证数量合并
            const localCount = getLocalArchive().length;
            const serverOnChain = Number(stats.todayOnChain || 0);
            setText(statOnChain, serverOnChain + localCount);
            setText(statPending, stats.pendingVerify || 0);
            setText(statTaxCalls, stats.taxCalls || 0);
            return stats;
        }
    } catch (e) {
        console.warn('获取统计数据失败，使用本地计数:', e);
    }
    // ✅ 新增：后端失败时用本地数据
    const localCount = getLocalArchive().length;
    setText(statOnChain, localCount);
    setText(statPending, 0);
    setText(statTaxCalls, 0);
    return {};
}

// ============================================================
// 协同动态（✅ 修改：后端 + 本地新建物流动态）
// ============================================================
async function fetchFeeds() {
    let serverFeeds = [];
    try {
        const data = await request.get('/logistics/feed', null, { autoRedirect: false });
        if (data && Number(data.code) === 200) {
            serverFeeds = data.data || [];
        }
    } catch (e) {
        console.warn('获取动态消息失败，使用本地数据:', e);
    }

    // ✅ 新增：从本地存证档案生成动态
    const localArchive = getLocalArchive();
    const localFeeds = localArchive.slice(0, 10).map(rec => ({
        text: `新建物流：${rec.cargo || '--'} · 单证编号 ${rec.certId}`,
        time: rec.timeRaw || rec.createdAt || new Date().toISOString()
    }));

    // 合并并按时间倒序
    const merged = [...localFeeds, ...serverFeeds]
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
        .slice(0, 20);

    feedData = merged;
    renderFeeds();
    return feedData;
}

// ============================================================
// 渲染
// ============================================================
function renderTasks() {
    if (!taskList) return;

    let filtered = [...taskData];

    if (currentFilter === 'active') {
        filtered = filtered.filter(t => t.status === '进行中');
    } else if (currentFilter === 'pending') {
        filtered = filtered.filter(t => t.status === '待处理');
    } else if (currentFilter === 'error') {
        filtered = filtered.filter(t => t.status === '异常');
    }

    if (currentSearch.trim()) {
        const keyword = currentSearch.trim().toLowerCase();
        filtered = filtered.filter(t =>
            String(t.id || '').toLowerCase().includes(keyword) ||
            (t.cargo || '').toLowerCase().includes(keyword)
        );
    }

    if (filtered.length === 0) {
        taskList.innerHTML = `<div class="no-data">暂无匹配的任务</div>`;
    } else {
        taskList.innerHTML = filtered.map(t => `
            <div class="task-card status-${t.status === '进行中' ? 'done' : t.status === '待处理' ? 'pending' : 'error'}"
                 onclick="goToDocument('${t.id}')">
                <div class="task-left">
                    <div class="task-id">${t.id}</div>
                    <div class="task-meta">
                        <span>${t.cargo}</span>
                        <span>${t.from} → ${t.to}</span>
                        <span><span class="status-dot ${t.dot || 'green'}"></span>${t.status}</span>
                    </div>
                </div>
                <div class="task-right">
                    <span class="status-dot ${t.dot || 'green'}"></span>
                    <span style="font-size:12px;color:#7a8a9a;">链上存证</span>
                </div>
            </div>
        `).join('');
    }

    setText(taskCount, filtered.length + ' 项');
}

function renderFeeds() {
    if (!feedList) return;

    if (feedData.length === 0) {
        feedList.innerHTML = `<li style="color:#9aaec2;text-align:center;padding:20px 0;">暂无动态</li>`;
    } else {
        feedList.innerHTML = feedData.map(f => `
            <li>
                <span>${f.text || f.content || '--'}</span>
                <span class="feed-time">${formatTime(f.time)}</span>
            </li>
        `).join('');
    }
}

// ============================================================
// 跳转单证中心
// ============================================================
window.goToDocument = function (taskId) {
    window.location.href = `物流方-单证中心.html?taskId=${encodeURIComponent(taskId)}`;
};

// ============================================================
// ✅ 新增：打开新建物流页面
// ============================================================
window.openNewLogistics = function () {
    const w = 720, h = 760;
    const left = (screen.width - w) / 2;
    const top = (screen.height - h) / 2;
    const win = window.open(
        '物流方-新建物流.html',
        'NewLogistics',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!win) {
        // 弹窗被拦截则直接跳转
        window.location.href = '物流方-新建物流.html';
    }
};

// ============================================================
// 搜索 & 筛选
// ============================================================
if (searchBtn) {
    searchBtn.addEventListener('click', function () {
        currentSearch = searchInput ? searchInput.value : '';
        renderTasks();
    });
}

if (searchInput) {
    searchInput.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            currentSearch = this.value;
            renderTasks();
        }
    });

    searchInput.addEventListener('input', function () {
        if (this.value === '') {
            currentSearch = '';
            renderTasks();
        }
    });
}

filterTags.forEach(tag => {
    tag.addEventListener('click', function () {
        filterTags.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderTasks();
    });
});

// ============================================================
// 角色校验
// ============================================================
async function checkRole() {
    const user = getCurrentUser();
    if (!user || !user.chainAddress) return;
    try {
        const data = await request.get('/auth/isLogistics/' + user.chainAddress, null, { autoRedirect: false });
        if (data && Number(data.code) === 200 && data.data !== true) {
            console.warn('当前账号不是物流方角色');
        }
    } catch (e) {
        console.warn('角色校验失败:', e);
    }
}

// ============================================================
// 初始化
// ============================================================
async function init() {
    await Promise.allSettled([fetchTasks(), fetchStats(), fetchFeeds(), checkRole()]);
    setInterval(() => { fetchTasks(); fetchStats(); fetchFeeds(); }, 30000);
    console.log('航贸链 · 工作台已启动 (API: ' + API_BASE + ')');
}
init();