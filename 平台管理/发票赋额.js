// ============================================================
// 发票赋额（税务管理端）- JS 基本逻辑
// 后端接口：
//   GET  /tax/apply/list?status=pending&page&size
//   POST /tax/apply/{id}/approve
//   POST /tax/apply/{id}/reject
//   GET  /tax/apply/log?page&size
// ============================================================

// ---------- 1. 全局状态 ----------
const state = {
    currentApply: null,
    applies: [],   // ✅ 改为空数组，从接口加载
    logs: [],      // ✅ 改为空数组，从接口加载
    loading: false
};

const API_BASE = 'http://192.168.0.3:10001/api';

// ---------- 2. 页面初始化 ----------
function initPage() {
    updateDate();
    loadApplies();
    loadLogs();
}

function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateEl = document.getElementById('dateDisplay');
    const updateEl = document.getElementById('updateTime');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', options);
    if (updateEl) updateEl.textContent = now.toLocaleString('zh-CN');
}

// ---------- 3. 渲染统计 ----------
// ---------- 3. 渲染统计 ----------
async function renderStats() {
    const pending = state.applies.length;
    const el1 = document.getElementById('statPending');
    const el2 = document.getElementById('statPendingChange');
    if (el1) el1.textContent = pending;
    if (el2) el2.textContent = '需及时处理';

    try {
        const res = await request.get('/tax/apply/statistics', null, { autoRedirect: false });
        if (!res || Number(res.code) !== 200 || !res.data) {
            throw new Error((res && res.message) || '统计接口异常');
        }
        const stats = res.data;

        const el3 = document.getElementById('statApprovedToday');
        const el4 = document.getElementById('statApprovedChange');
        if (el3) el3.textContent = (stats.todayAmount || 0) + '万';
        if (el4) el4.textContent = (stats.todayCount || 0) > 0
            ? `今日已处理 ${stats.todayCount} 笔`
            : '今日暂无赋额';

        const el5 = document.getElementById('statMonthlyTotal');
        const el6 = document.getElementById('statMonthlyChange');
        if (el5) el5.textContent = (stats.monthAmount || 0).toLocaleString() + '万';
        if (el6) el6.textContent = (stats.monthCount || 0) > 0
            ? `本月已处理 ${stats.monthCount} 笔`
            : '本月暂无赋额';
    } catch (e) {
        console.warn('加载统计数据失败:', e);
    }
}

// ---------- 4. 渲染待审核申请列表 ----------
function renderApplies() {
    const list = document.getElementById('applyList');
    if (!list) return;

    if (state.applies.length === 0) {
        list.innerHTML = '<li class="empty-tip"><span class="empty-icon"></span>暂无待审核申请</li>';
        return;
    }

    list.innerHTML = state.applies.map(a => `
                <li class="apply-item ${state.currentApply && state.currentApply.id === a.id ? 'active' : ''}"
                    onclick="selectApply('${a.id}')">
                    <div class="apply-avatar">${a.avatar}</div>
                    <div class="apply-content">
                        <div class="apply-title">
                            ${a.company}
                            <span class="apply-tag ${a.urgent ? 'urgent' : ''}">
                                ${a.urgent ? '加急' : a.typeText}
                            </span>
                        </div>
                        <div class="apply-meta">
                            <span>申请额度：<strong>${a.amount}万</strong></span>
                            <span>仓单ID：${a.billId}</span>
                        </div>
                        <div class="apply-meta">
                            <span class="chain-verified">链上已核验</span>
                            <span>${a.time}</span>
                        </div>
                    </div>
                    <div class="apply-actions" onclick="event.stopPropagation();">
                        <button class="btn-xs btn-view" onclick="selectApply('${a.id}')">查看</button>
                    </div>
                </li>
            `).join('');
}

