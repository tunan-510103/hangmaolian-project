// ============================================================
// 核验看板
// 后端: GET /order/count
//       GET /order/list?page&size&keyword&orderStatus
//       GET /order/status/{id}
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

const ORDER_STATUS_TEXT = {
    0: '待入库',
    3: '已入库',
    1: '运输中',
    2: '已签收'
};

// 安全 DOM 工具
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

const tbody = document.getElementById('tableBody');
const totalCount = document.getElementById('totalCount');
const recordCount = document.getElementById('recordCount');
const pageInfo = document.getElementById('pageInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');

const statPass = document.getElementById('statPass');
const statError = document.getElementById('statError');
const statPending = document.getElementById('statPending');

let currentPage = 1;
let pageSize = 8;
let currentKeyword = '';

function formatTime(iso) {
    if (!iso) return '--';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch { return iso; }
}

function showToast(msg, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type) toast.classList.add(type);
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============================================================
// 统计（✅ 用 request）
// ============================================================
async function fetchVerifyStats() {
    try {
        const data = await request.get('/order/list', { page: 1, size: 1000 }, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '统计接口异常');
        }
        const list = data.data?.list || [];
        const total = data.data?.total || list.length;

        let passCount = 0, errorCount = 0, pendingCount = 0;
        list.forEach(o => {
            if (o.orderStatus === 2) passCount++;
            else if (o.orderStatus === 1) pendingCount++;
            else pendingCount++;
        });

        return { passCount, errorCount, pendingCount, total };
    } catch (e) {
        console.warn('统计接口不可用:', e);
        return { passCount: 0, errorCount: 0, pendingCount: 0, total: 0 };
    }
}

// ============================================================
// 列表（✅ 用 request）
// ============================================================
async function fetchVerifyRecords(params) {
    const query = {
        page: params.page || 1,
        size: params.size || pageSize
    };
    if (params.keyword) query.keyword = params.keyword;

    const data = await request.get('/order/list', query, { autoRedirect: false });

    if (!data || Number(data.code) !== 200) {
        throw new Error((data && data.message) || '查询失败');
    }

    const result = data.data || {};
    const list = result.list || [];

    return {
        list: list.map(item => ({
            id: item.orderNo || item.id || '--',
            orderId: item.id,
            category: item.goodsName || '--',
            resultType: item.orderStatus === 2 ? 'pass' : 'pending',
            result: ORDER_STATUS_TEXT[item.orderStatus] || '待入库',
            statusCode: item.orderStatus,
            time: formatTime(item.createTime || item.updateTime)
        })),
        total: result.total || list.length,
        page: result.page || params.page || 1,
        size: result.size || params.size || pageSize
    };
}

