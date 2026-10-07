// ============================================================
// 首页（贸易商）
// 后端: GET /order/count
//       GET /order/list?page&size&keyword&orderStatus
//       DELETE /order/{id}  （删除订单，需根据后端实际路径调整）
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

const ORDER_STATUS_TEXT = {
    0: '待入库',
    3: '已入库',
    1: '运输中',
    2: '已签收'
};
const ORDER_STATUS_CLASS = {
    0: 'pending',
    3: 'info',
    1: 'info',
    2: 'success'
};

// ✅ 全局安全赋值工具：元素不存在就跳过，不报错
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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

function setLoading(loading) {
    const btn = document.getElementById('searchBtn');
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></span> 查询中...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> 查询';
    }
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
// 统计（✅ 用 request）
// ============================================================
async function fetchStats() {
    try {
        const data = await request.get('/order/count', null, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '统计接口异常');
        }
        const total = data.data || 0;

        setText('statTodayOnChain', total);
        setText('statTodaySub', '订单总数');
        setText('statTotalCert', total.toLocaleString());
        setText('statTotalSub', '累计订单 ' + total + ' 条');
        setText('statNodes', '--');
        setText('statNodesSub', '后端暂未提供');
        setText('statVerifyPass', '--');
        setText('statPassSub', '后端暂未提供');
        return { total };
    } catch (e) {
        console.warn('获取统计数据失败:', e);
        setText('statTodayOnChain', 0);
        setText('statTodaySub', '加载失败');
        setText('statTotalCert', '0');
        setText('statTotalSub', '加载失败');
        setText('statNodes', '--');
        setText('statNodesSub', '--');
        setText('statVerifyPass', '--');
        setText('statPassSub', '--');
        return null;
    }
}

// ============================================================
// 交易列表（✅ 用 request）
// ============================================================
async function fetchTransactions(params) {
    const query = {
        page: 1,
        size: 200
    };
    if (params.keyword) query.keyword = params.keyword;

    const data = await request.get('/order/list', query, { autoRedirect: false });
    if (!data || Number(data.code) !== 200) {
        throw new Error((data && data.message) || '查询失败');
    }

    const list = data.data?.list || [];

    // 后端记录 -> 统一结构
    const backendRows = list.map(item => ({
        id: item.orderNo || ('ORD' + item.id),
        orderId: item.id,
        category: item.goodsName || '--',
        amount: item.tradePrice || '--',
        counterparty: item.sellerUserId != null ? ('用户#' + item.sellerUserId) : '--',
        warehouse: item.warehouseAddr || '--',
        status: ORDER_STATUS_TEXT[item.orderStatus] || '待入库',
        orderStatus: item.orderStatus,
        createdAt: item.createTime,
        txHash: item.txHash
    }));

    // 合并本地新增记录（新增交易页写入的缓存）
    let localRows = [];
    try {
        localRows = JSON.parse(localStorage.getItem('home_new_trades') || '[]');
    } catch (e) { localRows = []; }

    const seen = new Set(backendRows.map(r => r.id));
    const localMapped = localRows
        .filter(r => r && r.id && !seen.has(r.id))
        .map(r => ({
            id: r.id,
            orderId: r.orderId,
            category: r.category || '--',
            amount: r.amount || '--',
            counterparty: r.counterparty || '--',
            warehouse: r.warehouse || '--',
            status: r.status || '待入库',
            orderStatus: r.orderStatus,
            createdAt: r.createdAt || r.createTime,
            txHash: r.txHash || ''
        }));

    const merged = backendRows.concat(localMapped);

    // 本地二次筛选（category / warehouse / date / keyword）
    return merged.filter(item => {
        if (params.category && !(item.category || '').toLowerCase().includes(params.category.toLowerCase())) return false;
        if (params.warehouse && !(item.warehouse || '').toLowerCase().includes(params.warehouse.toLowerCase())) return false;
        if (params.date) {
            const t = item.createdAt || '';
            if (!String(t).startsWith(params.date)) return false;
        }
        if (params.keyword) {
            const kw = params.keyword.trim().toLowerCase();
            const text = `${item.id || ''} ${item.category || ''} ${item.counterparty || ''}`.toLowerCase();
            if (!text.includes(kw)) return false;
        }
        return true;
    });
}

// ✅ 已加判空保护，缺 id 也不崩
async function fetchCompanyInfo() {
    const user = JSON.parse(localStorage.getItem('current_user') || 'null');
    if (user) {
        setText('companyName', user.companyName || '企业用户');
        setText('avatarText', (user.companyName || '企').charAt(0));
        setText('notifBadge', 0);
    } else {
        setText('companyName', '未登录');
        setText('avatarText', '?');
        setText('notifBadge', 0);
    }
    return user;
}

