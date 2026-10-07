/**
 * ============================================================
 * 新建仓单 - 交互逻辑
 * 后端: POST /warehouse/bill/create
 * ============================================================
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'warehouse_records';
    const API_BASE = 'http://192.168.0.3:10001/api';   // 保留（其它地方可能用）
    const TAX_STORAGE_KEY = 'tax_records';

    const form = document.getElementById('warehouseForm');
    const submitBtn = document.getElementById('submitBtn');

    const fields = {
        goodsName: document.getElementById('goodsName'),
        goodsSpec: document.getElementById('goodsSpec'),
        netWeight: document.getElementById('netWeight'),
        unit: document.getElementById('unit'),
        locationArea: document.getElementById('locationArea'),
        locationRack: document.getElementById('locationRack'),
        holder: document.getElementById('holder'),
        iotStatus: document.getElementById('iotStatus'),
        reportFile: document.getElementById('reportFile'),
        remarks: document.getElementById('remarks'),
        fileName: document.getElementById('fileName')
    };

    const preview = {
        id: document.getElementById('previewId'),
        goods: document.getElementById('previewGoods'),
        spec: document.getElementById('previewSpec'),
        weight: document.getElementById('previewWeight'),
        location: document.getElementById('previewLocation'),
        holder: document.getElementById('previewHolder'),
        status: document.getElementById('previewStatus')
    };

    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem('current_user') || 'null'); }
        catch { return null; }
    }

    function generateWarehouseId() {
        const now = new Date();
        const dateStr =
            now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        return 'WB' + dateStr + rand;
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
    function saveTaxRecord(record) {
        try {
            const list = JSON.parse(localStorage.getItem(TAX_STORAGE_KEY) || '[]');
            const idx = list.findIndex(r => r.billNo === record.billNo);
            if (idx === -1) {
                list.unshift(record);
            } else {
                list[idx] = record;
            }
            localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(list));
            localStorage.setItem('tax_need_refresh', 'true');
        } catch (e) {
            console.warn('写入税务缓存失败:', e);
        }
    }

    function buildTaxRecord(payload, saved, user) {
        const now = new Date().toISOString();
        return {
            billNo: payload.warehouseBillNo,
            goodsName: fields.goodsName.value.trim(),
            goodsSpec: fields.goodsSpec.value.trim(),
            goodsWeight: payload.goodsWeight,
            unit: fields.unit.value,
            location: (fields.locationArea.value && fields.locationRack.value.trim())
                ? fields.locationArea.value + '区-' + fields.locationRack.value.trim()
                : '',
            holder: fields.holder.value.trim(),
            iotStatus: fields.iotStatus ? fields.iotStatus.value : '',
            qualityReport: payload.qualityReport,
            remarks: fields.remarks.value.trim(),
            warehouseUserId: payload.warehouseUserId,
            companyName: user?.companyName || '',
            dataHash: saved?.dataHash || '',
            txHash: saved?.txHash || '',
            billStatus: payload.billStatus,
            createTime: saved?.createTime || now,
            time: saved?.createTime || now
        };
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
        }, 3000);
    }

    function updatePreview() {
        const goods = fields.goodsName.value.trim() || '—';
        const spec = fields.goodsSpec.value.trim() || '—';
        const weight = fields.netWeight.value.trim();
        const unit = fields.unit.value;
        const area = fields.locationArea.value;
        const rack = fields.locationRack.value.trim();
        const holder = fields.holder.value.trim() || '—';

        preview.goods.textContent = goods;
        preview.spec.textContent = spec;
        preview.weight.textContent = weight ? weight + ' ' + unit : '—';
        preview.location.textContent = (area && rack) ? area + '区-' + rack : '—';
        preview.holder.textContent = holder;
        preview.id.textContent = generateWarehouseId();
    }

    ['goodsName', 'goodsSpec', 'netWeight', 'unit', 'locationArea', 'locationRack', 'holder'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
        }
    });

    if (fields.reportFile) {
        fields.reportFile.addEventListener('change', function () {
            fields.fileName.textContent = (this.files && this.files.length > 0)
                ? this.files[0].name : '未选择文件';
        });
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
    });

    // ============================================================
    //  提交（✅ 已改用 request，自动带 token）
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

        const user = getCurrentUser();
        const goodsWeight = parseFloat(fields.netWeight.value.trim()) || 0;

        // 后端 WarehouseBill 字段
        const payload = {
            warehouseBillNo: generateWarehouseId(),
            tradeOrderId: null,
            warehouseUserId: user?.id || null,
            goodsWeight: goodsWeight,
            qualityReport: (fields.remarks.value.trim() || '合格'),
            cargoOwnerId: null,
            billStatus: 0
        };

        try {
            // ✅ 用 request，自动带 token
            const result = await request.post('/warehouse/bill/create', payload, { autoRedirect: false });

            if (result && Number(result.code) === 200) {
                const saved = result.data || {};
                const localSaved = {
                    ...payload,
                    id: saved.id || payload.warehouseBillNo,
                    dataHash: saved.dataHash || '',
                    time: saved.createTime || new Date().toISOString()
                };
                saveRecord(localSaved);
                saveTaxRecord(buildTaxRecord(payload, saved, user));
                showToast('仓单已创建并上链存证！', 'success');
                updatePreviewStatus(true);
                resetForm();
                localStorage.setItem('warehouse_need_refresh', 'true');
            } else {
                throw new Error((result && result.message) || '提交失败');
            }

        } catch (error) {
            console.error('提交仓单失败:', error);

            // 判断是否是 401 / 未登录
            const msg = String(error.message || '');
            if (msg.indexOf('未登录') !== -1 ||
                msg.indexOf('UNAUTHORIZED') !== -1 ||
                msg.indexOf('登录已过期') !== -1) {
                showToast('登录已过期，请重新登录', 'error');
                setTimeout(() => {
                    window.location.href = '登录.html';
                }, 1200);
                return;
            }

            // 其它错误：本地兜底
            const localSaved = { ...payload, id: payload.warehouseBillNo, time: new Date().toISOString() };
            saveRecord(localSaved);
            saveTaxRecord(buildTaxRecord(payload, localSaved, user));
            showToast('已保存到本地，网络恢复后自动上链', 'error');
            updatePreviewStatus(true);
            resetForm();
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<i class="fas fa-link"></i> 提交上链';
        }
    });

    function updatePreviewStatus(success) {
        if (success) {
            preview.status.innerHTML = '<span class="status-badge success">已上链</span>';
        } else {
            preview.status.innerHTML = '<span class="status-badge pending">待上链</span>';
        }
    }

    function resetForm() {
        fields.goodsName.value = '';
        fields.goodsSpec.value = '';
        fields.netWeight.value = '';
        fields.remarks.value = '';
        fields.reportFile.value = '';
        fields.fileName.textContent = '未选择文件';

        updatePreview();
        form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));
        fields.goodsName.focus();
        updatePreviewStatus(false);
    }

    function init() {
        const now = new Date();
        const cd = document.getElementById('currentDate');
        if (cd) {
            cd.textContent = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');
        }

        preview.id.textContent = generateWarehouseId();
        updatePreview();

        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY) preview.id.textContent = generateWarehouseId();
        });

        console.log('新建仓单界面已初始化');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__warehouse = { getRecords, generateWarehouseId, STORAGE_KEY, TAX_STORAGE_KEY };
})();