function renderTable(data) {
    if (!tbody) return;

    const list = data.list || [];
    const total = data.total || 0;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data"><i class="fas fa-inbox"></i>暂无核验记录</td></tr>';
    } else {
        tbody.innerHTML = list.map(item => {
            const sc = item.resultType === 'pass' ? 'success'
                : item.resultType === 'error' ? 'error' : 'pending';
            const label = item.resultType === 'pass' ? '通过'
                : item.resultType === 'error' ? '异常' : '待处理';
            return `
                <tr>
                    <td><strong>${item.id || '--'}</strong></td>
                    <td>${item.category || '--'}</td>
                    <td><span class="status-badge ${sc}">${label}</span></td>
                    <td style="font-size:12px;color:#6f8aa8;">${item.time || '--'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="showToast('查看详情：${item.id || '--'}')"><i class="fas fa-eye"></i> 查看</button>
                        <button class="btn btn-sm btn-outline" onclick="verifyChain('${item.orderId || ''}')"><i class="fas fa-link"></i> 验证</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const totalPages = Math.ceil(total / pageSize) || 1;
    setText('totalCount', total);
    setText('recordCount', '共 ' + total + ' 条');
    setText('pageInfo', currentPage + ' / ' + totalPages);
    if (prevPage) prevPage.disabled = currentPage <= 1;
    if (nextPage) nextPage.disabled = currentPage >= totalPages;
}

// ============================================================
// 链上验证（✅ 用 request）
// ============================================================
async function verifyChain(orderId) {
    if (!orderId) { showToast('无效的订单ID', 'error'); return; }
    try {
        const data = await request.get('/order/status/' + orderId, null, { autoRedirect: false });
        if (data && Number(data.code) === 200) {
            const info = data.data || {};
            showToast(`订单 ${info.orderNo || orderId} 状态：${info.statusText || '未知'}`, 'success');
        } else {
            showToast((data && data.message) || '验证失败', 'error');
        }
    } catch (e) {
        console.error('验证失败:', e);
        showToast('验证失败，请重试', 'error');
    }
}

async function loadData() {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="loading-spinner">加载中...</td></tr>';

    try {
        const params = { keyword: currentKeyword, page: currentPage, size: pageSize };
        const results = await Promise.allSettled([
            fetchVerifyStats(),
            fetchVerifyRecords(params)
        ]);

        const stats = results[0].status === 'fulfilled'
            ? results[0].value
            : { passCount: 0, errorCount: 0, pendingCount: 0 };

        if (results[1].status !== 'fulfilled') {
            throw results[1].reason || new Error('加载失败');
        }
        const listData = results[1].value;

        setText('statPass', stats.passCount || 0);
        setText('statError', stats.errorCount || 0);
        setText('statPending', stats.pendingCount || 0);

        renderTable(listData);
    } catch (e) {
        console.error('加载数据失败:', e);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="no-data">数据加载失败: ${e.message}</td></tr>`;
        showToast('数据加载失败: ' + e.message, 'error');
    }
}

function doSearch() {
    currentKeyword = searchInput ? searchInput.value.trim() : '';
    currentPage = 1;
    loadData();
}

function resetSearch() {
    if (searchInput) searchInput.value = '';
    currentKeyword = '';
    currentPage = 1;
    loadData();
    showToast('已重置搜索', '');
}

function fetchCompanyInfo() {
    const user = JSON.parse(localStorage.getItem('current_user') || 'null');
    if (user) {
        const logoEl = document.querySelector('.logo-text');
        if (logoEl) logoEl.textContent = user.companyName || '企业名称';
        setText('notifBadge', 0);
    }
}

// 事件绑定（加判空）
if (searchBtn) searchBtn.addEventListener('click', doSearch);
if (searchInput) {
    searchInput.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') doSearch();
    });
}
if (resetBtn) resetBtn.addEventListener('click', resetSearch);

if (prevPage) {
    prevPage.addEventListener('click', function () {
        if (currentPage > 1) { currentPage--; loadData(); }
    });
}
if (nextPage) {
    nextPage.addEventListener('click', function () {
        const total = totalCount ? parseInt(totalCount.textContent) : 0;
        const totalPages = Math.ceil(total / pageSize);
        if (currentPage < totalPages) { currentPage++; loadData(); }
    });
}

window.verifyChain = verifyChain;
window.showToast = showToast;

