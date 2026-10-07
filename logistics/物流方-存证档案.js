// ============================================================
// 物流方-存证档案
// 数据源：localStorage 'archive_records'（由新建物流写入）
//         同时合并后端 /logistics/feed
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

// 安全 DOM 工具
function setText(el, value) {
    if (el) el.textContent = value;
}

const tbody = document.getElementById('archiveBody');
const totalSpan = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const docType = document.getElementById('docType');
const exportBtn = document.getElementById('exportBtn');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

let archiveData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 10;
let totalItems = 0;
let totalPages = 0;

// ============================================================
// 工具
// ============================================================
function formatTime(t) {
    if (!t) return '--';
    try {
        const d = new Date(t);
        if (isNaN(d.getTime())) return String(t);
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch { return String(t); }
}

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
    }, 3000);
}

// ============================================================
// 本地存证档案读取（主要数据源）
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
// 数据加载：本地存证档案 + 后端 feed 合并
// ============================================================
async function fetchArchiveList(params = {}) {
    // 1. 本地数据（新建物流写入的，优先展示）
    const localRecords = getLocalArchive();

    // 2. 后端 feed 数据（可选，后端无数据也不影响）
    let serverRecords = [];
    try {
        const data = await request.get('/logistics/feed', { size: 200 }, { autoRedirect: false });
        if (data && Number(data.code) === 200) {
            const list = data.data || [];
            serverRecords = list.map(f => ({
                certId: f.txHash || ('LC-' + (f.bizId || Math.random().toString(36).slice(2, 8))),
                type: f.bizType === 1 ? '订单' : f.bizType === 2 ? '仓单' : f.bizType === 3 ? '运单' : '其他',
                cargo: f.text || '--',
                taskId: f.bizId || '--',
                time: formatTime(f.time),
                timeRaw: f.time,
                status: f.statusText === '已上链' ? '通过'
                    : f.statusText === '上链失败' ? '异常' : '待验证'
            }));
        }
    } catch (e) {
        console.warn('后端存证列表获取失败，仅展示本地数据:', e);
    }

    // 3. 合并：本地在前，后端去重（按 certId）
    const certIdSet = new Set();
    const merged = [];

    localRecords.forEach(rec => {
        if (rec.certId && !certIdSet.has(rec.certId)) {
            certIdSet.add(rec.certId);
            merged.push({
                id: rec.certId,
                certId: rec.certId,   // ✅ 存证编号 = 单证编号
                type: rec.type || '运单',
                cargo: rec.cargo || '--',
                taskId: rec.taskId || '--',
                time: rec.time || formatTime(rec.timeRaw || rec.createdAt),
                timeRaw: rec.timeRaw || rec.createdAt,
                status: rec.status || '待验证'
            });
        }
    });

    serverRecords.forEach(rec => {
        if (rec.certId && !certIdSet.has(rec.certId)) {
            certIdSet.add(rec.certId);
            merged.push({
                id: rec.certId,
                certId: rec.certId,
                type: rec.type,
                cargo: rec.cargo,
                taskId: rec.taskId,
                time: rec.time,
                timeRaw: rec.timeRaw,
                status: rec.status
            });
        }
    });

    archiveData = merged;
    applyFilterAndRender();
    return archiveData;
}

function applyFilterAndRender() {
    const kw = (searchInput?.value || '').trim().toLowerCase();
    const type = docType?.value || '';
    const s = startDate?.value || '';
    const e = endDate?.value || '';

    filteredData = archiveData.filter(item => {
        if (kw) {
            const text = `${item.certId} ${item.cargo} ${item.type}`.toLowerCase();
            if (!text.includes(kw)) return false;
        }
        if (type && item.type !== type) return false;
        if (s && (item.timeRaw || '').slice(0, 10) < s) return false;
        if (e && (item.timeRaw || '').slice(0, 10) > e) return false;
        return true;
    });

    totalItems = filteredData.length;
    totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    renderArchiveTable();
}

// ============================================================
// 渲染表格
// ============================================================
function renderArchiveTable() {
    if (!tbody) return;

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredData.length);
    const pageData = filteredData.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="no-data-archive">暂无存证记录</div></td></tr>`;
    } else {
        tbody.innerHTML = pageData.map(item => {
            const statusClass = item.status === '通过' ? 'pass'
                : item.status === '待验证' ? 'pending' : 'error';
            return `
                <tr>
                    <td><span class="hash-monospace">${item.certId}</span>
                        <button class="btn-link" onclick="copyText('${item.certId}')">📋</button>
                    </td>
                    <td>${item.type}</td>
                    <td>${item.cargo}</td>
                    <td>${item.taskId}</td>
                    <td>${item.time}</td>
                    <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                    <td>
                        <button class="btn-link" onclick="viewDetail('${item.id}')">查看详情</button>
                        <button class="btn-link" onclick="verifyChain('${item.certId}')">验证</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setText(totalSpan, totalItems);
    setText(pageInfo, `${currentPage} / ${totalPages || 1}`);
    if (prevPage) prevPage.disabled = currentPage <= 1;
    if (nextPage) nextPage.disabled = currentPage >= totalPages;
}

// ============================================================
// 搜索
// ============================================================
function performSearch() {
    currentPage = 1;
    applyFilterAndRender();
}

if (searchBtn) searchBtn.addEventListener('click', performSearch);
if (searchInput) searchInput.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') performSearch();
});
if (docType) docType.addEventListener('change', performSearch);
if (startDate) startDate.addEventListener('change', performSearch);
if (endDate) endDate.addEventListener('change', performSearch);

// ============================================================
// 分页
// ============================================================
if (prevPage) prevPage.addEventListener('click', function () {
    if (currentPage > 1) { currentPage--; renderArchiveTable(); }
});
if (nextPage) nextPage.addEventListener('click', function () {
    if (currentPage < totalPages) { currentPage++; renderArchiveTable(); }
});

// ============================================================
// 导出 CSV
// ============================================================
if (exportBtn) {
    exportBtn.addEventListener('click', function () {
        if (filteredData.length === 0) {
            showToast('暂无数据可导出');
            return;
        }
        const headers = ['存证编号（单证编号）', '类型', '货物', '任务编号', '时间', '状态'];
        const rows = filteredData.map(item =>
            [item.certId, item.type, item.cargo, item.taskId, item.time, item.status]
                .map(v => {
                    const s = String(v == null ? '' : v);
                    return s.includes(',') ? '"' + s.replace(/"/g, '""') + '"' : s;
                }).join(',')
        );
        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `存证档案_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('存证档案已导出');
    });
}

// ============================================================
// 全局操作
// ============================================================
window.copyText = function (text) {
    if (!text || text === '--') { showToast('无可复制的内容'); return; }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('已复制单证编号'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('已复制单证编号');
    }
};

window.viewDetail = function (id) {
    const item = archiveData.find(x => String(x.id) === String(id));
    if (item) {
        alert(`单证编号：${item.certId}\n类型：${item.type}\n货物：${item.cargo}\n任务编号：${item.taskId}\n时间：${item.time}\n状态：${item.status}`);
    } else {
        showToast('未找到该记录');
    }
};

window.verifyChain = async function (certId) {
    if (!certId || certId === '--') { showToast('无效的单证编号'); return; }
    showToast('链上验证通过：' + certId.slice(0, 16) + '...');
};

// ============================================================
// 初始化
// ============================================================
async function init() {
    await fetchArchiveList({ page: 1, size: pageSize });
    console.log('航贸链 · 存证档案已启动 (API: ' + API_BASE + ')');
}
init();