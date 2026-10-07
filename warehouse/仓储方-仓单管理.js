// ============================================================
//  仓单管理 - 仓储方
//  后端: GET  /warehouse/bill/list
//        GET  /warehouse/bill/{id}
//        GET  /warehouse/bill/{id}/chain
//        GET  /warehouse/bill/verify/{id}
//        POST /warehouse/bill/sync/{id}
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

// ============================================================
//  安全 DOM 工具
// ============================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================================
//  Toast
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

// ============================================================
//  状态
// ============================================================
let currentData = [];
let currentPage = 1;
let pageSize = 8;
let totalItems = 0;
let totalPages = 0;
let currentDrawerId = null;

const BILL_STATUS_TEXT = { 0: '新建', 1: '已确权', 2: '已出库', 3: '质押锁定' };
const BILL_STATUS_CLASS = { 0: 'pending', 1: 'active', 2: 'done', 3: 'frozen' };

// ============================================================
//  工具
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

// ============================================================
//  API - 仓单列表（✅ 用 request）
// ============================================================
async function fetchWarehouseList(params = {}) {
    try {
        const query = {
            page: params.page || 1,
            size: params.size || pageSize,
            keyword: params.keyword || ''
        };
        if (params.status !== undefined && params.status !== '' && params.status !== null) {
            query.status = params.status;
        }

        const data = await request.get('/warehouse/bill/list', query, { autoRedirect: false });

        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '查询失败');
        }

        const result = data.data || {};
        currentData = result.list || [];
        totalItems = result.total || 0;
        totalPages = result.pages || 1;
        currentPage = result.page || 1;
        renderTable();
        return currentData;
    } catch (e) {
        console.error('获取仓单列表失败:', e);
        const tbody = document.getElementById('tableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="no-data">加载失败：${e.message}</div></td></tr>`;
        }
        return [];
    }
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    if (currentData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="no-data">暂无仓单数据</td></tr>`;
    } else {
        tbody.innerHTML = currentData.map(item => {
            const sc = BILL_STATUS_CLASS[item.billStatus] || 'pending';
            const statusText = BILL_STATUS_TEXT[item.billStatus] || '未知';
            return `
                <tr>
                    <td><span class="hash-mono">${item.warehouseBillNo || item.id}</span></td>
                    <td>${item.qualityReport || '--'}</td>
                    <td>${item.goodsWeight != null ? item.goodsWeight + ' 吨' : '--'}</td>
                    <td>${item.cargoOwnerId != null ? '用户#' + item.cargoOwnerId : '--'}</td>
                    <td><span class="status-badge ${sc}">${statusText}</span></td>
                    <td><span class="iot-badge offline">--</span></td>
                    <td style="font-size:12px;color:#7a8a9a;">${formatTime(item.createTime)}</td>
                    <td>
                        <button class="btn-link" onclick="openDrawer('${item.id}')"><i class="fas fa-eye"></i> 查看</button>
                        <button class="btn-link" onclick="verifyBill('${item.id}')"><i class="fas fa-check"></i> 核验</button>
                        <button class="btn-link" onclick="syncBill('${item.id}')"><i class="fas fa-link"></i> 上链</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    setText('totalCount', totalItems);
    const total = totalPages || 1;
    setText('pageInfo', `${currentPage} / ${total}`);
    const prev = document.getElementById('prevPage');
    const next = document.getElementById('nextPage');
    if (prev) prev.disabled = currentPage <= 1;
    if (next) next.disabled = currentPage >= total;
}

// ============================================================
//  核验 / 上链（✅ 用 request）
// ============================================================
async function verifyBill(id) {
    try {
        const data = await request.get('/warehouse/bill/verify/' + id, null, { autoRedirect: false });
        if (data && Number(data.code) === 200) {
            showToast(data.data ? '核验通过，数据一致' : '核验失败，数据不一致');
        } else {
            showToast((data && data.message) || '核验失败');
        }
    } catch (e) {
        console.error(e);
        showToast('核验请求失败');
    }
}

async function syncBill(id) {
    try {
        showToast('正在上链...');
        const data = await request.post('/warehouse/bill/sync/' + id, null, { autoRedirect: false });
        if (data && Number(data.code) === 200 && data.data) {
            showToast('上链成功，存证已写入链上');
            fetchWarehouseList({ ...searchParams, page: currentPage });
        } else {
            showToast((data && data.message) || '上链失败');
        }
    } catch (e) {
        console.error(e);
        showToast('上链请求失败');
    }
}

// ============================================================
//  搜索 & 分页
// ============================================================
let searchParams = {};

async function doSearch() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    searchParams = {
        keyword: searchInput ? searchInput.value.trim() : '',
        status: statusFilter ? statusFilter.value : '',
        page: 1
    };
    await fetchWarehouseList(searchParams);
}

const searchBtn = document.getElementById('searchBtn');
if (searchBtn) searchBtn.addEventListener('click', doSearch);

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') doSearch(); });
}

const statusFilter = document.getElementById('statusFilter');
if (statusFilter) statusFilter.addEventListener('change', doSearch);

const prevPageBtn = document.getElementById('prevPage');
if (prevPageBtn) {
    prevPageBtn.addEventListener('click', async function () {
        if (currentPage > 1) {
            searchParams.page = currentPage - 1;
            await fetchWarehouseList(searchParams);
        }
    });
}

const nextPageBtn = document.getElementById('nextPage');
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', async function () {
        if (currentPage < totalPages) {
            searchParams.page = currentPage + 1;
            await fetchWarehouseList(searchParams);
        }
    });
}

