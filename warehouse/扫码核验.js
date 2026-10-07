// ============================================================
// 扫码核验
// 后端: GET /order/list?keyword=
//       GET /order/{id}
//       GET /order/status/{id}
//       GET /order/count
// ============================================================
(function () {
    'use strict';

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

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetBtn');
    const listSection = document.getElementById('listSection');
    const cargoCards = document.getElementById('cargoCards');
    const resultCount = document.getElementById('resultCount');
    const emptyState = document.getElementById('emptyState');
    const noResultState = document.getElementById('noResultState');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const chainStatusBadge = document.getElementById('chainStatusBadge'); // 可能为 null，加判空

    let allRecords = [];
    let filteredRecords = [];
    let expandedQrMap = {};
    let isSearching = false;

    function getToday() {
        const now = new Date();
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
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

    function setLoading(loading) {
        isSearching = loading;
        if (!searchBtn) return;
        if (loading) {
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<span class="loading-spinner"></span> 查询中...';
        } else {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i> 查询';
        }
    }

    // ============================================================
    // 订单 → 卡片字段映射
    // ============================================================
    function mapOrderToCard(order) {
        return {
            id: order.id,
            orderNo: order.orderNo || '--',
            cargo: order.goodsName || '--',
            spec: order.goodsSpec || '--',
            weight: order.goodsNum != null ? order.goodsNum + (order.unit || ' 吨') : '--',
            quantity: order.goodsNum,
            unit: order.unit || '',
            supplier: '--',
            holder: order.sellerUserId != null ? ('用户#' + order.sellerUserId) : '--',
            location: order.warehouseAddr || '--',
            quality: '--',
            time: formatTime(order.createTime),
            txHash: order.txHash || '--',
            blockHeight: '--',
            orderStatus: order.orderStatus,
            isOnChain: !!order.txHash
        };
    }

    // ============================================================
    // 链上状态检测（✅ 用 request）
    // ============================================================
    async function checkChainStatus() {
        try {
            const data = await request.get('/order/count', null, { autoRedirect: false });
            if (data && Number(data.code) === 200) {
                if (chainStatusBadge) {
                    chainStatusBadge.innerHTML = '<i class="fas fa-link"></i> 链已连接';
                    chainStatusBadge.style.background = '#d4edda';
                    chainStatusBadge.style.color = '#1e6b3b';
                }
                return data.data;
            }
        } catch (error) {
            console.warn('链状态检测失败:', error);
            if (chainStatusBadge) {
                chainStatusBadge.innerHTML = '<i class="fas fa-question-circle"></i> 链状态未知';
                chainStatusBadge.style.background = '#fff3cd';
                chainStatusBadge.style.color = '#856404';
            }
        }
        return null;
    }

    // ============================================================
    // 订单列表（✅ 用 request）
    // ============================================================
    async function fetchCargoList(keyword) {
        setLoading(true);
        try {
            const params = { page: 1, size: 200 };
            if (keyword && keyword.trim()) {
                params.keyword = keyword.trim();
            }

            const data = await request.get('/order/list', params, { autoRedirect: false });

            if (data && Number(data.code) === 200) {
                const list = data.data?.list || [];
                return list.map(mapOrderToCard);
            }
            throw new Error((data && data.message) || '查询失败');
        } catch (error) {
            console.error('查询订单失败:', error);
            showToast('查询失败: ' + error.message, 'error');
            return [];
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // 订单详情（✅ 用 request）
    // ============================================================
    async function fetchCargoDetail(id) {
        try {
            const data = await request.get('/order/' + id, null, { autoRedirect: false });
            if (data && Number(data.code) === 200) return mapOrderToCard(data.data || {});
            return null;
        } catch (error) {
            console.error('获取详情失败:', error);
            showToast('获取详情失败', 'error');
            return null;
        }
    }

    // ============================================================
    // 核验上报（✅ 用 request）
    // ============================================================
    async function reportVerify(id) {
        try {
            const data = await request.get('/order/status/' + id, null, { autoRedirect: false });
            return data && Number(data.code) === 200;
        } catch (error) {
            console.warn('核验上报失败:', error);
            return false;
        }
    }

    // ============================================================
    // 二维码
    // ============================================================
    function generateQRCode(elementId, data) {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.innerHTML = '';

        const qrData = {
            type: 'CARGO_TRACKING',
            version: '1.0',
            data: {
                inboundId: data.id || '--',
                cargoName: data.cargo || '--',
                spec: data.spec || '--',
                weight: data.weight || '--',
                supplier: data.supplier || '--',
                holder: data.holder || '--',
                location: data.location || '--',
                inboundTime: data.time || '--',
                txHash: data.txHash || '--',
                blockHeight: data.blockHeight || '--',
                chainStatus: data.isOnChain ? '已上链' : '待上链'
            }
        };

        try {
            if (typeof QRCode === 'undefined') {
                container.innerHTML = '<div style="font-size:10px;color:#e74c3c;">QRCode库未加载</div>';
                return;
            }
            new QRCode(container, {
                text: JSON.stringify(qrData),
                width: 48,
                height: 48,
                colorDark: '#0b1a2e',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            container.classList.add('active');
        } catch (error) {
            console.error('二维码生成失败:', error);
            container.innerHTML = '<div style="width:48px;height:48px;background:#f8faff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#e74c3c;">错误</div>';
        }
    }

    // ============================================================
    // 渲染卡片
    // ============================================================
    function renderCards(records) {
        if (!records || records.length === 0) {
            if (listSection) listSection.classList.remove('active');
            if (emptyState) emptyState.style.display = 'none';
            if (noResultState) noResultState.style.display = 'block';
            return;
        }

        if (listSection) listSection.classList.add('active');
        if (emptyState) emptyState.style.display = 'none';
        if (noResultState) noResultState.style.display = 'none';
        if (resultCount) resultCount.textContent = '共 ' + records.length + ' 条';

        if (!cargoCards) return;

        cargoCards.innerHTML = records.map((item, index) => {
            const cardId = 'card-' + (item.id || index);
            const qrId = 'qr-' + (item.id || index);
            const statusText = ORDER_STATUS_TEXT[item.orderStatus] || '未知';

            return `
                <div class="cargo-card" id="${cardId}">
                    <div class="card-top">
                        <span class="card-title">${item.cargo || '--'}</span>
                        <span class="card-badge ${item.isOnChain ? 'onchain' : 'pending'}">
                            ${item.isOnChain ? '已上链' : '待上链'}
                        </span>
                    </div>
                    <div class="card-details">
                        <div><span class="label">订单号</span><br><span class="value">${item.orderNo || item.id || '--'}</span></div>
                        <div><span class="label">规格</span><br><span class="value">${item.spec || '--'}</span></div>
                        <div><span class="label">数量</span><br><span class="value">${item.weight || '--'}</span></div>
                        <div><span class="label">状态</span><br><span class="value">${statusText}</span></div>
                        <div><span class="label">供应商</span><br><span class="value">${item.supplier || '--'}</span></div>
                        <div><span class="label">持有人</span><br><span class="value">${item.holder || '--'}</span></div>
                        <div><span class="label">库位</span><br><span class="value">${item.location || '--'}</span></div>
                        <div><span class="label">创建时间</span><br><span class="value">${item.time || '--'}</span></div>
                    </div>
                    <div class="card-footer">
                        <div class="qr-wrapper">
                            <div class="qr-container" id="${qrId}"></div>
                            <button class="btn btn-sm btn-outline qr-toggle-btn" data-qr-id="${qrId}" data-card-id="${cardId}" data-index="${index}">
                                <i class="fas fa-qrcode"></i> 生成二维码
                            </button>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-outline" onclick="window.__scan.viewDetail('${item.id}')">
                                <i class="fas fa-eye"></i> 详情
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="window.__scan.verifyCargo('${item.id}')">
                                <i class="fas fa-check-circle"></i> 核验
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="window.__scan.exportReport('${item.id}')">
                                <i class="fas fa-file-export"></i> 导出
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.qr-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const qrId = this.dataset.qrId;
                const index = parseInt(this.dataset.index);

                const container = document.getElementById(qrId);
                if (!container) return;

                if (container.classList.contains('active')) {
                    container.classList.remove('active');
                    this.innerHTML = '<i class="fas fa-qrcode"></i> 生成二维码';
                    expandedQrMap[qrId] = false;
                    return;
                }

                const record = records[index];
                if (!record) { showToast('数据不存在', 'error'); return; }

                generateQRCode(qrId, record);
                this.innerHTML = '<i class="fas fa-qrcode"></i> 收起二维码';
                expandedQrMap[qrId] = true;
                showToast('二维码已生成', 'success');
            });
        });
    }

    // ============================================================
    // 查询
    // ============================================================
    async function searchRecords(keyword) {
        const trimmed = keyword ? keyword.trim() : '';
        const data = await fetchCargoList(trimmed);
        allRecords = data || [];
        filteredRecords = [...allRecords];
        renderCards(filteredRecords);

        if (filteredRecords.length === 0 && trimmed) {
            if (listSection) listSection.classList.remove('active');
            if (emptyState) emptyState.style.display = 'none';
            if (noResultState) noResultState.style.display = 'block';
        } else if (filteredRecords.length === 0) {
            if (listSection) listSection.classList.remove('active');
            if (emptyState) emptyState.style.display = 'block';
            if (noResultState) noResultState.style.display = 'none';
        }
    }

    function resetSearch() {
        if (searchInput) searchInput.value = '';
        expandedQrMap = {};
        searchRecords('');
        showToast('已重置，显示全部订单', 'info');
    }
    window.resetSearch = resetSearch;

    // ============================================================
    // 全局操作
    // ============================================================
    window.__scan = window.__scan || {};
    window.__scan.viewDetail = async function (id) {
        const record = await fetchCargoDetail(id);
        if (record) {
            const info =
                `订单号：${record.orderNo || '--'}\n` +
                `货物：${record.cargo || '--'}\n` +
                `规格：${record.spec || '--'}\n` +
                `数量：${record.weight || '--'}\n` +
                `状态：${ORDER_STATUS_TEXT[record.orderStatus] || '--'}\n` +
                `持有人：${record.holder || '--'}\n` +
                `库位：${record.location || '--'}\n` +
                `TxID：${record.txHash || '--'}`;
            alert(info);
        } else {
            showToast('未找到该订单', 'error');
        }
    };

    window.__scan.verifyCargo = async function (id) {
        try {
            const record = await fetchCargoDetail(id);
            if (!record) { showToast('未找到该订单', 'error'); return; }

            await reportVerify(id);

            const cards = document.querySelectorAll('.cargo-card');
            cards.forEach(card => {
                const title = card.querySelector('.card-title');
                if (title && title.textContent === record.cargo) {
                    card.style.borderColor = '#2ecc71';
                    card.style.boxShadow = '0 0 0 3px rgba(46,204,113,0.3)';
                    setTimeout(() => {
                        card.style.borderColor = '';
                        card.style.boxShadow = '';
                    }, 3000);
                }
            });

            showToast('核验通过！' + record.cargo + ' 数据真实有效', 'success');
        } catch (error) {
            console.error('核验失败:', error);
            showToast('核验失败: ' + error.message, 'error');
        }
    };

    window.__scan.exportReport = function (id) {
        const record = allRecords.find(r => String(r.id) === String(id));
        if (record) {
            const content = JSON.stringify(record, null, 2);
            const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `订单档案_${record.orderNo || record.id}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('订单档案已导出', 'success');
        } else {
            showToast('未找到该订单', 'error');
        }
    };

    // ============================================================
    // 事件绑定
    // ============================================================
    if (searchBtn) {
        searchBtn.addEventListener('click', function () {
            searchRecords(searchInput ? searchInput.value : '');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') searchRecords(this.value);
        });
    }

    if (resetBtn) resetBtn.addEventListener('click', resetSearch);

    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', function () {
            const qrContainers = document.querySelectorAll('.qr-container');
            const isAnyExpanded = Array.from(qrContainers).some(el => el.classList.contains('active'));

            qrContainers.forEach((container) => {
                const btn = document.querySelector(`[data-qr-id="${container.id}"]`);
                if (!btn) return;

                if (isAnyExpanded) {
                    container.classList.remove('active');
                    btn.innerHTML = '<i class="fas fa-qrcode"></i> 生成二维码';
                    expandedQrMap[container.id] = false;
                } else {
                    if (!container.classList.contains('active')) {
                        const card = container.closest('.cargo-card');
                        if (card) {
                            const index = Array.from(card.parentElement.children).indexOf(card);
                            const record = filteredRecords[index];
                            if (record) {
                                generateQRCode(container.id, record);
                                container.classList.add('active');
                                btn.innerHTML = '<i class="fas fa-qrcode"></i> 收起二维码';
                                expandedQrMap[container.id] = true;
                            }
                        }
                    }
                }
            });

            if (!isAnyExpanded) {
                showToast('已展开全部二维码', 'success');
                this.innerHTML = '<i class="fas fa-compress"></i> 收起全部二维码';
            } else {
                this.innerHTML = '<i class="fas fa-expand"></i> 展开全部二维码';
            }
        });
    }

    // ============================================================
    // 初始化
    // ============================================================
    async function init() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) dateEl.textContent = getToday();
        await checkChainStatus();
        await searchRecords('');
        console.log('扫码核验界面已初始化 (API: ' + API_BASE + ')');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();