// ---------- 5. 选中申请 ----------
function selectApply(applyId) {
    // ✅ 核心修复：必须用 const/let 接收 find 的结果，赋予 apply 变量
    const apply = state.applies.find(a => String(a.id) === String(applyId));

    if (!apply) {
        console.warn('未找到对应的申请记录，ID:', applyId);
        return;
    }

    state.currentApply = apply;

    document.getElementById('detailPanel').style.display = 'block';
    document.getElementById('assignEmpty').style.display = 'none';

    document.getElementById('detailCompany').textContent = apply.company;
    document.getElementById('detailStatus').textContent = '待审核';
    document.getElementById('detailApplyNo').textContent = apply.id;
    document.getElementById('detailAmount').textContent = apply.amount + ' 万元';
    document.getElementById('detailType').textContent = apply.typeText;
    document.getElementById('detailBillId').textContent = apply.billId;
    document.getElementById('detailCurrentQuota').textContent = apply.currentQuota + ' 万元';
    document.getElementById('detailCredit').textContent = apply.credit;

    document.getElementById('assignAmount').value = apply.amount;
    document.getElementById('assignType').value = apply.type === 'decrease' ? 'temporary' : apply.type;
    document.getElementById('assignComment').value = '';

    // 重新渲染列表，为了让当前选中的项高亮（active 样式）
    renderApplies();
}

// ---------- 6. 通过并赋额 ----------
function approveApply() {
    if (!state.currentApply) return;

    const amount = document.getElementById('assignAmount').value.trim();
    if (!amount || Number(amount) <= 0) {
        alert('请输入有效的核定额度');
        return;
    }

    document.getElementById('modalCompany').textContent = state.currentApply.company;
    document.getElementById('modalAmount').textContent = amount + ' 万元';
    document.getElementById('modalType').textContent =
        document.getElementById('assignType').value === 'temporary' ? '临时额度' : '永久额度';

    openModal('confirmModal');
}

// ---------- 7. 确认赋额 ----------
async function confirmApprove() {
    closeModal('confirmModal');
    if (!state.currentApply) return;

    const amount = document.getElementById('assignAmount').value.trim();
    const quotaType = document.getElementById('assignType').value;
    const comment = document.getElementById('assignComment').value.trim();
    const company = state.currentApply.company;
    const applyId = state.currentApply.id;

    try {
        const res = await request.post('/tax/apply/' + applyId + '/approve', {
            amount: Number(amount),
            quotaType: quotaType,
            comment: comment
        }, { autoRedirect: false });

        if (!res || Number(res.code) !== 200) {
            throw new Error((res && res.message) || '赋额失败');
        }

        state.applies = state.applies.filter(a => String(a.id) !== String(applyId));

        state.logs.unshift({
            id: Date.now(),
            action: 'approved',
            title: '赋额通过',
            desc: `${company} · 核定 ${amount}万`,
            time: nowStr()
        });

        // ✅ 保存赋额记录（供统计使用）
        saveQuotaRecord(company, amount, quotaType);

        renderStats();
        renderApplies();
        renderLogs();
        resetDetailPanel();

        showResult('success', '✅ 赋额成功', `已为 ${company} 核定发票额度 ${amount} 万元。`);
    } catch (e) {
        console.error('赋额失败:', e);
        showResult('reject', '赋额失败', e.message || '请稍后重试');
    }
}

// ---------- 8. 打开驳回弹窗 ----------
function openRejectModal() {
    if (!state.currentApply) return;

    document.getElementById('rejectCompany').textContent = state.currentApply.company;
    document.getElementById('rejectReason').value = '';
    openModal('rejectModal');
}

// ---------- 9. 确认驳回 ----------
async function confirmReject() {
    closeModal('rejectModal');
    if (!state.currentApply) return;

    const company = state.currentApply.company;
    const applyId = state.currentApply.id;
    const reason = document.getElementById('rejectReason').value.trim() || '未填写原因';

    try {
        const res = await request.post('/tax/apply/' + applyId + '/reject', {
            reason: reason
        }, { autoRedirect: false });

        if (!res || Number(res.code) !== 200) {
            throw new Error((res && res.message) || '驳回失败');
        }

        state.applies = state.applies.filter(a => String(a.id) !== String(applyId));

        state.logs.unshift({
            id: Date.now(),
            action: 'rejected',
            title: '申请驳回',
            desc: `${company} · ${reason}`,
            time: nowStr()
        });

        renderStats();
        renderApplies();
        renderLogs();
        resetDetailPanel();

        showResult('reject', '已驳回', `已驳回 ${company} 的额度调整申请。`);
    } catch (e) {
        console.error('驳回失败:', e);
        showResult('reject', '驳回失败', e.message || '请稍后重试');
    }
}

// ---------- 10. 重置详情面板 ----------
function resetDetailPanel() {
    state.currentApply = null;
    document.getElementById('detailPanel').style.display = 'none';
    document.getElementById('assignEmpty').style.display = 'block';
}

