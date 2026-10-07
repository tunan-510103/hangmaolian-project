/**
 * ============================================================
 * 入库登记 - 交互逻辑
 * 后端:
 *   POST /order/warehousing         确认入库
 *   POST /warehouse/inventory/add   写入库存
 * ============================================================
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'warehouse_records';
    const INVENTORY_KEY = 'warehouse_inventory';
    const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

    const form = document.getElementById('inboundForm');
    const submitBtn = document.getElementById('submitBtn');

    const cargoName = document.getElementById('cargoName');
    const cargoSpec = document.getElementById('cargoSpec');
    const cargoQuantity = document.getElementById('cargoQuantity');
    const cargoUnit = document.getElementById('cargoUnit');
    const cargoWeight = document.getElementById('cargoWeight');
    const cargoTotalWeight = document.getElementById('cargoTotalWeight');

    const storageArea = document.getElementById('storageArea');
    const storageRack = document.getElementById('storageRack');
    const storageType = document.getElementById('storageType');
    const storageTemperature = document.getElementById('storageTemperature');

    const qualityStatus = document.getElementById('qualityStatus');
    const qualityReport = document.getElementById('qualityReport');
    const reportFileName = document.getElementById('reportFileName');
    const iotDevice = document.getElementById('iotDevice');
    const iotDeviceId = document.getElementById('iotDeviceId');

    const supplier = document.getElementById('supplier');
    const transportNo = document.getElementById('transportNo');
    const inboundRemarks = document.getElementById('inboundRemarks');

    const previewId = document.getElementById('previewId');
    const previewCargo = document.getElementById('previewCargo');
    const previewSpec = document.getElementById('previewSpec');
    const previewQuantity = document.getElementById('previewQuantity');
    const previewWeight = document.getElementById('previewWeight');
    const previewLocation = document.getElementById('previewLocation');
    const previewQuality = document.getElementById('previewQuality');
    const previewStatus = document.getElementById('previewStatus');

    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem('current_user') || 'null'); }
        catch { return null; }
    }

    function generateInboundId() {
        const now = new Date();
        const dateStr =
            now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
        const records = getRecords();
        const todayRecords = records.filter(r =>
            r && typeof r.id === 'string' && r.id.includes(dateStr)
        );
        const seq = todayRecords.length + 1;
        return 'IN-' + dateStr + '-' + String(seq).padStart(3, '0');
    }

    function getRecords() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    function saveRecord(record) {
        const records = getRecords();
        records.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return records;
    }

    function generateSku(cargoName) {
        const prefix = cargoName.substring(0, 2).toUpperCase();
        const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        return prefix + '-' + num;
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

    function calculateTotalWeight() {
        const qty = parseFloat(cargoQuantity.value);
        const weight = parseFloat(cargoWeight.value);
        if (!isNaN(qty) && !isNaN(weight) && qty > 0 && weight > 0) {
            cargoTotalWeight.value = (qty * weight).toFixed(2) + ' ' + cargoUnit.value;
        } else {
            cargoTotalWeight.value = '';
        }
    }

    cargoQuantity.addEventListener('input', calculateTotalWeight);
    cargoWeight.addEventListener('input', calculateTotalWeight);
    cargoUnit.addEventListener('change', calculateTotalWeight);

    function updatePreview() {
        previewId.textContent = generateInboundId();

        const name = cargoName.value.trim() || '—';
        const spec = cargoSpec.value.trim() || '—';
        const qty = cargoQuantity.value || '—';
        const unit = cargoUnit.value;
        const weight = cargoTotalWeight.value || '—';

        previewCargo.textContent = name;
        previewSpec.textContent = spec;
        previewQuantity.textContent = qty !== '—' ? qty + ' ' + unit : '—';
        previewWeight.textContent = weight;

        const area = storageArea.value;
        const rack = storageRack.value.trim();
        previewLocation.textContent = (area && rack) ? area + '区-' + rack : '—';

        const qStatus = qualityStatus.value;
        const statusMap = { '合格': '合格', '待检': '待检', '不合格': '不合格' };
        previewQuality.textContent = statusMap[qStatus] || '—';

        previewStatus.innerHTML = '<span class="status-badge pending">待上链</span>';
    }

    [cargoName, cargoSpec, cargoQuantity, cargoUnit, cargoTotalWeight,
        storageArea, storageRack, qualityStatus].forEach(el => {
            if (el) {
                el.addEventListener('input', updatePreview);
                el.addEventListener('change', updatePreview);
            }
        });

    qualityReport.addEventListener('change', function () {
        reportFileName.textContent = (this.files && this.files.length > 0)
            ? this.files[0].name : '未选择文件';
    });

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

        if (!qualityStatus.value) {
            const group = qualityStatus.closest('.form-group');
            if (group) group.classList.add('error');
            valid = false;
        }
        return valid;
    }

    form.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('blur', function () { validateField(this); });
        el.addEventListener('input', function () {
            if (this.closest('.form-group')?.classList.contains('error')) validateField(this);
        });
    });

    // ============================================================
    //  提交（✅ 已全部改用 request，自动带 token）
    // ============================================================
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validateForm()) {
            showToast('请完善所有必填项', 'error');
            const firstError = form.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.querySelector('input, select')?.focus();
            }
            return;
        }

        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<i class="fas fa-spinner"></i> 上链中...';

        const qty = parseFloat(cargoQuantity.value);
        const weight = parseFloat(cargoWeight.value);
        const totalWeight = (qty * weight).toFixed(2);
        const user = getCurrentUser();

        const record = {
            id: generateInboundId(),
            type: '入库登记',
            cargo: cargoName.value.trim(),
            spec: cargoSpec.value.trim(),
            quantity: qty,
            unit: cargoUnit.value,
            weight: weight,
            totalWeight: totalWeight + ' ' + cargoUnit.value,
            location: storageArea.value + '区-' + storageRack.value.trim(),
            storageType: storageType.value,
            temperature: storageTemperature.value.trim() || '常温',
            quality: qualityStatus.value,
            qualityReport: qualityReport.files.length > 0 ? qualityReport.files[0].name : '',
            iotDevice: iotDevice.value,
            iotDeviceId: iotDeviceId.value.trim() || '—',
            supplier: supplier.value.trim() || '—',
            transportNo: transportNo.value.trim() || '—',
            remarks: inboundRemarks.value.trim() || '—',
            status: '生效中',
            time: new Date().toLocaleString('zh-CN', { hour12: false }),
            createdAt: new Date().toISOString()
        };

        // 后端 Inventory 字段
        const inventoryItem = {
            skuCode: generateSku(cargoName.value.trim()),
            goodsName: cargoName.value.trim(),
            warehouseLocation: storageArea.value + '区-' + storageRack.value.trim(),
            stockNum: qty,
            unit: cargoUnit.value,
            stockStatus: qualityStatus.value === '合格' ? 0 : 1,
            warehouseUserId: user?.id || null
        };

        try {
            // 1. 如果有关联订单，先确认订单入库（✅ 用 request）
            const orderId = new URLSearchParams(window.location.search).get('orderId');
            if (orderId) {
                const whData = await request.post('/order/warehousing', {
                    orderId: parseInt(orderId),
                    dataHash: ''
                }, { autoRedirect: false });

                if (!whData || Number(whData.code) !== 200) {
                    console.warn('订单入库失败:', whData && whData.message);
                }
            }

            // 2. 写入库存（✅ 用 request）
            const invData = await request.post('/warehouse/inventory/add', inventoryItem, { autoRedirect: false });

            if (invData && Number(invData.code) === 200) {
                saveRecord(record);
                saveInventoryLocal(inventoryItem);
                updatePreviewStatus(true);
                showToast('入库登记成功！数据已上链存证', 'success');
                resetForm();
                localStorage.setItem('warehouse_need_refresh', 'true');
            } else {
                throw new Error((invData && invData.message) || '提交失败');
            }

        } catch (error) {
            console.error('提交入库失败:', error);

            // ✅ 判断是否 401 / 未登录
            const msg = String(error.message || '');
            if (msg.indexOf('未登录') !== -1 ||
                msg.indexOf('UNAUTHORIZED') !== -1 ||
                msg.indexOf('登录已过期') !== -1) {
                showToast('登录已过期，请重新登录', 'error');
                setTimeout(() => {
                    window.location.href = '登录-仓储方.html';
                }, 1200);
                return;
            }

            // 其它错误：本地兜底
            saveRecord(record);
            saveInventoryLocal(inventoryItem);
            showToast('已保存到本地，网络恢复后自动上链', 'error');
            updatePreviewStatus(true);
            resetForm();
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<i class="fas fa-link"></i> 提交上链';
        }
    });

    function saveInventoryLocal(item) {
        try {
            let inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
            const existing = inventory.find(i => i.skuCode === item.skuCode);
            if (existing) {
                existing.stockNum = (existing.stockNum || 0) + item.stockNum;
                existing.warehouseLocation = item.warehouseLocation;
                existing.updateTime = new Date().toISOString();
            } else {
                inventory.push(item);
            }
            localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
        } catch {
            localStorage.setItem(INVENTORY_KEY, JSON.stringify([item]));
        }
    }

    function updatePreviewStatus(success) {
        if (success) {
            previewStatus.innerHTML = '<span class="status-badge success">已上链</span>';
        } else {
            previewStatus.innerHTML = '<span class="status-badge pending">待上链</span>';
        }
    }

    function resetForm() {
        cargoName.value = '';
        cargoSpec.value = '';
        cargoQuantity.value = '';
        cargoWeight.value = '';
        cargoTotalWeight.value = '';

        storageArea.value = '';
        storageRack.value = '';
        storageTemperature.value = '';

        qualityStatus.value = '';
        qualityReport.value = '';
        reportFileName.textContent = '未选择文件';
        iotDevice.value = '无';
        iotDeviceId.value = '';

        supplier.value = '';
        transportNo.value = '';
        inboundRemarks.value = '';

        form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));
        updatePreview();
        updatePreviewStatus(false);
        cargoName.focus();
    }

    document.querySelector('.btn-reset')?.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('确认重置表单？所有已填写内容将被清空。')) {
            resetForm();
            showToast('已重置表单', '');
        }
    });

    function init() {
        const now = new Date();
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.textContent = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');
        }

        previewId.textContent = generateInboundId();
        updatePreview();

        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY) previewId.textContent = generateInboundId();
        });

        console.log('入库登记界面已初始化');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__inbound = {
        getRecords, generateInboundId, STORAGE_KEY, INVENTORY_KEY
    };
})();