// ============================================================
// 新增交易
// 后端: POST /order/create
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留
const STORAGE_KEY = 'trade_records';

const form = document.getElementById('tradeForm');
const submitBtn = document.getElementById('submitBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const cancelBtn = document.getElementById('cancelBtn');
const continueBtn = document.getElementById('continueBtn');
const goHomeBtn = document.getElementById('goHomeBtn');
const successBanner = document.getElementById('successBanner');

const tradeId = document.getElementById('tradeId');
const tradeCategory = document.getElementById('tradeCategory');
const tradeAmount = document.getElementById('tradeAmount');
const tradeCounterparty = document.getElementById('tradeCounterparty');
const tradeWarehouse = document.getElementById('tradeWarehouse');
const tradeStatus = document.getElementById('tradeStatus');
const tradeQuantity = document.getElementById('tradeQuantity');
const tradeUnit = document.getElementById('tradeUnit');
const tradeRemarks = document.getElementById('tradeRemarks');
const fileUpload = document.getElementById('fileUpload');
const fileName = document.getElementById('fileName');

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
    }, 3500);
}

function setLoading(loading) {
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> 创建中...';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> 创建';
    }
}

function generateTradeId() {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return 'TX-' + dateStr + '-' + seq;
}

function validateField(input) {
    const group = input.closest('.form-group');
    if (!group) return true;
    if (input.hasAttribute('required') && !input.value.trim()) {
        group.classList.add('error');
        return false;
    }
    if (input.type === 'number' && input.value && parseFloat(input.value) <= 0) {
        group.classList.add('error');
        return false;
    }
    group.classList.remove('error');
    return true;
}

function validateForm() {
    const inputs = form.querySelectorAll('input[required], select[required]');
    let valid = true;
    inputs.forEach(input => { if (!validateField(input)) valid = false; });
    return valid;
}

form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('blur', function () { validateField(this); });
    el.addEventListener('input', function () {
        if (this.closest('.form-group')?.classList.contains('error')) validateField(this);
    });
    el.addEventListener('change', function () {
        if (this.closest('.form-group')?.classList.contains('error')) validateField(this);
    });
});

if (fileUpload) {
    fileUpload.addEventListener('change', function () {
        fileName.textContent = this.files.length > 0 ? this.files[0].name : '未选择文件';
    });
}

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateForm()) {
        const firstError = form.querySelector('.form-group.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.querySelector('input, select')?.focus();
        }
        showToast('请完善所有必填项', 'error');
        return;
    }

    const goodsNum = parseFloat(tradeQuantity.value) || 0;
    const tradePrice = parseFloat(tradeAmount.value) || 0;

    if (goodsNum <= 0) { showToast('数量必须大于 0', 'error'); return; }
    if (tradePrice <= 0) { showToast('价格必须大于 0', 'error'); return; }

    // ================= 新增：显式校验仓库是否已选择 =================
    // 获取下拉框的值并转为数字
    const warehouseUserId = parseInt(tradeWarehouse.value, 10);

    // 如果没选（值为""），parseInt 会得到 NaN
    if (isNaN(warehouseUserId)) {
        showToast('请先选择仓库', 'error');
        // 给表单组加上报错红框（如果外层有 .form-group）
        const group = tradeWarehouse.closest('.form-group');
        if (group) group.classList.add('error');
        return; // 阻止提交
    }
    // ==============================================================

    // 后端 CreateOrderDTO 字段
    const payload = {
        warehouseUserId: warehouseUserId, // 使用上面校验过的变量，确保不是 null
        goodsName: tradeCategory.value.trim(),
        goodsNum: goodsNum,
        tradePrice: String(tradePrice),
        dataHash: ''
    };

    // ... 后续代码保持不变

    setLoading(true);

    try {
        // ✅ 用 request，自动带 token
        const data = await request.post('/order/create', payload, { autoRedirect: false });

        if (!data || Number(data.code) !== 200) {
            throw new Error((data && data.message) || '创建订单失败');
        }

        const result = data.data || {};

        // 本地备份
        const fullRecord = {
            id: result.orderNo,
            orderId: result.id,
            category: result.goodsName,
            amount: result.tradePrice,
            counterparty: tradeCounterparty.value.trim(),
            warehouse: result.warehouseAddr || '',
            status: '待入库',
            orderStatus: result.orderStatus ?? 0,
            quantity: result.goodsNum,
            unit: tradeUnit.value,
            remarks: tradeRemarks.value.trim(),
            txHash: result.txHash || '',
            dataHash: result.dataHash || '',
            createdAt: result.createTime || new Date().toISOString()
        };
        try {
            const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            records.unshift(fullRecord);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
            localStorage.setItem('trade_need_refresh', 'true');
            const homeCache = JSON.parse(localStorage.getItem('home_new_trades') || '[]');
            homeCache.unshift(fullRecord);
            localStorage.setItem('home_new_trades', JSON.stringify(homeCache));
        } catch (e) { console.warn('本地保存失败:', e); }

        const sd = document.getElementById('successDetail');
        if (sd) {
            sd.innerHTML =
                `订单号：<strong>${fullRecord.id}</strong> | TxID：<span style="font-family:monospace;">${fullRecord.txHash || '--'}</span>`;
        }

        if (form) form.style.display = 'none';
        if (successBanner) successBanner.classList.add('show');

        showToast('订单创建成功！已上链存证', 'success');

    } catch (error) {
        console.error('提交失败:', error);

        // ✅ 401 / 403 精确区分
        const msg = String(error.message || '');
        if (msg.indexOf('未登录') !== -1 || msg.indexOf('UNAUTHORIZED') !== -1) {
            showToast('登录已过期，请重新登录', 'error');
            setTimeout(() => { window.location.href = '登录-贸易商.html'; }, 1200);
            return;
        }
        if (msg.indexOf('无权限') !== -1 || msg.indexOf('403') !== -1) {
            showToast('无权限创建订单，请联系管理员', 'error');
            return;
        }
        showToast('提交失败: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
});

function resetForm() {
    tradeId.value = generateTradeId();
    tradeCategory.value = '';
    tradeAmount.value = '';
    tradeCounterparty.value = '';
    tradeWarehouse.value = '';
    tradeStatus.value = '';
    tradeQuantity.value = '';
    tradeUnit.value = '吨';
    tradeRemarks.value = '';
    if (fileUpload) fileUpload.value = '';
    if (fileName) fileName.textContent = '未选择文件';
    form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));
    if (form) form.style.display = 'block';
    if (successBanner) successBanner.classList.remove('show');
}

if (resetFormBtn) resetFormBtn.addEventListener('click', resetForm);

if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
        if (confirm('确认取消？已填写的内容将丢失。')) {
            window.location.href = '首页.html';
        }
    });
}

if (goHomeBtn) {
    goHomeBtn.addEventListener('click', function () {
        window.location.href = '首页.html';
    });
}

if (continueBtn) {
    continueBtn.addEventListener('click', function () {
        resetForm();
        const fc = document.querySelector('.form-container');
        if (fc) fc.scrollIntoView({ behavior: 'smooth' });
        showToast('已重置，可以继续新增', '');
    });
}

function init() {
    tradeId.value = generateTradeId();
    console.log('新增交易已启动 (API: ' + API_BASE + ')');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.__trade = { generateTradeId, resetForm };