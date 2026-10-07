/**
 * ============================================================
 *  导出税务数据 - 交互逻辑
 *  数据来源：后端 /order/list（分页拉全量）+ localStorage 兼容
 * ============================================================
 */

(function () {
    'use strict';

    const API_BASE = 'http://192.168.0.3:10001/api';   // 保留
    const STORAGE_KEY = 'warehouse_records';
    const TAX_STORAGE_KEY = 'tax_records';

    // ============================================================
    //  DOM 引用
    // ============================================================
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const dataType = document.getElementById('dataType');
    const exportFormat = document.getElementById('exportFormat');
    const queryBtn = document.getElementById('queryBtn');
    const exportBtn = document.getElementById('exportBtn');

    const tableBody = document.getElementById('tableBody');
    const totalCount = document.getElementById('totalCount');
    const recordCount = document.getElementById('recordCount');
    const pageInfo = document.getElementById('pageInfo');

    const statTotal = document.getElementById('statTotal');
    const statAmount = document.getElementById('statAmount');
    const statWarehouse = document.getElementById('statWarehouse');
    const statOnChain = document.getElementById('statOnChain');

    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    // ============================================================
    //  状态
    // ============================================================
    let allRecords = [];
    let filteredData = [];
    let currentPage = 1;
    let pageSize = 10;
    let totalItems = 0;

    // ============================================================
    //  工具
    // ============================================================
    function getToday() {
        const now = new Date();
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
    }

    function get30DaysAgo() {
        const now = new Date();
        now.setDate(now.getDate() - 30);
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '--';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const p = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
        } catch { return dateStr; }
    }

    function showToast(message, type) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        if (type) toast.classList.add(type);
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // ============================================================
    //  本地数据读取
    // ============================================================
    function readLocalList(key) {
        try {
            const raw = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch {
            return [];
        }
    }

    function mapWarehouseRecord(r) {
        const onChain = !!(r.txHash || r.dataHash);
        const billNo = r.warehouseBillNo || r.billNo || r.id || '--';

        let weightText = '--';
        if (r.weightText) {
            weightText = r.weightText;
        } else if (r.goodsWeight != null && r.goodsWeight !== '') {
            weightText = r.goodsWeight + (r.unit || ' 吨');
        } else if (r.netWeight != null && r.netWeight !== '') {
            weightText = r.netWeight + (r.unit || ' 吨');
        }

        const cargo = r.goodsName || r.cargo || r.qualityReport || '--';

        const amount = (r.amount != null && r.amount !== '')
            ? String(r.amount)
            : '0';

        const holder = r.holder
            || (r.cargoOwnerId != null ? ('用户#' + r.cargoOwnerId) : '--');

        const time = r.createTime || r.time || new Date().toISOString();

        return {
            id: billNo,
            cargo: cargo,
            weight: weightText,
            amount: amount,
            holder: holder,
            type: '仓单',
            time: time,
            timeDisplay: formatDateTime(time),
            date: String(time).slice(0, 10),
            status: onChain
                ? { key: 'success', label: '已上链' }
                : { key: 'pending', label: '待上链' },
            onChain: onChain
        };
    }

    function mapOrderRecord(o) {
        const onChain = !!o.txHash;
        return {
            id: o.orderNo || ('ORD' + o.id),
            orderId: o.id,
            cargo: o.goodsName || '--',
            weight: o.goodsNum != null ? o.goodsNum + ' 吨' : '--',
            amount: o.tradePrice != null ? String(o.tradePrice) : '0',
            holder: o.sellerUserId != null ? ('用户#' + o.sellerUserId) : '--',
            type: '订单',
            time: o.createTime || new Date().toISOString(),
            timeDisplay: formatDateTime(o.createTime),
            date: (o.createTime || '').slice(0, 10),
            status: onChain
                ? { key: 'success', label: '已上链' }
                : { key: 'pending', label: '待上链' },
            onChain: onChain
        };
    }

    // ============================================================
    //  加载数据（后端订单 + 本地仓单/税务 合并去重）
    // ============================================================
    async function loadData() {
        console.log('开始加载税务数据...');

        if (tableBody) {
            tableBody.innerHTML =
                `<tr><td colspan="8" class="no-data"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>`;
        }
        if (exportBtn) exportBtn.disabled = true;

        try {
            const merged = [];
            const seen = new Set();

            // 1. 后端订单（✅ 用 request，自动带 token）
            try {
                const data = await request.get('/order/list', { page: 1, size: 1000 }, { autoRedirect: false });
                if (data && Number(data.code) === 200) {
                    const list = data.data?.list || [];
                    list.forEach(o => {
                        const row = mapOrderRecord(o);
                        if (!seen.has(row.id)) {
                            merged.push(row);
                            seen.add(row.id);
                        }
                    });
                    console.log('后端返回订单:', list.length, '条');
                }
            } catch (err) {
                console.warn('后端订单拉取失败，使用本地数据:', err);
            }

            // 2. 本地税务缓存
            readLocalList(TAX_STORAGE_KEY).forEach(r => {
                const row = mapWarehouseRecord(r);
                if (!seen.has(row.id)) {
                    merged.push(row);
                    seen.add(row.id);
                }
            });

            // 3. 本地仓单缓存
            readLocalList(STORAGE_KEY).forEach(r => {
                const row = mapWarehouseRecord(r);
                if (!seen.has(row.id)) {
                    merged.push(row);
                    seen.add(row.id);
                }
            });

            // 4. 清理刷新标记
            localStorage.removeItem('warehouse_need_refresh');
            localStorage.removeItem('tax_need_refresh');

            allRecords = merged;
            applyFilters();
            updateStats();
            if (exportBtn) exportBtn.disabled = false;

            console.log('税务数据加载完成，共', allRecords.length, '条');
        } catch (error) {
            console.error('加载数据失败:', error);
            if (tableBody) {
                tableBody.innerHTML =
                    `<tr><td colspan="8" class="no-data"><i class="fas fa-exclamation-triangle"></i> 加载失败: ${error.message}</td></tr>`;
            }
            showToast('加载数据失败，请刷新重试', 'error');
        }
    }

    // ============================================================
    //  筛选
    // ============================================================
    function applyFilters() {
        const start = startDate ? startDate.value : '';
        const end = endDate ? endDate.value : '';
        const type = dataType ? dataType.value : 'all';

        filteredData = allRecords.filter(item => {
            const d = item.date || String(item.time || '').slice(0, 10);
            if (start && d < start) return false;
            if (end && d > end) return false;
            if (type !== 'all' && item.type !== type) return false;
            return true;
        });

        totalItems = filteredData.length;
        currentPage = 1;
        renderTable();
    }

    // ============================================================
    //  渲染表格
    // ============================================================
    function renderTable() {
        if (!tableBody) return;

        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, filteredData.length);
        const pageData = filteredData.slice(start, end);

        if (pageData.length === 0) {
            tableBody.innerHTML =
                `<tr><td colspan="8" class="no-data"><i class="fas fa-inbox"></i> 暂无数据</td></tr>`;
        } else {
            tableBody.innerHTML = pageData.map(item => `
                <tr>
                    <td><strong>${item.id || '--'}</strong></td>
                    <td>${item.cargo || '--'}</td>
                    <td>${item.weight || '--'}</td>
                    <td>${item.amount || '--'}</td>
                    <td>${item.holder || '--'}</td>
                    <td><span class="type-tag">${item.type || '--'}</span></td>
                    <td style="font-size:12px;color:#6f8aa8;">${item.timeDisplay || item.time || '--'}</td>
                    <td><span class="status-badge ${item.status ? item.status.key : 'pending'}">${item.status ? item.status.label : '待上链'}</span></td>
                </tr>
            `).join('');
        }

        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        if (totalCount) totalCount.textContent = totalItems;
        if (recordCount) recordCount.textContent = '共 ' + totalItems + ' 条';
        if (pageInfo) pageInfo.textContent = currentPage + ' / ' + totalPages;

        if (prevPage) prevPage.disabled = currentPage <= 1;
        if (nextPage) nextPage.disabled = currentPage >= totalPages;
    }

    // ============================================================
    //  统计
    // ============================================================
    function updateStats() {
        if (statTotal) statTotal.textContent = filteredData.length;

        let totalAmount = 0;
        filteredData.forEach(item => {
            const v = parseFloat(item.amount);
            if (!isNaN(v)) totalAmount += v;
        });
        if (statAmount) statAmount.textContent = totalAmount.toFixed(2);

        const uniqueIds = new Set();
        filteredData.forEach(item => { if (item.id) uniqueIds.add(item.id); });
        if (statWarehouse) statWarehouse.textContent = uniqueIds.size;

        const onChainCount = filteredData.filter(item =>
            item.onChain || (item.status && item.status.key === 'success')).length;
        if (statOnChain) statOnChain.textContent = onChainCount;
    }

    // ============================================================
    //  导出
    // ============================================================
    function exportData() {
        if (!filteredData || filteredData.length === 0) {
            showToast('没有数据可导出，请先查询', 'error');
            return;
        }

        const format = exportFormat ? exportFormat.value : 'excel';

        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        }

        try {
            const exportRows = filteredData.map(item => ({
                '仓单编号': item.id || '--',
                '货物名称': item.cargo || '--',
                '重量': item.weight || '--',
                '金额(万元)': item.amount || '--',
                '持有人': item.holder || '--',
                '数据类型': item.type || '--',
                '时间': item.timeDisplay || item.time || '--',
                '状态': item.status ? item.status.label : '--'
            }));

            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `税务数据_${dateStr}`;

            let content, mimeType, ext;
            switch (format) {
                case 'json':
                    content = JSON.stringify(exportRows, null, 2);
                    mimeType = 'application/json';
                    ext = 'json';
                    break;
                case 'csv':
                    content = convertToCSV(exportRows);
                    mimeType = 'text/csv';
                    ext = 'csv';
                    break;
                case 'pdf':
                    content = convertToTextTable(exportRows);
                    mimeType = 'text/plain';
                    ext = 'txt';
                    showToast('PDF 需后端支持，已导出为文本', 'error');
                    break;
                case 'excel':
                default:
                    content = convertToCSV(exportRows);
                    mimeType = 'text/csv';
                    ext = 'xlsx';
                    showToast('Excel 已导出为 CSV', 'error');
                    break;
            }

            const blob = new Blob(['\uFEFF' + content], { type: mimeType + ';charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`税务数据已导出，共 ${filteredData.length} 条`, 'success');
        } catch (error) {
            console.error('导出失败:', error);
            showToast('导出失败: ' + error.message, 'error');
        }

        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-download"></i> 导出';
        }
    }

    function convertToCSV(data) {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const rows = data.map(item =>
            headers.map(h => {
                const v = item[h] || '';
                if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
                    return '"' + v.replace(/"/g, '""') + '"';
                }
                return v;
            }).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
    }

    function convertToTextTable(data) {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const widths = headers.map(h => Math.max(h.length, 12));
        data.forEach(item => headers.forEach((h, i) => {
            const v = String(item[h] || '');
            if (v.length > widths[i]) widths[i] = Math.min(v.length, 20);
        }));

        const line = '='.repeat(widths.reduce((a, b) => a + b + 3, 1)) + '\n';
        let result = line;
        result += '税务数据导出报告\n';
        result += '导出时间: ' + new Date().toLocaleString('zh-CN') + '\n';
        result += '数据条数: ' + data.length + '\n';
        result += line + '\n';
        const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join(' | ');
        result += headerRow + '\n' + '-'.repeat(headerRow.length) + '\n';
        data.forEach(item => {
            result += headers.map((h, i) => String(item[h] || '').padEnd(widths[i])).join(' | ') + '\n';
        });
        result += '\n' + line;
        return result;
    }

    // ============================================================
    //  事件绑定
    // ============================================================
    if (queryBtn) {
        queryBtn.addEventListener('click', function () {
            applyFilters();
            updateStats();
        });
    }

    document.querySelectorAll('.filter-group input, .filter-group select').forEach(el => {
        el.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') { applyFilters(); updateStats(); }
        });
        if (el.tagName === 'SELECT') {
            el.addEventListener('change', function () { applyFilters(); updateStats(); });
        }
    });

    if (exportBtn) exportBtn.addEventListener('click', exportData);

    if (prevPage) prevPage.addEventListener('click', function () {
        if (currentPage > 1) { currentPage--; renderTable(); }
    });
    if (nextPage) nextPage.addEventListener('click', function () {
        const totalPages = Math.ceil(totalItems / pageSize);
        if (currentPage < totalPages) { currentPage++; renderTable(); }
    });

    // ============================================================
    //  默认日期
    // ============================================================
    function setDefaultDates() {
        if (startDate) startDate.value = get30DaysAgo();
        if (endDate) endDate.value = getToday();
    }

    // ============================================================
    //  初始化
    // ============================================================
    function init() {
        setDefaultDates();
        loadData();

        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY || e.key === TAX_STORAGE_KEY) loadData();
        });

        console.log('导出税务数据界面初始化完成');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__taxExport = {
        loadData, applyFilters, renderTable, updateStats, exportData,
        allRecords: () => allRecords,
        filteredData: () => filteredData
    };
})();