async function init() {
    await Promise.allSettled([fetchCompanyInfo(), loadData()]);
    console.log('核验看板已启动 (API: ' + API_BASE + ')');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


// ============================================================
// 【新增】税务对接：额度查看 / 消息中心（与凭证管理一致）
// 不改动上方任何逻辑，仅追加
// ============================================================

/* ---------- 1. 发票额度查看 ---------- */
async function openQuotaView() {
    const modal = document.getElementById('quotaModal');
    const body = document.getElementById('quotaBody');
    if (!modal || !body) return;

    body.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ab0c2;">加载中...</div>';
    modal.classList.add('show');

    try {
        const res = await request.get('/tax/quota/me', null, { autoRedirect: false });
        if (!res || Number(res.code) !== 200 || !res.data) {
            throw new Error((res && res.message) || '额度接口异常');
        }
        renderQuotaView(res.data);
    } catch (e) {
        console.error('加载额度失败:', e);
        body.innerHTML = `<div style="text-align:center;padding:2rem;color:#b33a3a;">加载失败：${e.message}</div>`;
    }
}

function renderQuotaView(quota) {
    const body = document.getElementById('quotaBody');
    if (!body) return;

    const currentQuota = quota.availableAmount != null ? quota.availableAmount : 0;
    const usedQuota = quota.usedAmount != null ? quota.usedAmount : 0;

    const usagePercent = currentQuota > 0 ? Math.min(100, Math.round((usedQuota / currentQuota) * 100)) : 0;
    const barClass = usagePercent >= 80 ? 'danger' : usagePercent >= 60 ? 'warn' : '';

    body.innerHTML = `
        <div class="quota-current">
            <div class="quota-label">当前发票总额度</div>
            <div class="quota-value">${currentQuota} <small>万元</small></div>
            <div class="quota-meta">
                <span>有效期至：<strong>${quota.expiry || '--'}</strong></span>
                <span>信用评级：<strong>${quota.credit || '--'}</strong></span>
            </div>
        </div>
        <div class="quota-usage">
            <div class="usage-header">
                <span>本月使用进度</span>
                <span><strong>${usagePercent}%</strong></span>
            </div>
            <div class="usage-bar"><div class="usage-bar-inner ${barClass}" style="width:${usagePercent}%"></div></div>
            <div class="usage-text">已使用 <strong>${usedQuota}万</strong> / 总额度 <strong>${currentQuota}万</strong></div>
        </div>
        <div class="quota-history-title">额度调整记录</div>
        <ul class="quota-history">
            ${(quota.history || []).map(h => `
                <li class="quota-history-item">
                    <div class="qh-icon ${h.type}">${h.type === 'up' ? '↑' : h.type === 'down' ? '↓' : '⏳'}</div>
                    <div class="qh-content">
                        <div class="qh-title">${h.title}</div>
                        <div class="qh-desc">${h.desc}</div>
                    </div>
                    <div class="qh-time">${h.time}</div>
                </li>
            `).join('')}
        </ul>
    `;
}

function closeQuotaView() {
    const modal = document.getElementById('quotaModal');
    if (modal) modal.classList.remove('show');
}

/* ---------- 2. 消息中心 ---------- */
function isMessageApproved(msg) {
    const contentText = msg.content || '';
    return !contentText.includes('驳回');
}

async function openMessageCenter() {
    const modal = document.getElementById('messageModal');
    const body = document.getElementById('messageBody');
    if (!modal || !body) return;

    body.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ab0c2;">加载中...</div>';
    modal.classList.add('show');

    try {
        const res = await request.get('/tax/message/list', null, { autoRedirect: false });
        if (!res || Number(res.code) !== 200) {
            throw new Error((res && res.message) || '消息接口异常');
        }
        let messages = [];
        if (res.data && Array.isArray(res.data.list)) {
            messages = res.data.list;
        } else if (Array.isArray(res.data)) {
            messages = res.data;
        }
        renderMessageList(messages);
    } catch (e) {
        console.error('加载消息失败:', e);
        body.innerHTML = `<div style="text-align:center;padding:2rem;color:#b33a3a;">加载失败：${e.message}</div>`;
    }
}

function renderMessageList(messages) {
    const body = document.getElementById('messageBody');
    if (!body) return;

    if (!messages.length) {
        body.innerHTML = `
            <div class="msg-empty">
                <i class="fas fa-inbox"></i>
                <p>暂无消息</p>
            </div>
        `;
        return;
    }

    body.innerHTML = `
        <ul class="msg-list">
            ${messages.map(m => {
        const isApproved = isMessageApproved(m);
        const contentText = m.content || '';
        const msgId = m.id || m.msgId || m.messageId || Date.now();
        const time = m.createTime || m.time || '--';
        const billMatch = contentText.match(/BILL\d+/);
        const certId = billMatch ? billMatch[0] : '--';

        return `
                <li class="msg-item ${m.read ? '' : 'unread'}" onclick="openMessageDetail('${msgId}')">
                    <div class="msg-icon ${isApproved ? 'approved' : 'rejected'}">
                        <i class="fas ${isApproved ? 'fa-check' : 'fa-times'}"></i>
                    </div>
                    <div class="msg-content">
                        <div class="msg-title">
                            ${isApproved ? '额度申请已通过' : '额度申请被驳回'}
                            ${m.read ? '' : '<span class="msg-dot"></span>'}
                        </div>
                        <div class="msg-desc">${contentText || '无详细内容'}</div>
                        <div class="msg-time">${time}</div>
                    </div>
                    <i class="fas fa-chevron-right msg-arrow"></i>
                </li>
                `;
    }).join('')}
        </ul>
    `;
}

function closeMessageCenter() {
    const modal = document.getElementById('messageModal');
    if (modal) modal.classList.remove('show');
}

/* ---------- 3. 消息详情 ---------- */
async function openMessageDetail(msgId) {
    if (!msgId) return;

    request.post('/tax/message/' + msgId + '/read', null, { autoRedirect: false })
        .then(() => updateNotifBadge())
        .catch(e => console.warn('标记已读失败:', e));

    const modal = document.getElementById('messageDetailModal');
    const body = document.getElementById('messageDetailBody');
    if (!modal || !body) return;

    body.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ab0c2;">加载中...</div>';
    modal.classList.add('show');

    try {
        const res = await request.get('/tax/message/list', null, { autoRedirect: false });
        if (!res || Number(res.code) !== 200) {
            throw new Error((res && res.message) || '消息接口异常');
        }
        let messages = [];
        if (res.data && Array.isArray(res.data.list)) {
            messages = res.data.list;
        } else if (Array.isArray(res.data)) {
            messages = res.data;
        }
        const msg = messages.find(m => {
            const idFields = [m.id, m.msgId, m.messageId, m.noticeId, m.applyId];
            return idFields.some(id => String(id) === String(msgId));
        });
        if (!msg) throw new Error('未找到该消息');
        renderMessageDetail(msg);
    } catch (e) {
        console.error('加载消息详情失败:', e);
        body.innerHTML = `<div style="text-align:center;padding:2rem;color:#b33a3a;">加载失败：${e.message}</div>`;
    }
}

function renderMessageDetail(msg) {
    const body = document.getElementById('messageDetailBody');
    if (!body) return;

    const isApproved = isMessageApproved(msg);
    const contentText = msg.content || '';
    const time = msg.createTime || msg.time || '--';
    const billMatch = contentText.match(/BILL\d+/);
    const certId = billMatch ? billMatch[0] : '--';
    const reasonMatch = contentText.match(/原因[:：]\s*(.+)/);
    const reason = reasonMatch ? reasonMatch[1] : '未填写';

    body.innerHTML = `
        <div class="msg-detail-status ${isApproved ? 'approved' : 'rejected'}">
            <div class="msg-detail-icon">
                <i class="fas ${isApproved ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            </div>
            <div class="msg-detail-title">
                ${isApproved ? '额度申请已通过' : '额度申请被驳回'}
            </div>
            <div class="msg-detail-time">${time}</div>
        </div>

        <div class="msg-detail-grid">
            <div class="msg-detail-row">
                <span>凭证编号</span>
                <strong>${certId}</strong>
            </div>
            <div class="msg-detail-row">
                <span>消息内容</span>
                <strong style="font-weight: normal; font-size: 13px;">${contentText || '--'}</strong>
            </div>
            ${!isApproved ? `
                <div class="msg-detail-row">
                    <span>驳回原因</span>
                    <strong style="color:#b33a3a;">${reason === 'null' ? '未填写' : reason}</strong>
                </div>
            ` : ''}
        </div>

        ${isApproved ? `
            <div class="msg-detail-note success">
                <i class="fas fa-info-circle"></i>
                税务部门已依据航贸链核验数据完成赋额，您可在「额度」中查看最新额度。
            </div>
        ` : `
            <div class="msg-detail-note danger">
                <i class="fas fa-exclamation-circle"></i>
                如有疑问，请补充链上存证材料后重新提交申请。
            </div>
        `}
    `;
}

function closeMessageDetail() {
    const modal = document.getElementById('messageDetailModal');
    if (modal) modal.classList.remove('show');
}

/* ---------- 4. 消息角标 ---------- */
async function updateNotifBadge() {
    try {
        const res = await request.get('/tax/message/list', null, { autoRedirect: false });
        if (!res || Number(res.code) !== 200) return;
        let messages = [];
        if (res.data && Array.isArray(res.data.list)) {
            messages = res.data.list;
        } else if (Array.isArray(res.data)) {
            messages = res.data;
        }
        const unread = messages.filter(m => !m.read).length;
        const badge = document.getElementById('notifBadge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'inline-flex' : 'none';
        }
    } catch (e) {
        console.warn('刷新消息角标失败:', e);
    }
}

/* ---------- 5. 初始化时刷新角标 ---------- */
document.addEventListener('DOMContentLoaded', function () {
    updateNotifBadge();
});

if (document.readyState !== 'loading') {
    updateNotifBadge();
}

/* ---------- 6. 暴露全局 ---------- */
window.openQuotaView = openQuotaView;
window.closeQuotaView = closeQuotaView;
window.openMessageCenter = openMessageCenter;
window.closeMessageCenter = closeMessageCenter;
window.openMessageDetail = openMessageDetail;
window.closeMessageDetail = closeMessageDetail;
window.updateNotifBadge = updateNotifBadge;