// ---------- 11. 渲染操作记录 ----------
function renderLogs() {
    const list = document.getElementById('assignLog');
    if (!list) return;

    if (state.logs.length === 0) {
        list.innerHTML = '<li class="empty-tip">暂无操作记录</li>';
        return;
    }

    const iconMap = {
        approved: { icon: '✅', cls: 'approved' },
        rejected: { icon: '✕', cls: 'rejected' },
        adjusted: { icon: '📝', cls: 'adjusted' }
    };

    list.innerHTML = state.logs.map(l => {
        const m = iconMap[l.action] || iconMap.adjusted;
        return `
                    <li class="log-item">
                        <div class="log-icon ${m.cls}">${m.icon}</div>
                        <div class="log-content">
                            <div class="log-title">${l.title}</div>
                            <div class="log-desc">${l.desc}</div>
                        </div>
                        <div class="log-time">${l.time}</div>
                    </li>
                `;
    }).join('');
}

// ---------- 12. 弹窗统一控制 ----------
function openModal(id) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('show');
    });
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    }
});

// ---------- 13. 结果提示 ----------
function showResult(type, title, msg) {
    const icon = document.getElementById('resultIcon');
    icon.className = 'modal-icon ' + (type === 'success' ? 'success' : 'reject');
    icon.textContent = type === 'success' ? '' : '✕';
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMsg').textContent = msg;
    openModal('resultModal');
}

