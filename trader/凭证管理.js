// ============================================================
// 凭证管理（贸易商）
// 后端: GET /order/list?page&size&keyword
//       GET /order/{id}
//       GET /order/count
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

// 安全 DOM 工具
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

const listView = document.getElementById('listView');
const detailView = document.getElementById('detailView');
const backBtn = document.getElementById('backBtn');
const pageTitle = document.getElementById('pageTitle');

const tbody = document.getElementById('tableBody');
const totalCount = document.getElementById('totalCount');
const recordCount = document.getElementById('recordCount');
const pageInfo = document.getElementById('pageInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');
const filterTabs = document.querySelectorAll('#filterTabs .tab');

const statTotal = document.getElementById('statTotal');
const statPass = document.getElementById('statPass');
const statPending = document.getElementById('statPending');
const statError = document.getElementById('statError');

const detailCertId = document.getElementById('detailCertId');
const detailTradeId = document.getElementById('detailTradeId');
const detailGoodsType = document.getElementById('detailGoodsType');
const detailParticipants = document.getElementById('detailParticipants');
const detailTxHash = document.getElementById('detailTxHash');
const detailCreateTime = document.getElementById('detailCreateTime');
const detailVerifyResult = document.getElementById('detailVerifyResult');
const detailStatus = document.getElementById('detailStatus');

let currentPage = 1;
let pageSize = 8;
let currentFilter = 'all';
let currentKeyword = '';
let currentCertId = null;

// ✅ 新增：当前详情数据缓存（用于推送）
let currentDetailData = null;

function formatTime(iso) {
    if (!iso) return '--';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch { return iso; }
}

function mapOrderToCert(order) {
    const status = order.orderStatus;
    return {
        id: order.orderNo || order.id || '--',
        orderId: order.id,
        tradeId: order.orderNo || order.id || '--',
        cargo: order.goodsName || '--',
        amount: order.tradePrice != null ? order.tradePrice : '--',
        holder: order.sellerUserId != null ? ('用户#' + order.sellerUserId) : '--',
        status: status !== undefined ? (ORDER_STATUS_TEXT[status] || '未知') : '待入库',
        statusCode: status,
        chainTime: formatTime(order.createTime || order.updateTime),
        txHash: order.txHash || '--',
        participants: order.sellerUserId != null ? ['用户#' + order.sellerUserId] : [],
        _raw: order
    };
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const existing = container.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type) toast.classList.add(type);
    toast.textContent = msg;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function showListView() {
    if (listView) listView.style.display = 'block';
    if (detailView) detailView.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    if (pageTitle) pageTitle.textContent = '凭证管理';
}

function showDetailView(certId) {
    if (listView) listView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';
    if (backBtn) backBtn.style.display = 'inline-flex';
    if (pageTitle) pageTitle.textContent = '凭证详情';
    loadCertDetail(certId);
}

function goToListView() {
    showListView();
    loadData();
}

// ============================================================
// 统计（✅ 用 request）
// ============================================================
async function fetchStats() {
    try {
        const data = await request.get('/order/list', { page: 1, size: 1000 }, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '统计接口异常');
        }
        const list = data.data?.list || [];
        const total = data.data?.total || list.length;

        let passCount = 0, pendingCount = 0, errorCount = 0;
        list.forEach(o => {
            if (o.orderStatus === 2) passCount++;
            else pendingCount++;
        });

        return { totalCert: total, passCount, pendingCount, errorCount };
    } catch (e) {
        console.warn('统计接口不可用:', e);
        return { totalCert: 0, passCount: 0, pendingCount: 0, errorCount: 0 };
    }
}

// ============================================================
// 凭证列表（✅ 用 request）
// ============================================================
async function fetchCertificates(params) {
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
    const total = result.total != null ? result.total : list.length;

    return {
        list: list.map(mapOrderToCert),
        total: total,
        page: result.page || params.page || 1,
        size: result.size || params.size || pageSize
    };
}

