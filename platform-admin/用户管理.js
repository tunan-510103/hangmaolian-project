// ============================================================
// 用户管理（平台管理员）
// 后端: GET    /user/list?page&size&keyword&roleType&isEnable
//       GET    /user/{id}
//       PUT    /user/{id}              {email, userName, phone, roleType}
//       PATCH  /user/{id}/status       {isEnable: 0/1}
//       DELETE /user/{id}
//       GET    /user/apply/list?page&size&status
//       POST   /user/apply/{id}/approve
//       POST   /user/apply/{id}/reject
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';

// ============================================================
// DOM 引用
// ============================================================
const userTableBody = document.getElementById('userTableBody');
const paginationInfo = document.getElementById('paginationInfo');
const paginationPages = document.getElementById('paginationPages');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const statusFilter = document.getElementById('statusFilter');
const dateDisplay = document.getElementById('dateDisplay');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userAvatarEl = document.getElementById('userAvatar');
const toastEl = document.getElementById('toast');
const applicationTableBody = document.getElementById('applicationTableBody');
const pendingCountEl = document.getElementById('pendingCount');

function setText(el, value) {
    if (el) el.textContent = value;
}

// ============================================================
// 状态
// ============================================================
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let allCache = [];

const ROLE_NAME_TO_TYPE = {
    '贸易商': 1,
    '仓储方': 2,
    '物流方': 3,
    '税收': 4,
    '管理员': 5
};

const ROLE_TYPE_TO_NAME = {
    1: '贸易商',
    2: '仓储方',
    3: '物流方',
    4: '税收',
    5: '管理员'
};

const ROLE_BADGE_CLASS = {
    1: 'badge-trader',
    2: 'badge-trader',
    3: 'badge-trader',
    4: 'badge-pending',
    5: 'badge-admin'
};

// ============================================================
// Toast
// ============================================================
let toastTimer = null;
function showToast(message, type = 'info', duration = 2200) {
    if (!toastEl) { console.log('[toast]', message); return; }
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastEl.classList.remove('show', 'success', 'error');
    }
    void toastEl.offsetWidth;
    toastEl.textContent = message;
    toastEl.className = 'toast';
    if (type === 'success') toastEl.classList.add('success');
    if (type === 'error') toastEl.classList.add('error');
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
        toastTimer = null;
    }, duration);
}

// ============================================================
// 工具
// ============================================================
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function getInitial(name) {
    if (!name) return '?';
    return String(name).trim().charAt(0).toUpperCase();
}

