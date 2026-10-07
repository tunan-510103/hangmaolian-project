(function () {
    // ============================================================
    // 配置
    // ============================================================
    const API_BASE = 'http://192.168.0.3:10001/api';

    // ============================================================
    // 生成单证编号： LC + 年月日 + 4位随机
    // ============================================================
    function generateDocNo() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const rand = String(Math.floor(Math.random() * 9000) + 1000);
        return `LC${y}${m}${d}-${rand}`;
    }

    const docNoInput = document.getElementById('docNo');
    docNoInput.value = generateDocNo();

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
        }, 2600);
    }

    // ============================================================
    // 获取当前用户
    // ============================================================
    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('current_user') || 'null');
        } catch {
            return null;
        }
    }

    // ============================================================
    // 通用请求方法（不依赖 request.js，防止未加载时失败）
    // ============================================================
    async function apiRequest(method, path, body, params) {
        let url = API_BASE + path;
        if (params && typeof params === 'object') {
            const qs = new URLSearchParams(params).toString();
            if (qs) url += (url.includes('?') ? '&' : '?') + qs;
        }
        const token = localStorage.getItem('token') || '';
        const options = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': 'Bearer ' + token } : {})
            }
        };
        if (body && method.toUpperCase() !== 'GET') {
            options.body = JSON.stringify(body);
        }

        // 超时控制
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        options.signal = controller.signal;

        try {
            const resp = await fetch(url, options);
            clearTimeout(timeout);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            return await resp.json();
        } catch (e) {
            clearTimeout(timeout);
            throw e;
        }
    }

    // ============================================================
    // 后端接口封装
    // ============================================================

    /**
     * 新建物流（核心接口）
     * POST /logistics/create
     */
    async function apiCreateLogistics(payload) {
        return await apiRequest('POST', '/logistics/create', payload);
    }

    /**
     * 校验单证编号是否已存在
     * GET /logistics/checkDocNo?docNo=xxx
     */
    async function apiCheckDocNo(docNo) {
        return await apiRequest('GET', '/logistics/checkDocNo', null, { docNo });
    }

    // ============================================================
    // 本地存储兜底（后端不可用时使用，同时用于立即可见）
    // ============================================================
    function addToArchive(record) {
        const KEY = 'archive_records';
        let list = [];
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) list = JSON.parse(raw);
            if (!Array.isArray(list)) list = [];
        } catch {
            list = [];
        }
        list = list.filter(item => item.certId !== record.certId);
        list.unshift(record);
        localStorage.setItem(KEY, JSON.stringify(list));
    }

    function addToLogisticsDocs(doc) {
        const KEY = 'logistics_docs';
        let docs = [];
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) docs = JSON.parse(raw);
            if (!Array.isArray(docs)) docs = [];
        } catch {
            docs = [];
        }
        docs = docs.filter(d => d.docNo !== doc.docNo);
        docs.unshift(doc);
        localStorage.setItem(KEY, JSON.stringify(docs));
    }

    // ============================================================
    // 校验
    // ============================================================
    const requiredFields = ['logisticsNo', 'goodsName', 'currentLocation'];

    function clearErrors() {
        requiredFields.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.classList.remove('error');
            const err = document.getElementById('err-' + id);
            if (err) err.classList.remove('show');
        });
    }

    function validate() {
        let valid = true;
        clearErrors();
        requiredFields.forEach(id => {
            const input = document.getElementById(id);
            if (!input || !input.value.trim()) {
                if (input) input.classList.add('error');
                const err = document.getElementById('err-' + id);
                if (err) err.classList.add('show');
                valid = false;
            }
        });
        return valid;
    }

    // 输入时清除错误
    requiredFields.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function () {
                this.classList.remove('error');
                const err = document.getElementById('err-' + id);
                if (err) err.classList.remove('show');
            });
        }
    });

    // ============================================================
    // 表单提交（融合后端接口 + 本地兜底）
    // ============================================================
    const form = document.getElementById('logisticsForm');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validate()) {
            showToast('请填写必填项');
            return;
        }

        const docNo = docNoInput.value.trim();
        const logisticsNo = document.getElementById('logisticsNo').value.trim();
        const goodsName = document.getElementById('goodsName').value.trim();
        const currentLocation = document.getElementById('currentLocation').value.trim();
        const fromLocation = document.getElementById('fromLocation').value.trim() || '--';
        const toLocation = document.getElementById('toLocation').value.trim() || '--';
        const transportInfo = document.getElementById('transportInfo').value.trim() || '--';
        const logisticsStatus = document.getElementById('logisticsStatus').value;
        const remark = document.getElementById('remark').value.trim();

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        let statusText = '进行中';
        if (logisticsStatus === '2') statusText = '已完成';
        else if (logisticsStatus === '3') statusText = '异常';

        // 禁用按钮，防止重复提交
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';

        // 构造请求体（传给后端）
        const payload = {
            docNo: docNo,
            logisticsNo: logisticsNo,
            goodsName: goodsName,
            currentLocation: currentLocation,
            fromLocation: fromLocation,
            toLocation: toLocation,
            transportInfo: transportInfo,
            logisticsStatus: Number(logisticsStatus),
            logisticsStatusText: statusText,
            remark: remark
        };

        let backendSuccess = false;
        let backendData = null;
        let errorMsg = '';

        // ---------- 优先调用后端 ----------
        try {
            // 可选：先校验单证编号是否重复
            try {
                const checkResp = await apiCheckDocNo(docNo);
                if (checkResp && Number(checkResp.code) === 200 && checkResp.data && checkResp.data.exists) {
                    showToast('单证编号已存在，请刷新页面重试');
                    submitBtn.disabled = false;
                    submitBtn.textContent = '新建物流';
                    return;
                }
            } catch (checkErr) {
                console.warn('单证编号校验接口失败，跳过校验:', checkErr);
            }

            const resp = await apiCreateLogistics(payload);
            if (resp && Number(resp.code) === 200) {
                backendSuccess = true;
                backendData = resp.data || {};
            } else {
                errorMsg = (resp && resp.message) || '后端返回异常';
                console.warn('后端新建失败:', errorMsg);
            }
        } catch (err) {
            errorMsg = err.message || '网络异常';
            console.warn('后端接口不可用，使用本地兜底:', errorMsg);
        }

        // ---------- 构造本地记录（无论后端是否成功都写入，确保前端可见） ----------
        const archiveRecord = {
            certId: (backendData && backendData.docNo) || docNo,
            type: '运单',
            cargo: goodsName,
            taskId: (backendData && backendData.logisticsNo) || logisticsNo,
            time: (backendData && backendData.createTime) ? formatTime(backendData.createTime) : timeStr,
            timeRaw: (backendData && backendData.createTime) || now.toISOString(),
            status: statusText === '已完成' ? '通过' : (statusText === '异常' ? '异常' : '待验证'),
            fromLocation: fromLocation,
            toLocation: toLocation,
            currentLocation: currentLocation,
            transportInfo: transportInfo,
            remark: remark,
            createdAt: now.toISOString(),
            creator: getCurrentUser()?.username || '物流方',
            // 后端返回的链上信息（如有）
            txHash: (backendData && backendData.txHash) || null,
            backendId: (backendData && backendData.id) || null
        };

        const docRecord = {
            docNo: (backendData && backendData.docNo) || docNo,
            logisticsNo: logisticsNo,
            goodsName: goodsName,
            currentLocation: currentLocation,
            fromLocation: fromLocation,
            toLocation: toLocation,
            transportInfo: transportInfo,
            logisticsStatus: logisticsStatus,
            remark: remark,
            createTime: (backendData && backendData.createTime) || now.toISOString(),
            id: (backendData && backendData.id) || Date.now(),
            warehouseBillId: null,
            orderId: 'ORD-' + Date.now().toString().slice(-6),
            logisticsStatusText: statusText,
            type: '运单'
        };

        addToArchive(archiveRecord);
        addToLogisticsDocs(docRecord);

        // ---------- 提示与跳转 ----------
        if (backendSuccess) {
            showToast(`新建物流成功！单证编号：${docNo}`);
        } else {
            showToast(`已保存到本地（后端暂不可用）单证编号：${docNo}`);
        }

        submitBtn.textContent = '已创建';

        setTimeout(() => {
            if (window.opener && !window.opener.closed) {
                try { window.opener.location.reload(); } catch (e) { }
                window.close();
            } else {
                window.location.href = '物流方-存证档案.html';
            }
        }, 1500);
    });

    // ============================================================
    // 工具：格式化时间（用于后端返回的 createTime）
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

    console.log('航贸链 · 新建物流页面已启动 (API: ' + API_BASE + ')');
})();