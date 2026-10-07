// ============================================================
// 存证溯源页面 - JS 逻辑
// 后端: GET /trace/bill/{billId}
//       GET /trace/bill/{billId}/cargo
//       GET /trace/bill/{billId}/timeline
// ============================================================

// ---------- 1. 全局状态 ----------
const API_BASE = 'http://192.168.0.3:10001/api';
const state = {
    isQuerying: false,
    currentBillId: null,
    hasResult: false
};

// 安全 DOM 工具
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ---------- 2. 页面初始化 ----------
function initPage() {
    updateDate();
    bindEvents();
}

function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateEl = document.getElementById('dateDisplay');
    const updateEl = document.getElementById('updateTime');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', options);
    if (updateEl) updateEl.textContent = now.toLocaleString('zh-CN');
}

function bindEvents() {
    const billInput = document.getElementById('billIdInput');
    if (billInput) {
        billInput.addEventListener('input', () => {
            billInput.classList.remove('error');
        });
        billInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                queryTrace();
            }
        });
    }
}

function fillExample(billId) {
    const input = document.getElementById('billIdInput');
    if (input) {
        input.value = billId;
        input.classList.remove('error');
        input.focus();
    }
}

// ---------- 3. 查询溯源（✅ 改为真调接口） ----------
async function queryTrace() {
    const input = document.getElementById('billIdInput');
    const billId = input.value.trim();

    if (!billId) {
        input.classList.add('error');
        input.focus();
        return;
    }

    if (billId.length < 5) {
        input.classList.add('error');
        alert('数字仓单ID格式不正确，请检查后重试');
        return;
    }

    if (state.isQuerying) return;

    state.isQuerying = true;
    state.currentBillId = billId;

    showLoading();

    try {
        // 并行调三个接口
        const results = await Promise.allSettled([
            request.get('/trace/bill/' + encodeURIComponent(billId), null, { autoRedirect: false }),
            request.get('/trace/bill/' + encodeURIComponent(billId) + '/cargo', null, { autoRedirect: false }),
            request.get('/trace/bill/' + encodeURIComponent(billId) + '/timeline', null, { autoRedirect: false })
        ]);

        function pickData(res) {
            if (!res || res.status !== 'fulfilled') return null;
            const v = res.value;
            if (!v) return null;
            // 兼容 { code:200, data:{} }
            if (Number(v.code) === 200) return v.data;
            // 兼容 { success:true, data:{} }
            if (v.success === true) return v.data;
            // 兼容 { status:200, data:{} }
            if (Number(v.status) === 200) return v.data;
            // 兼容直接返回 data
            if (v.data !== undefined) return v.data;
            // 兼容直接返回业务对象
            return v;
        }

        const billData = pickData(results[0]);
        const cargoData = pickData(results[1]);
        const timelineData = pickData(results[2]) || [];

        // 主接口失败 → 提示
        if (!billData) {
            showError('未查询到该仓单的溯源数据');
            return;
        }

        showTraceResult(billId, billData, cargoData, timelineData);
    } catch (e) {
        console.error('查询溯源失败:', e);
        showError(e.message || '查询失败，请稍后重试');
    } finally {
        state.isQuerying = false;
    }
}

function showLoading() {
    const empty = document.getElementById('traceEmpty');
    const result = document.getElementById('traceResult');
    const loading = document.getElementById('traceLoading');
    if (empty) empty.style.display = 'none';
    if (result) result.style.display = 'none';
    if (loading) loading.style.display = 'flex';

    const status = document.getElementById('traceStatus');
    if (status) {
        status.className = 'status-badge pending';
        status.textContent = '查询中...';
    }
}

function showError(msg) {
    const empty = document.getElementById('traceEmpty');
    const result = document.getElementById('traceResult');
    const loading = document.getElementById('traceLoading');
    if (loading) loading.style.display = 'none';
    if (result) result.style.display = 'none';
    if (empty) {
        empty.style.display = 'flex';
        const titleEl = empty.querySelector('.empty-title');
        if (titleEl) titleEl.textContent = msg || '暂无溯源数据';
    }

    const status = document.getElementById('traceStatus');
    if (status) {
        status.className = 'status-badge empty';
        status.textContent = '未找到';
    }
}