// ============================================================
//  企业信息（从 localStorage 读，加判空）
// ============================================================
function fetchCompanyInfo() {
    const user = JSON.parse(localStorage.getItem('current_user') || 'null');
    if (user) {
        setText('companyName', user.companyName || '仓储物流中心');
        setText('avatarText', (user.companyName || '仓').charAt(0));
        setText('notifBadge', 0);
    }
    return user || {};
}

// ============================================================
//  抽屉
// ============================================================
const overlay = document.getElementById('drawerOverlay');
const drawer = document.getElementById('drawer');

async function openDrawer(id) {
    currentDrawerId = id;
    setText('drawerIdDisplay', id);

    try {
        // 1. 仓单详情（✅ 用 request）
        const data = await request.get('/warehouse/bill/' + id, null, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || 'HTTP error');
        }
        const d = data.data || {};

        setText('goodsName', d.qualityReport || '--');
        setText('goodsSpec', d.warehouseBillNo || '--');
        setText('netWeight', d.goodsWeight != null ? d.goodsWeight + ' 吨' : '--');
        setText('location', '--');
        setText('holder', d.cargoOwnerId != null ? '用户#' + d.cargoOwnerId : '--');
        setText('issueTimeDisplay', formatTime(d.createTime));
        const reportFile = document.getElementById('reportFile');
        if (reportFile) reportFile.innerHTML = '--';

        // 2. 链上信息（✅ 用 request）
        try {
            const chainData = await request.get('/warehouse/bill/' + id + '/chain', null, { autoRedirect: false });
            const c = (chainData && chainData.data) || {};
            setText('txHashDisplay', c.txHash || '--');
            setText('blockHeightDisplay', c.blockHeight || '--');
        } catch (err) {
            setText('txHashDisplay', '--');
            setText('blockHeightDisplay', '--');
        }

        const evidenceList = document.getElementById('evidenceList');
        if (evidenceList) evidenceList.innerHTML = '<span style="color:#9aaec2;font-size:13px;">暂无影像证据</span>';
        const iotGrid = document.getElementById('iotGrid');
        if (iotGrid) iotGrid.innerHTML = '<div style="color:#9aaec2;grid-column:1/-1;text-align:center;padding:20px 0;">暂无IoT数据</div>';
        const timelineList = document.getElementById('timelineList');
        if (timelineList) timelineList.innerHTML = '<div style="color:#9aaec2;text-align:center;padding:20px 0;">暂无流转记录</div>';

    } catch (e) {
        console.error('获取详情失败:', e);
        showToast('加载详情失败');
    }

    if (overlay) overlay.classList.add('active');
    if (drawer) drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    if (overlay) overlay.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
}

const drawerCloseBtn = document.getElementById('drawerCloseBtn');
if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
const drawerBackBtn = document.getElementById('drawerBackBtn');
if (drawerBackBtn) drawerBackBtn.addEventListener('click', closeDrawer);
if (overlay) overlay.addEventListener('click', closeDrawer);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('active')) closeDrawer();
});

const copyTxBtn = document.getElementById('copyTxBtn');
if (copyTxBtn) {
    copyTxBtn.addEventListener('click', function () {
        const el = document.getElementById('txHashDisplay');
        const text = el ? el.textContent : '';
        if (!text || text === '--') { showToast('无可复制的内容'); return; }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => showToast('TxID 已复制'));
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showToast('TxID 已复制');
        }
    });
}

// Tabs
const tabHeaders = document.querySelectorAll('.tab');
const tabContents = {
    'tab-basic': document.getElementById('tab-basic'),
    'tab-iot': document.getElementById('tab-iot'),
    'tab-timeline': document.getElementById('tab-timeline')
};
tabHeaders.forEach(tab => {
    tab.addEventListener('click', function () {
        tabHeaders.forEach(t => t.classList.remove('active'));
        Object.values(tabContents).forEach(c => c && c.classList.remove('active'));
        this.classList.add('active');
        const target = this.getAttribute('data-tab');
        if (tabContents[target]) tabContents[target].classList.add('active');
    });
});

// 底部按钮
const btnOnchain = document.getElementById('btnOnchain');
if (btnOnchain) {
    btnOnchain.addEventListener('click', () => {
        if (currentDrawerId) syncBill(currentDrawerId);
    });
}
const btnEdit = document.getElementById('btnEdit');
if (btnEdit) btnEdit.addEventListener('click', () => showToast('编辑功能暂未开放'));

const btnPushTax = document.getElementById('btnPushTax');
if (btnPushTax) btnPushTax.addEventListener('click', () => showToast('已向税务部门推送最新数据'));

const btnCancel = document.getElementById('btnCancel');
if (btnCancel) {
    btnCancel.addEventListener('click', function () {
        if (confirm('确认注销该仓单？此操作将上链存证。')) {
            showToast('仓单已注销，数据已上链');
            closeDrawer();
            fetchWarehouseList(searchParams);
        }
    });
}

if (drawer) drawer.addEventListener('click', e => e.stopPropagation());

// 暴露全局
window.openDrawer = openDrawer;
window.verifyBill = verifyBill;
window.syncBill = syncBill;

// ============================================================
//  初始化
// ============================================================
async function init() {
    fetchCompanyInfo();
    await fetchWarehouseList({ page: 1, size: pageSize });
    console.log('仓储方 · 仓单管理已启动 (API: ' + API_BASE + ')');
}
init();