function renderTransactions(data) {
    const tbody = document.getElementById('tableBody');
    const countEl = document.getElementById('recordCount');

    if (!tbody) {
        console.warn('[首页] 缺少 #tableBody，跳过渲染');
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-inbox"></i>暂无交易记录</td></tr>';
        if (countEl) countEl.textContent = '共 0 条';
        return;
    }

    tbody.innerHTML = data.map(item => {
        const sc = ORDER_STATUS_CLASS[item.orderStatus] || 'pending';
        return `
            <tr>
                <td><strong>${item.id || '--'}</strong></td>
                <td>${item.category || '--'}</td>
                <td>${item.amount || '--'}</td>
                <td>${item.counterparty || '--'}</td>
                <td><span class="status-badge ${sc}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="deleteOrder('${item.orderId || ''}', '${item.id || ''}')"><i class="fas fa-trash-alt"></i> 删除</button>
                </td>
            </tr>
        `;
    }).join('');

    if (countEl) countEl.textContent = '共 ' + data.length + ' 条';
}

// ============================================================
// 删除订单（✅ 调用后端接口）
// ============================================================
async function deleteOrder(orderId, orderNo) {
    if (!orderId || orderId === 'undefined') {
        showToast('无法删除：缺少订单ID', 'error');
        return;
    }

    const displayName = orderNo || orderId;
    if (!confirm(`确定要删除订单【${displayName}】吗？删除后不可恢复。`)) {
        return;
    }

    try {
        // ⚠️ 请根据你后端真实的删除接口路径调整这里
        // 常见路径：
        //   DELETE /order/{id}
        //   POST /order/{id}/delete
        //   POST /order/delete  (body: { id })
        const res = await request.delete('/order/' + orderId, null, { autoRedirect: false });

        if (!res || Number(res.code) !== 200) {
            throw new Error((res && res.message) || '删除失败');
        }

        showToast('订单已删除', 'success');

        // 清理本地缓存（防止刷新后本地记录重新出现）
        try {
            let localRows = JSON.parse(localStorage.getItem('home_new_trades') || '[]');
            localRows = localRows.filter(r => String(r.orderId) !== String(orderId) && String(r.id) !== String(orderNo));
            localStorage.setItem('home_new_trades', JSON.stringify(localRows));
        } catch (e) { console.warn('清理本地缓存失败:', e); }

        // 刷新列表
        await doSearch();

    } catch (e) {
        console.error('删除订单失败:', e);
        showToast('删除失败：' + e.message, 'error');
    }
}

window.deleteOrder = deleteOrder;

async function doSearch() {
    const params = {
        category: document.getElementById('filterCategoryInput')?.value.trim() || '',
        status: document.getElementById('filterStatusInput')?.value.trim() || '',
        warehouse: document.getElementById('filterWarehouseInput')?.value.trim() || '',
        keyword: document.getElementById('searchKeyword')?.value || '',
        date: document.getElementById('searchDate')?.value || ''
    };

    setLoading(true);
    try {
        const data = await fetchTransactions(params);
        renderTransactions(data);
        if (data && data.length > 0) {
            showToast('查询完成，共 ' + data.length + ' 条记录', 'success');
        } else {
            showToast('未找到匹配的交易记录', '');
        }
    } catch (e) {
        showToast('查询失败: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

function resetFilters() {
    ['filterCategoryInput', 'filterStatusInput', 'filterWarehouseInput', 'searchKeyword', 'searchDate']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    showToast('已重置筛选条件', '');
    doSearch();
}

// ============================================================
// 初始化
// ============================================================
async function init() {
    const tbody = document.getElementById('tableBody');
    if (tbody) tbody.innerHTML = '';

    await Promise.allSettled([fetchStats(), fetchCompanyInfo()]);
    await doSearch();
    console.log('核验 · 首页已启动 (API: ' + API_BASE + ')');
}

const searchBtn = document.getElementById('searchBtn');
if (searchBtn) searchBtn.addEventListener('click', doSearch);

const searchKeyword = document.getElementById('searchKeyword');
if (searchKeyword) {
    searchKeyword.addEventListener('keyup', e => {
        if (e.key === 'Enter') doSearch();
    });
}

const filterCategoryInput = document.getElementById('filterCategoryInput');
if (filterCategoryInput) {
    filterCategoryInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') doSearch();
    });
}

const filterStatusInput = document.getElementById('filterStatusInput');
if (filterStatusInput) {
    filterStatusInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') doSearch();
    });
}

const filterWarehouseInput = document.getElementById('filterWarehouseInput');
if (filterWarehouseInput) {
    filterWarehouseInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') doSearch();
    });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) resetBtn.addEventListener('click', resetFilters);

const addTradeBtn = document.getElementById('addTradeBtn');
if (addTradeBtn) {
    addTradeBtn.addEventListener('click', function () {
        window.location.href = '新增交易.html';
    });
}

const sd = document.getElementById('searchDate');
if (sd) sd.addEventListener('change', doSearch);

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