// ---------- 4. 展示溯源结果（✅ 用后端数据填充） ----------
function showTraceResult(billId, billData, cargoData, timelineData) {
    state.hasResult = true;

    const empty = document.getElementById('traceEmpty');
    const loading = document.getElementById('traceLoading');
    const result = document.getElementById('traceResult');
    if (empty) empty.style.display = 'none';
    if (loading) loading.style.display = 'none';
    if (result) result.style.display = 'flex';

    const status = document.getElementById('traceStatus');
    if (status) {
        status.className = 'status-badge verified';
        status.textContent = '已验证';
    }

    // 货物信息：优先取 cargo 接口，回退到 bill 接口
    const cargo = cargoData || billData || {};

    // 兼容多种字段命名
    function pick(obj, keys, def = '--') {
        for (const k of keys) {
            if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
                return obj[k];
            }
        }
        return def;
    }

    setText('cargoName', pick(cargo, ['goodsName', 'goods_name', 'cargo', 'cargoName', 'name']));
    setText('cargoQty', (() => {
        const num = pick(cargo, ['goodsNum', 'goods_num', 'num', 'quantity', 'weight'], null);
        const unit = pick(cargo, ['unit', 'goodsUnit', 'goods_unit'], '吨');
        if (num !== null) return num + ' ' + unit;
        const w = pick(billData, ['goodsWeight', 'goods_weight', 'weight'], null);
        return w !== null ? w + ' 吨' : '--';
    })());
    setText('cargoOwner', pick(cargo, ['ownerName', 'owner_name', 'cargoOwner', 'cargo_owner', 'owner']));
    setText('cargoWarehouse', pick(cargo, ['warehouseName', 'warehouse_name', 'warehouseAddr', 'warehouse_addr', 'warehouse']));
    setText('cargoBillId', pick(billData, ['warehouseBillNo', 'warehouse_bill_no', 'billNo', 'bill_no'], billId));
    setText('cargoStatus', pick(cargo, ['statusText', 'status_text', 'status'], '在库'));

    // 时间轴：用后端返回的数组
    const timeline = document.getElementById('traceTimeline');
    if (!timeline) return;

    let list = [];
    if (Array.isArray(timelineData)) {
        list = timelineData;
    } else if (timelineData && typeof timelineData === 'object') {
        list = timelineData.list || timelineData.records || timelineData.rows || timelineData.data || [];
    }
    if (!Array.isArray(list)) list = [];
    if (list.length === 0) {
        timeline.innerHTML = '<div style="color:#9ab0c2;text-align:center;padding:20px 0;">暂无流转记录</div>';
        return;
    }

    const colorMap = {
        '仓储方': 'green', '交易平台': 'blue',
        '登记机构': 'purple', '物流方': 'orange'
    };

    timeline.innerHTML = list.map(item => {
        const tag = item.chainTag || item.chain_tag || item.source || item.orgType || item.org_type || '链上';
        const title = item.title || item.event || item.action || item.eventName || item.event_name || '链上事件';
        const desc = item.desc || item.description || item.content || item.remark || '';
        const time = item.time || item.createTime || item.create_time || item.timestamp || '--';
        const hash = item.txHash || item.tx_hash || item.hash || item.txId || item.tx_id || '--';
        const shortHash = String(hash).length > 12
            ? (hash.slice(0, 6) + '...' + hash.slice(-4))
            : hash;

        return `
                    <div class="timeline-item">
                        <div class="tl-icon ${color}"></div>
                        <div class="tl-content">
                            <div class="tl-title">
                                ${title}
                                <span class="chain-tag">${tag}上链</span>
                            </div>
                            <div class="tl-desc">${desc}</div>
                            <div class="tl-meta">
                                <span class="meta-item">${time}</span>
                                <span class="meta-item hash">${shortHash}</span>
                            </div>
                        </div>
                    </div>
                `;
    }).join('');
}

// ---------- 5. 通用函数 ----------
function handleLogout() {
    if (confirm('确定退出登录？')) {
        localStorage.removeItem('token');
        localStorage.removeItem('current_user');
        window.location.href = '登录-平台管理.html';
    }
}

function handleSettings() {
    window.location.href = '设置.html';
}

// ---------- 6. 启动 ----------
document.addEventListener('DOMContentLoaded', initPage);