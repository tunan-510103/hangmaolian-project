// ============================================================
// 存证管理（贸易商）
// 后端: POST /warehouse/bill/create
//       POST /warehouse/bill/sync/{id}
// ============================================================
(function () {
    'use strict';

    const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

    const docType = document.getElementById('docType');
    const contractNo = document.getElementById('contractNo');
    const goodsType = document.getElementById('goodsType');
    const quantity = document.getElementById('quantity');
    const warehouse = document.getElementById('warehouse');
    const remarks = document.getElementById('remarks');

    const generateBtn = document.getElementById('generateBtn');
    const chainBtn = document.getElementById('chainBtn');
    const resetBtn = document.getElementById('resetBtn');

    const certIdDisplay = document.getElementById('certIdDisplay');
    const certStatus = document.getElementById('certStatus');
    const certTimeDisplay = document.getElementById('certTimeDisplay');

    const fileInput = document.getElementById('fileInput');
    const fileDropArea = document.getElementById('fileDropArea');
    const fileMainHint = document.getElementById('fileMainHint');
    const fileSubHint = document.getElementById('fileSubHint');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    let currentCertId = null;
    let isGenerated = false;
    let uploadedFile = null;
    let createdBillId = null;

    function showToast(msg, type) {
        const container = document.getElementById('toastContainer');
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

    function generateCertId() {
        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return 'WB' + dateStr + rand;
    }

    function getCurrentTime() {
        const now = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
    }

    function validateForm() {
        const fields = [
            { el: contractNo, name: '合同编号' },
            { el: goodsType, name: '货物品类' },
            { el: quantity, name: '数量' },
            { el: warehouse, name: '仓库位置' }
        ];
        for (let f of fields) {
            if (!f.el.value.trim()) {
                showToast('请填写 ' + f.name, 'warning');
                f.el.focus();
                return false;
            }
        }
        return true;
    }

    function updateCertPreview(certId, time) {
        certIdDisplay.textContent = certId || '--';
        certTimeDisplay.textContent = time || '--';
        if (certId) {
            certStatus.textContent = '已生成';
            certStatus.style.background = '#d4edda';
            certStatus.style.color = '#1e6b3b';
            isGenerated = true;
            chainBtn.disabled = false;
        } else {
            certStatus.textContent = '待生成';
            certStatus.style.background = '#fff3cd';
            certStatus.style.color = '#856404';
            isGenerated = false;
            chainBtn.disabled = true;
        }
    }

    function handleGenerate() {
        if (!validateForm()) return;
        const certId = generateCertId();
        currentCertId = certId;
        updateCertPreview(certId, getCurrentTime());
        showToast('凭证已生成：' + certId, 'success');
    }

    // ============================================================
    // 上链（✅ 已用 request，自动带 token）
    // ============================================================
    async function handleChain() {
        if (!isGenerated || !currentCertId) {
            showToast('请先生成凭证', 'warning');
            return;
        }

        chainBtn.disabled = true;
        chainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上链中...';

        const user = JSON.parse(localStorage.getItem('current_user') || '{}');

        // 后端 WarehouseBill 字段
        const bill = {
            warehouseBillNo: currentCertId,
            tradeOrderId: null,
            warehouseUserId: user.id || null,
            goodsWeight: parseFloat(quantity.value) || 0,
            qualityReport: (remarks.value.trim() || '合格'),
            cargoOwnerId: null,
            billStatus: 0
        };

        try {
            const data = await request.post('/warehouse/bill/create', bill, { autoRedirect: false });

            if (data && Number(data.code) === 200) {
                const saved = data.data || {};
                createdBillId = saved.id;
                certStatus.textContent = '已上链 ✓';
                certStatus.style.background = '#cce5ff';
                certStatus.style.color = '#004085';
                showToast('存证已上链成功', 'success');
                chainBtn.innerHTML = '<i class="fas fa-check-circle"></i> 已上链';
                chainBtn.disabled = true;

                if (createdBillId) {
                    request.post('/warehouse/bill/sync/' + createdBillId, null, { autoRedirect: false })
                        .catch(err => console.warn('sync 调用失败:', err));
                }
            } else {
                const code = data && Number(data.code);
                if (code === 403) {
                    showToast('无权限：当前账号不是仓储方，无法调用建仓单接口', 'error');
                } else if (code === 401) {
                    showToast('登录已过期，请重新登录', 'error');
                    setTimeout(() => { window.location.href = '登录-贸易商.html'; }, 1200);
                } else {
                    showToast((data && data.message) || '上链失败', 'error');
                }
                chainBtn.disabled = false;
                chainBtn.innerHTML = '<i class="fas fa-link"></i> 上链存证';
            }
        } catch (e) {
            console.error('上链失败:', e);

            const msg = String(e.message || '');
            if (msg.indexOf('未登录') !== -1 || msg.indexOf('UNAUTHORIZED') !== -1) {
                showToast('登录已过期，请重新登录', 'error');
                setTimeout(() => { window.location.href = '登录-贸易商.html'; }, 1200);
                return;
            }
            showToast('网络错误，上链失败', 'error');
            chainBtn.disabled = false;
            chainBtn.innerHTML = '<i class="fas fa-link"></i> 上链存证';
        }
    }

    function handleReset() {
        contractNo.value = '';
        goodsType.value = '';
        quantity.value = '';
        warehouse.value = '';
        remarks.value = '';
        if (docType) docType.value = '交易合同';

        uploadedFile = null;
        fileInput.value = '';
        fileNameDisplay.style.display = 'none';
        fileMainHint.textContent = '点击或拖拽上传文件';
        fileSubHint.textContent = '支持 PDF、Word、Excel、图片等格式';

        currentCertId = null;
        createdBillId = null;
        isGenerated = false;
        updateCertPreview(null, null);
        chainBtn.disabled = true;
        chainBtn.innerHTML = '<i class="fas fa-link"></i> 上链存证';

        showToast('已重置所有内容', '');
    }

    function handleFile(file) {
        if (!file) return;
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/png', 'image/jpeg', 'image/jpg'
        ];
        if (!validTypes.includes(file.type) &&
            !file.name.match(/\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg)$/i)) {
            showToast('不支持的文件格式', 'error');
            return;
        }
        uploadedFile = file;
        fileNameDisplay.textContent = '' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        fileNameDisplay.style.display = 'inline-block';
        fileMainHint.textContent = '已选择文件';
        fileSubHint.textContent = '点击或拖拽可更换文件';
        showToast('已上传：' + file.name, 'success');
    }

    generateBtn.addEventListener('click', handleGenerate);
    chainBtn.addEventListener('click', handleChain);
    resetBtn.addEventListener('click', handleReset);

    fileDropArea.addEventListener('click', function (e) {
        if (e.target.closest('#fileNameDisplay')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        if (this.files && this.files.length > 0) handleFile(this.files[0]);
    });

    fileDropArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        this.style.borderColor = '#4fc3f7';
        this.style.background = '#f0f8ff';
    });
    fileDropArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        this.style.borderColor = '#d0dcec';
        this.style.background = '#fafcff';
    });
    fileDropArea.addEventListener('drop', function (e) {
        e.preventDefault();
        this.style.borderColor = '#d0dcec';
        this.style.background = '#fafcff';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleGenerate();
        }
    });

    updateCertPreview(null, null);
    console.log('数据上链存证管理页 · JS 已启动');
})();


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

/* ---------- 2. 消息中心 ---------- */

/**
 * ✅ 核心修复：通过解析 content 文本判断消息状态
 */
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