// ============================================================
// 凭证详情（✅ 用 request）
// ============================================================
async function fetchCertDetail(certId) {
    const data = await request.get('/order/' + certId, null, { autoRedirect: false });
    if (!data || Number(data.code) !== 200 || !data.data) {
        throw new Error((data && data.message) || '未找到凭证：' + certId);
    }

    const order = data.data;
    const cert = mapOrderToCert(order);

    return {
        id: cert.id,
        tradeId: cert.tradeId,
        cargo: cert.cargo,
        participants: cert.participants,
        txHash: cert.txHash,
        chainTime: cert.chainTime,
        createTime: formatTime(order.createTime),
        verifyResult: {
            pass: order.orderStatus === 2 ? 1 : 0,
            total: 1
        },
        status: cert.status,
        statusCode: cert.statusCode,
        warehouse: order.warehouseAddr || '',
        quantity: order.goodsNum || '',
        unit: order.unit || '',
        remarks: order.contractContent || ''
    };
}

function renderTable(data) {
    if (!tbody) return;

    const list = data.list || [];
    const total = data.total || 0;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-inbox"></i>暂无凭证数据</td></tr>';
    } else {
        tbody.innerHTML = list.map(item => {
            const sc = ORDER_STATUS_CLASS[item.statusCode] || 'pending';
            return `
                <tr>
                    <td><strong>${item.id || '--'}</strong></td>
                    <td>${item.cargo || '--'}</td>
                    <td>${item.amount || '--'}</td>
                    <td>${item.holder || '--'}</td>
                    <td><span class="status-badge ${sc}">${item.status || '待入库'}</span></td>
                    <td style="font-size:12px;color:#6f8aa8;">${item.chainTime || '--'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="viewCert('${item.orderId}')"><i class="fas fa-eye"></i> 查看</button>
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

async function loadData() {
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-spinner">加载中...</td></tr>';

    try {
        const params = {
            status: currentFilter,
            keyword: currentKeyword,
            page: currentPage,
            size: pageSize
        };
        // ✅ allSettled
        const results = await Promise.allSettled([
            fetchStats(),
            fetchCertificates(params)
        ]);

        const stats = results[0].status === 'fulfilled'
            ? results[0].value
            : { totalCert: 0, passCount: 0, pendingCount: 0, errorCount: 0 };

        if (results[1].status !== 'fulfilled') {
            throw results[1].reason || new Error('加载失败');
        }
        const listData = results[1].value;

        setText('statTotal', stats.totalCert || 0);
        setText('statPass', stats.passCount || 0);
        setText('statPending', stats.pendingCount || 0);
        setText('statError', stats.errorCount || 0);

        renderTable(listData);
    } catch (e) {
        console.error('加载数据失败:', e);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="no-data">数据加载失败: ${e.message}</td></tr>`;
        showToast('数据加载失败: ' + e.message, 'error');
    }
}

async function loadCertDetail(certId) {
    if (!certId) return;
    setText('detailCertId', '加载中...');
    setText('detailStatus', '加载中');

    try {
        const data = await fetchCertDetail(certId);
        setText('detailCertId', data.id || '--');
        setText('detailTradeId', data.tradeId || '--');
        setText('detailGoodsType', data.cargo || '--');

        const participantsEl = document.getElementById('detailParticipants');
        if (participantsEl) {
            if (data.participants && data.participants.length > 0) {
                participantsEl.innerHTML = data.participants.map(p =>
                    `<span class="participant"><i class="fas fa-building"></i> ${p}</span>`
                ).join(' ');
            } else {
                participantsEl.textContent = '--';
            }
        }

        setText('detailTxHash', data.txHash || '--');
        setText('detailCreateTime', data.chainTime || data.createTime || '--');

        const vr = document.getElementById('detailVerifyResult');
        if (vr) {
            if (data.verifyResult) {
                const passCount = data.verifyResult.pass || 0;
                const totalCount_ = data.verifyResult.total || 0;
                const isAllPass = passCount === totalCount_ && totalCount_ > 0;
                vr.textContent = isAllPass ?
                    `全部通过 (${passCount}/${totalCount_})` :
                    `${passCount}/${totalCount_} 通过`;
                vr.style.color = isAllPass ? '#2ecc71' : '#f39c12';
            } else {
                vr.textContent = '--';
            }
        }

        if (detailStatus) {
            const sc = ORDER_STATUS_CLASS[data.statusCode] || 'pending';
            detailStatus.textContent = data.status || '待入库';
            detailStatus.className = 'status-badge ' + sc;
        }

        currentCertId = certId;
        // ✅ 新增：缓存详情数据，供推送使用
        currentDetailData = data;
    } catch (e) {
        console.error('加载凭证详情失败:', e);
        setText('detailCertId', '加载失败');
        if (detailStatus) {
            detailStatus.textContent = '错误';
            detailStatus.className = 'status-badge error';
        }
        showToast('加载凭证详情失败: ' + e.message, 'error');
    }
}

function viewCert(certId) {
    if (!certId) return;
    showDetailView(certId);
}

function doSearch() {
    currentKeyword = searchInput ? searchInput.value.trim() : '';
    currentPage = 1;
    loadData();
}

function resetSearch() {
    if (searchInput) searchInput.value = '';
    currentKeyword = '';
    currentFilter = 'all';
    currentPage = 1;
    filterTabs.forEach(t => t.classList.remove('active'));
    const allTab = document.querySelector('#filterTabs .tab[data-filter="all"]');
    if (allTab) allTab.classList.add('active');
    loadData();
    showToast('已重置筛选条件', '');
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
filterTabs.forEach(tab => {
    tab.addEventListener('click', function () {
        filterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        currentPage = 1;
        loadData();
    });
});

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

window.viewCert = viewCert;
window.goToListView = goToListView;
window.showToast = showToast;

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const certId = urlParams.get('id');

    if (certId) {
        showDetailView(certId);
    } else {
        showListView();
        await Promise.allSettled([fetchCompanyInfo(), loadData()]);
    }
    console.log('凭证管理已启动 (API: ' + API_BASE + ')');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


// ============================================================
// 【新增】税务对接：推送申请 / 额度查看 / 消息中心
// 不改动上方任何逻辑，仅追加
// ============================================================

/* ---------- 1. 推送单证到税务端 ---------- */

/**
 * 推送当前详情页的单证到税务端「发票赋额」
 * 调用接口：POST /tax/apply
 */
async function pushCertToTax() {
    if (!currentDetailData) {
        showToast('缺少凭证数据，请先打开凭证详情', 'error');
        return;
    }

    const payload = {
        certId: currentDetailData.id,
        tradeId: currentDetailData.tradeId,
        company: getCurrentCompanyName(),
        cargo: currentDetailData.cargo,
        amount: currentDetailData.amount,
        warehouse: currentDetailData.warehouse,
        quantity: currentDetailData.quantity,
        txHash: currentDetailData.txHash,
        reason: '贸易商推送，申请发票赋额'
    };

    try {
        const res = await request.post('/tax/apply', payload, { autoRedirect: false });
        if (res && Number(res.code) === 200) {
            showToast('已推送至税务端发票赋额待审核', 'success');
        } else {
            showToast('推送失败：' + ((res && res.message) || '未知错误'), 'error');
        }
    } catch (e) {
        console.error('推送失败:', e);
        showToast('推送失败：' + e.message, 'error');
    }
}

function getCurrentCompanyName() {
    try {
        const user = JSON.parse(localStorage.getItem('current_user') || 'null');
        return (user && user.companyName) || '未知企业';
    } catch {
        return '未知企业';
    }
}

/* ---------- 2. 发票额度查看 ---------- */

/**
 * 打开额度查看弹窗
 * 调用接口：GET /tax/quota/me
 */
async function openQuotaView() {
    const modal = document.getElementById('quotaModal');
    const body = document.getElementById('quotaBody');
    if (!modal || !body) return;

    // 先显示加载
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

    // ✅ 核心修复：使用后端真实返回的 availableAmount 和 usedAmount
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

/* ---------- 3. 消息中心 ---------- */

/**
 * ✅ 核心修复：通过解析 content 文本判断消息状态
 */
function isMessageApproved(msg) {
    const contentText = msg.content || '';
    // 如果文本包含"驳回"二字，则为驳回；否则视为通过
    return !contentText.includes('驳回');
}

/**
 * 打开消息中心
 * 调用接口：GET /tax/message/list
 */
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

        // ✅ 提取消息列表（兼容 data.list 和 data 数组）
        let messages = [];
        if (res.data && Array.isArray(res.data.list)) {
            messages = res.data.list;
        } else if (Array.isArray(res.data)) {
            messages = res.data;
        } else {
            console.warn('无法识别的数据结构:', res.data);
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
        // ✅ 通过 content 文本判断状态
        const isApproved = isMessageApproved(m);
        const contentText = m.content || '';

        // ✅ 提取 ID 和 时间
        const msgId = m.id || m.msgId || m.messageId || Date.now();
        const time = m.createTime || m.time || m.gmtCreate || '--';

        // ✅ 尝试从 content 里提取仓单号（正则匹配 BILL 开头的数字）
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
                        <div class="msg-desc">
                            ${contentText || '无详细内容'}
                        </div>
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

/* ---------- 4. 消息详情 ---------- */

/**
 * 打开消息详情
 * 调用接口：POST /tax/message/{id}/read
 */
async function openMessageDetail(msgId) {
    if (!msgId) return;

    // 标记已读（不阻塞展示）
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

        // ✅ 超级兼容查找：只要 ID 对得上就行
        const msg = messages.find(m => {
            const idFields = [m.id, m.msgId, m.messageId, m.noticeId, m.applyId];
            return idFields.some(id => String(id) === String(msgId));
        });

        if (!msg) {
            throw new Error('未找到该消息');
        }
        renderMessageDetail(msg);
    } catch (e) {
        console.error('加载消息详情失败:', e);
        body.innerHTML = `<div style="text-align:center;padding:2rem;color:#b33a3a;">加载失败：${e.message}</div>`;
    }
}

function renderMessageDetail(msg) {
    const body = document.getElementById('messageDetailBody');
    if (!body) return;

    // ✅ 核心修改：通过 content 文本判断是否通过
    const isApproved = isMessageApproved(msg);
    const contentText = msg.content || '';

    // 提取时间
    const time = msg.createTime || msg.time || '--';

    // 尝试从 content 提取仓单号
    const billMatch = contentText.match(/BILL\d+/);
    const certId = billMatch ? billMatch[0] : '--';

    // 尝试从 content 提取驳回原因（如果有）
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

/* ---------- 5. 消息角标 ---------- */

/**
 * 刷新顶栏消息角标（未读数）
 * 调用接口：GET /tax/message/list
 */
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

/* ---------- 6. 覆盖详情页「推送」按钮行为 ---------- */

// 用事件委托拦截「推送」按钮，改为调接口
document.addEventListener('click', function (e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const text = btn.textContent || '';

    // 匹配「推送」按钮（排除「推送记录」）
    if (text.includes('推送') && !text.includes('记录')) {
        // 阻止原来的 showToast
        e.stopImmediatePropagation();
        e.preventDefault();
        pushCertToTax();
    }
}, true);  // 使用捕获阶段，确保先于原 onclick 执行

/* ---------- 7. 页面初始化时刷新角标 ---------- */

document.addEventListener('DOMContentLoaded', function () {
    updateNotifBadge();
});

if (document.readyState !== 'loading') {
    updateNotifBadge();
}

/* ---------- 8. 暴露全局 ---------- */

window.pushCertToTax = pushCertToTax;
window.openQuotaView = openQuotaView;
window.closeQuotaView = closeQuotaView;
window.openMessageCenter = openMessageCenter;
window.closeMessageCenter = closeMessageCenter;
window.openMessageDetail = openMessageDetail;
window.closeMessageDetail = closeMessageDetail;
window.updateNotifBadge = updateNotifBadge;