// ---------- 14. 工具函数 ----------
function nowStr() {
    return new Date().toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

// ---------- 15. 其他 ----------
function viewAllApplies() {
    alert('查看全部申请功能开发中');
}

// ✅ 修改：设置页跳 设置.html（原来只弹 alert）
function handleSettings() {
    window.location.href = '设置.html';
}

// ✅ 修改：退出登录清 current_user，跳平台管理登录页
function handleLogout() {
    if (confirm('确定退出登录？')) {
        localStorage.removeItem('token');
        localStorage.removeItem('current_user');
        window.location.href = '登录-平台管理.html';
    }
}

// ---------- 16. 启动 ----------
document.addEventListener('DOMContentLoaded', initPage);


// ============================================================
// 【新增】接口对接：待审核列表 / 操作记录
// 不改动上方任何逻辑，仅追加
// ============================================================

function mapApplyFromApi(item) {
    const company = item.company || item.companyName || '未知企业';
    return {
        id: item.id || item.applyId || '--',
        company: company,
        avatar: company ? company.charAt(0) : '企',
        amount: item.amount != null ? Number(item.amount) : 0,
        currentQuota: item.currentQuota != null ? Number(item.currentQuota) : 0,
        type: item.quotaType || item.type || 'temporary',
        typeText: item.typeText || (
            item.quotaType === 'permanent' ? '永久调增'
                : item.quotaType === 'decrease' ? '调减'
                    : '临时调增'
        ),
        billId: item.billId || item.certId || '--',
        credit: item.credit || '--',
        urgent: !!item.urgent,
        time: item.time || item.createTime || '--',
        chainVerified: item.chainVerified !== false,
        status: item.status || 'pending'
    };
}

function mapLogFromApi(item) {
    return {
        id: item.id || Date.now() + Math.random(),
        action: item.action || 'adjusted',
        title: item.title || '额度调整',
        desc: item.desc || '',
        time: item.time || item.createTime || '--'
    };
}

async function loadApplies() {
    const list = document.getElementById('applyList');
    if (list) list.innerHTML = '<li class="empty-tip">加载中...</li>';

    try {
        const res = await request.get('/tax/apply/list', {
            status: 0,
            page: 1,
            size: 50
        }, { autoRedirect: false });

        if (!res || Number(res.code) !== 200) {
            throw new Error((res && res.message) || '加载申请失败');
        }

        const data = res.data || {};
        const rawList = data.list || data || [];

        state.applies = rawList.map(mapApplyFromApi);
        renderStats();
        renderApplies();
    } catch (e) {
        console.error('加载申请失败:', e);
        state.applies = [];
        renderStats();
        if (list) {
            list.innerHTML = `<li class="empty-tip">加载失败：${e.message}</li>`;
        }
    }
}

async function loadLogs() {
    const list = document.getElementById('assignLog');
    if (list) list.innerHTML = '<li class="empty-tip">加载中...</li>';

    try {
        const res = await request.get('/tax/apply/log', {
            page: 1,
            size: 50
        }, { autoRedirect: false });

        if (!res || Number(res.code) !== 200) {
            throw new Error((res && res.message) || '加载记录失败');
        }

        const data = res.data || {};
        const rawList = data.list || data || [];

        state.logs = rawList.map(mapLogFromApi);
        renderLogs();
    } catch (e) {
        console.error('加载记录失败:', e);
        state.logs = [];
        if (list) {
            list.innerHTML = `<li class="empty-tip">加载失败：${e.message}</li>`;
        }
    }
}

// ✅ 暴露全局（便于手动刷新）
window.loadApplies = loadApplies;
window.loadLogs = loadLogs;


// ============================================================
// 【新增】为缺少 billId 的申请生成唯一数字仓单ID
// 调用接口：POST /tax/apply/{id}/genBillId
// 不改动上方任何逻辑，仅追加
// ============================================================

/**
 * 为单条申请生成 billId
 * 后端返回：{ code: 200, data: { billId: 'HTL-20260926-12345' } }
 */
async function genBillIdForApply(applyId) {
    try {
        const res = await request.post('/tax/apply/' + applyId + '/genBillId', null, { autoRedirect: false });
        if (res && Number(res.code) === 200 && res.data && res.data.billId) {
            return res.data.billId;
        }
        return null;
    } catch (e) {
        console.warn('生成仓单ID失败:', e);
        return null;
    }
}

/**
 * 扫描 state.applies，为缺失 billId 的申请生成
 */
async function ensureAllBillIds() {
    if (!Array.isArray(state.applies) || state.applies.length === 0) return;

    const needGen = state.applies.filter(a => !a.billId || a.billId === '--');
    if (needGen.length === 0) return;

    // 并行生成
    const results = await Promise.all(
        needGen.map(async (a) => {
            const billId = await genBillIdForApply(a.id);
            if (billId) a.billId = billId;
            return a;
        })
    );

    // 重新渲染
    renderApplies();
}

/**
 * 包装原 loadApplies：拉完列表后自动补 billId
 */
(function wrapLoadApplies() {
    const originalLoadApplies = window.loadApplies;
    if (typeof originalLoadApplies !== 'function') return;

    window.loadApplies = async function () {
        await originalLoadApplies.apply(this, arguments);
        await ensureAllBillIds();
    };
})();

// 暴露全局
window.genBillIdForApply = genBillIdForApply;
window.ensureAllBillIds = ensureAllBillIds;


// ============================================================
// 【新增】赋额统计：基于 localStorage 实时计算
// ============================================================

/**
 * 从 localStorage 读取所有赋额记录，计算今日和本月统计
 */
function calculateQuotaStats() {
    let records = [];
    try {
        records = JSON.parse(localStorage.getItem('quota_records') || '[]');
    } catch (e) {
        records = [];
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let todayAmount = 0, todayCount = 0;
    let monthAmount = 0, monthCount = 0;

    records.forEach(r => {
        if (!r || !r.time || !r.amount) return;
        const amount = Number(r.amount) || 0;
        const datePart = String(r.time).substring(0, 10); // '2026-09-28'
        const monthPart = String(r.time).substring(0, 7); // '2026-09'

        if (datePart === todayStr) {
            todayAmount += amount;
            todayCount++;
        }
        if (monthPart === monthStr) {
            monthAmount += amount;
            monthCount++;
        }
    });

    return {
        todayAmount: Number(todayAmount.toFixed(2)),
        todayCount,
        monthAmount: Number(monthAmount.toFixed(2)),
        monthCount
    };
}

/**
 * 保存一条赋额记录（通过时调用）
 * @param {string} company 企业名称
 * @param {number} amount 核定额度（万元）
 * @param {string} quotaType 额度类型
 */
function saveQuotaRecord(company, amount, quotaType) {
    let records = [];
    try {
        records = JSON.parse(localStorage.getItem('quota_records') || '[]');
    } catch (e) {
        records = [];
    }
    records.push({
        company: company,
        amount: Number(amount),
        quotaType: quotaType,
        time: nowStr()  // '2026-09-28 19:20'
    });
    localStorage.setItem('quota_records', JSON.stringify(records));
}

// 暴露全局
window.calculateQuotaStats = calculateQuotaStats;
window.saveQuotaRecord = saveQuotaRecord;