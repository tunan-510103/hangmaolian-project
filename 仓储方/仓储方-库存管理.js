// ============================================================
// 仓储方-库存管理
// 后端: GET  /warehouse/inventory/list?page&size&keyword&status
//       GET  /warehouse/workbench/stats
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

// ============================================================
// 状态
// ============================================================
let currentData = [];
let currentPage = 1;
let pageSize = 8;
let totalItems = 0;
let totalPages = 0;
let searchParams = {};

// ============================================================
// API - 库存列表（✅ 用 request）
// ============================================================
async function fetchInventory(params = {}) {
    try {
        const query = {
            page: params.page || 1,
            size: params.size || pageSize,
            keyword: params.keyword || ''
        };
        if (params.status !== undefined && params.status !== '' && params.status !== null) {
            query.status = params.status;
        }

        const data = await request.get('/warehouse/inventory/list', query, { autoRedirect: false });

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
        console.error('获取库存列表失败:', e);
        const tbody = document.getElementById('tableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="no-data">加载失败：${e.message}</div></td></tr>`;
        }
        return [];
    }
}

// ============================================================
// API - 统计（✅ 用 request）
// ============================================================
async function updateStats() {
    try {
        const data = await request.get('/warehouse/workbench/stats', null, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) return;
        const s = data.data || {};
        setText('statSku', s.totalSku || 0);
        setText('statTotal', '--');
        setText('statLow', s.lowStock || 0);
        setText('statUtil', '--');
    } catch (e) {
        console.warn('获取统计失败:', e);
    }
}

// ============================================================
// 渲染表格
// ============================================================
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    if (currentData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="no-data">暂无库存数据</td></tr>`;
    } else {
        tbody.innerHTML = currentData.map(item => {
            const isLow = item.stockStatus === 1;
            const statusText = isLow ? '低库存' : '正常';
            const sc = isLow ? 'low' : 'normal';
            return `
                <tr>
                    <td><span class="hash-mono">${item.skuCode || '--'}</span></td>
                    <td>${item.goodsName || '--'}</td>
                    <td>${item.warehouseLocation || '--'}</td>
                    <td>${item.stockNum != null ? item.stockNum : '--'}</td>
                    <td>${item.unit || '--'}</td>
                    <td><span class="stock-tag ${sc}">${statusText}</span></td>
                    <td>
                        <button class="btn-link" onclick="showToast('详情：${item.skuCode}')"><i class="fas fa-eye"></i> 详情</button>
                        <button class="btn-link" onclick="showToast('盘点：${item.skuCode}')"><i class="fas fa-clipboard-list"></i> 盘点</button>
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
// 搜索 & 分页
// ============================================================
async function doSearch() {
    const searchInput = document.getElementById('searchInput');
    const stockFilter = document.getElementById('stockFilter');
    searchParams = {
        keyword: searchInput ? searchInput.value.trim() : '',
        status: stockFilter ? stockFilter.value : '',
        page: 1
    };
    await fetchInventory(searchParams);
}

const searchBtn = document.getElementById('searchBtn');
if (searchBtn) searchBtn.addEventListener('click', doSearch);

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') doSearch(); });
}

const stockFilter = document.getElementById('stockFilter');
if (stockFilter) stockFilter.addEventListener('change', doSearch);

const prevPageBtn = document.getElementById('prevPage');
if (prevPageBtn) {
    prevPageBtn.addEventListener('click', async function () {
        if (currentPage > 1) {
            searchParams.page = currentPage - 1;
            await fetchInventory(searchParams);
        }
    });
}

const nextPageBtn = document.getElementById('nextPage');
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', async function () {
        if (currentPage < totalPages) {
            searchParams.page = currentPage + 1;
            await fetchInventory(searchParams);
        }
    });
}

// ============================================================
// 企业信息（加判空）
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
// 初始化
// ============================================================
async function init() {
    fetchCompanyInfo();
    // ✅ allSettled：一个失败不影响其他
    await Promise.allSettled([
        fetchInventory({ page: 1, size: pageSize }),
        updateStats()
    ]);
    console.log('仓储方 · 库存管理已启动 (API: ' + API_BASE + ')');
}
init();