function updateDateDisplay() {
    if (!dateDisplay) return;
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    dateDisplay.textContent =
        `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;
}

function loadCurrentUserInfo() {
    const user = JSON.parse(localStorage.getItem('current_user') || 'null');
    if (user) {
        setText(userNameEl, user.companyName || '管理员');
        setText(userEmailEl, user.email || user.account || 'admin@demo.com');
        setText(userAvatarEl, getInitial(user.companyName || '管'));
    }
}

// ============================================================
// API - 拉取用户列表
// ============================================================
async function fetchAllUsers() {
    const data = await request.get('/user/list', { page: 1, size: 1000 }, { autoRedirect: false });
    if (!data || Number(data.code) !== 200) {
        throw new Error((data && data.message) || '查询失败');
    }
    const result = data.data || {};
    return result.list || [];
}

// ============================================================
// 渲染用户表
// ============================================================
function renderTable(list) {
    if (!userTableBody) return;

    if (!list || list.length === 0) {
        userTableBody.innerHTML = `<tr><td colspan="5" class="empty-text">暂无用户数据</td></tr>`;
        return;
    }

    userTableBody.innerHTML = list.map(item => {
        const roleName = ROLE_TYPE_TO_NAME[item.roleType] || '未知';
        const roleCls = ROLE_BADGE_CLASS[item.roleType] || 'badge-trader';
        const enabled = item.isEnable === 1;
        const statusCls = enabled ? 'badge-active' : 'badge-inactive';
        const statusText = enabled ? '已激活' : '已停用';

        const displayName = item.userName || item.userAccount || '未命名';
        const displayEmail = item.email || '--';

        const isAdmin = item.roleType === 5;

        return `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${getInitial(displayName)}</div>
                        <div>
                            <div class="user-name">${escapeHtml(displayName)}</div>
                            <div class="user-email">${escapeHtml(displayEmail)}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge ${roleCls}">${roleName}</span></td>
                <td><span class="badge ${statusCls}">${statusText}</span></td>
                <td style="font-size:0.85rem;color:#6b8ba0;">${formatTime(item.createTime)}</td>
                <td>
                    <div class="action-btns">
                        ${enabled
                ? `<button class="btn btn-sm btn-secondary" onclick="toggleUserStatus(${item.id}, 0)">停用</button>`
                : `<button class="btn btn-sm btn-success" onclick="toggleUserStatus(${item.id}, 1)">启用</button>`
            }
                        ${isAdmin
                ? ''
                : `<button class="btn btn-sm btn-danger" onclick="deleteUser(${item.id}, '${escapeHtml(displayName)}')">删除</button>`
            }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// 前端筛选
// ============================================================
function applyFiltersToCache() {
    const kw = (searchInput?.value || '').trim().toLowerCase();
    const roleName = roleFilter?.value || '';
    const statusVal = statusFilter?.value || 'all';

    let filtered = allCache.slice();

    if (kw) {
        filtered = filtered.filter(u =>
            (u.userName || '').toLowerCase().includes(kw) ||
            (u.userAccount || '').toLowerCase().includes(kw) ||
            (u.email || '').toLowerCase().includes(kw) ||
            (u.phone || '').toLowerCase().includes(kw) ||
            (u.chainAddress || '').toLowerCase().includes(kw)
        );
    }

    if (roleName) {
        const rt = ROLE_NAME_TO_TYPE[roleName];
        if (rt != null) {
            filtered = filtered.filter(u => u.roleType === rt);
        }
    }

    if (statusVal === 'active') {
        filtered = filtered.filter(u => u.isEnable === 1);
    } else if (statusVal === 'inactive') {
        filtered = filtered.filter(u => u.isEnable === 0);
    } else if (statusVal === 'pending') {
        filtered = filtered.filter(u => u.roleType == null);
    }

    return filtered;
}

// ============================================================
// 分页渲染
// ============================================================
function renderPagination(total) {
    totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    setText(paginationInfo, `共 ${total} 条记录`);

    if (!paginationPages) return;

    let html = '';
    html += `<button ${currentPage <= 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">上一页</button>`;

    const start = Math.max(1, currentPage - 3);
    const end = Math.min(totalPages, start + 6);
    for (let i = start; i <= end; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }

    html += `<button ${currentPage >= totalPages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">下一页</button>`;

    paginationPages.innerHTML = html;
}

// ============================================================
// 主流程
// ============================================================
async function loadUsers() {
    if (userTableBody) {
        userTableBody.innerHTML = `<tr><td colspan="5" class="loading-text">加载中...</td></tr>`;
    }
    try {
        allCache = await fetchAllUsers();
    } catch (e) {
        console.error('加载用户失败:', e);
        if (userTableBody) {
            userTableBody.innerHTML = `<tr><td colspan="5" class="error-text">加载失败：${escapeHtml(e.message)}</td></tr>`;
        }
        showToast('加载用户失败：' + e.message, 'error');
        return;
    }

    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const filtered = applyFiltersToCache();
    const total = filtered.length;

    const start = (currentPage - 1) * pageSize;
    const pageList = filtered.slice(start, start + pageSize);

    renderTable(pageList);
    renderPagination(total);
}

function applyFilters() {
    currentPage = 1;
    applyFiltersAndRender();
}

function goPage(p) {
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    applyFiltersAndRender();
}

// ============================================================
// 启用 / 停用
// ============================================================
async function toggleUserStatus(id, isEnable) {
    const action = isEnable === 1 ? '启用' : '停用';
    if (!confirm(`确认${action}该用户？`)) return;

    try {
        const data = await request(`/user/${id}/status`, {
            method: 'PATCH',
            body: { isEnable: isEnable },
            autoRedirect: false
        });
        if (data && Number(data.code) === 200) {
            showToast(`已${action}`, 'success');
            const u = allCache.find(x => x.id === id);
            if (u) u.isEnable = isEnable;
            applyFiltersAndRender();
        } else {
            showToast((data && data.message) || `${action}失败`, 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('网络错误，请重试', 'error');
    }
}

// ============================================================
// 删除
// ============================================================
async function deleteUser(id, name) {
    if (!confirm(`确认删除用户「${name}」？此操作不可恢复。`)) return;
    if (!confirm('再次确认：删除后该用户将无法登录。')) return;

    try {
        const data = await request.delete(`/user/${id}`, null, { autoRedirect: false });
        if (data && Number(data.code) === 200) {
            showToast('已删除', 'success');
            allCache = allCache.filter(u => u.id !== id);
            applyFiltersAndRender();
        } else {
            showToast((data && data.message) || '删除失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('网络错误，请重试', 'error');
    }
}

// ============================================================
// 退出登录
// ============================================================
function handleLogout() {
    if (confirm('确认退出登录吗？')) {
        localStorage.removeItem('token');
        localStorage.removeItem('current_user');
        window.location.href = '登录.html';
    }
}

// ============================================================
// 申请模块：仓储方 / 物流方入驻审核
// ============================================================
const APPLY_ROLE_MAP = {
    2: { name: '仓储方', cls: 'badge-trader' },
    3: { name: '物流方', cls: 'badge-trader' }
};

async function fetchApplications() {
    const data = await request.get('/user/apply/list', {
        page: 1,
        size: 1000,
        status: 'pending'
    }, { autoRedirect: false });

    if (!data || Number(data.code) !== 200) {
        throw new Error((data && data.message) || '查询申请失败');
    }
    const result = data.data || {};
    return result.list || [];
}

function renderApplications(list) {
    if (!applicationTableBody) return;

    if (pendingCountEl) {
        pendingCountEl.textContent = `${list.length} 条待审核`;
    }

    if (!list || list.length === 0) {
        applicationTableBody.innerHTML = `<tr><td colspan="5" class="empty-application">暂无待审核的入驻申请</td></tr>`;
        return;
    }

    applicationTableBody.innerHTML = list.map(app => {
        const roleInfo = APPLY_ROLE_MAP[app.roleType] || { name: '未知', cls: 'badge-trader' };
        const displayCompany = app.companyName || '未填写公司';
        const displayContact = app.contactName || app.contactPerson || '—';
        const displayPhone = app.phone || app.contactPhone || '—';
        const displayEmail = app.email || app.contactEmail || '';

        return `
            <tr>
                <td>
                    <div class="applicant-company">${escapeHtml(displayCompany)}</div>
                    <div class="applicant-contact">联系人：${escapeHtml(displayContact)}</div>
                </td>
                <td><span class="badge ${roleInfo.cls}">${roleInfo.name}</span></td>
                <td>
                    <div>${escapeHtml(displayPhone)}</div>
                    <div style="font-size:0.75rem;color:#6b8ba0;">${escapeHtml(displayEmail)}</div>
                </td>
                <td style="font-size:0.85rem;color:#6b8ba0;">${formatTime(app.applyTime)}</td>
                <td>
                    <div class="action-btns" style="display:flex;gap:6px;justify-content:center;">
                        <button class="btn btn-sm btn-success" onclick="approveApplication(${app.id})">通过</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectApplication(${app.id})">驳回</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadApplications() {
    if (applicationTableBody) {
        applicationTableBody.innerHTML = `<tr><td colspan="5" class="loading-text">加载中...</td></tr>`;
    }
    try {
        const list = await fetchApplications();
        renderApplications(list);
    } catch (e) {
        console.error('加载申请失败:', e);
        if (applicationTableBody) {
            applicationTableBody.innerHTML = `<tr><td colspan="5" class="error-text">加载失败：${escapeHtml(e.message)}</td></tr>`;
        }
        if (pendingCountEl) pendingCountEl.textContent = '0 条待审核';
    }
}

async function approveApplication(applyId) {
    if (!confirm('确认通过该入驻申请？通过后系统将为该企业创建账号。')) return;

    try {
        const data = await request(`/user/apply/${applyId}/approve`, {
            method: 'POST',
            autoRedirect: false
        });
        if (data && Number(data.code) === 200) {
            showToast('已通过申请，用户已创建', 'success');
            await Promise.all([loadApplications(), loadUsers()]);
        } else {
            showToast((data && data.message) || '操作失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('网络错误，请重试', 'error');
    }
}

async function rejectApplication(applyId) {
    if (!confirm('确认驳回该入驻申请？')) return;

    try {
        const data = await request(`/user/apply/${applyId}/reject`, {
            method: 'POST',
            autoRedirect: false
        });
        if (data && Number(data.code) === 200) {
            showToast('已驳回申请', 'success');
            await Promise.all([loadApplications(), loadUsers()]);
        } else {
            showToast((data && data.message) || '操作失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('网络错误，请重试', 'error');
    }
}

// ============================================================
// 暴露到全局
// ============================================================
window.applyFilters = applyFilters;
window.goPage = goPage;
window.loadUsers = loadUsers;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.handleLogout = handleLogout;
window.showToast = showToast;
window.loadApplications = loadApplications;
window.approveApplication = approveApplication;
window.rejectApplication = rejectApplication;

// ============================================================
// 初始化
// ============================================================
(async function init() {
    updateDateDisplay();
    loadCurrentUserInfo();

    if (searchInput) {
        searchInput.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') applyFilters();
        });
    }

    await Promise.all([loadUsers(), loadApplications()]);

    console.log('用户管理已启动 (API: ' + API_BASE + ')');
})();