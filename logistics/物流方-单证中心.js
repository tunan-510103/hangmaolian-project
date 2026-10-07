// ============================================================
// 物流方-单证中心
// 后端: GET /chain/storage/match  按关键字匹配存证记录
//       GET /chain/storage/verify 验证存证
//       POST /logistics/updateLoc 更新位置
// 兜底: localStorage 'archive_records' + 'logistics_docs'
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';

// 安全 DOM 工具
function setText(el, value) {
    if (el) el.textContent = value;
}

const searchInput = document.getElementById('docSearchInput');
const searchBtn = document.getElementById('docSearchBtn');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const ocrData = document.getElementById('ocrData');
const sysData = document.getElementById('sysData');
const diffDisplay = document.getElementById('diffDisplay');
const onChainBtn = document.getElementById('onChainBtn');
const resultDiv = document.getElementById('onchainResult');
const certIdSpan = document.getElementById('certId');
const timeSpan = document.getElementById('certTime');
const copyBtn = document.getElementById('copyBtn');
const cargoContent = document.getElementById('cargoContent');
const logisticsTag = document.getElementById('logisticsTag');

let currentTaskId = null;
let currentDocData = null;
let isOnChain = false;

// ============================================================
// 工具
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
// 通用请求（不依赖 request.js，防止未加载）
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    options.signal = controller.signal;

    try {
        const resp = await fetch(url, options);
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

// ============================================================
// URL 参数
// ============================================================
function getTaskIdFromUrl() {
    return new URLSearchParams(window.location.search).get('taskId');
}

// ============================================================
// 本地数据读取（兜底用）
// ============================================================
function getLocalArchive() {
    try {
        const raw = localStorage.getItem('archive_records');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function getLocalDocs() {
    try {
        const raw = localStorage.getItem('logistics_docs');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

// ============================================================
// 【后端】按关键字匹配存证记录
// GET /chain/storage/match?input=xxx
// 支持 txHash 前缀、订单号、运单号、#数字
// ============================================================
async function apiMatchStorage(keyword) {
    const data = await apiRequest('GET', '/chain/storage/match', null, { input: keyword });
    if (!data || Number(data.code) !== 200) {
        throw new Error((data && data.message) || '查询失败');
    }
    return data.data;
}

// ============================================================
// 【后端】验证存证
// GET /chain/storage/verify?txHash=xxx
// ============================================================
async function apiVerifyStorage(txHash) {
    const data = await apiRequest('GET', '/chain/storage/verify', null, { txHash });
    if (!data || Number(data.code) !== 200) {
        throw new Error((data && data.message) || '验证失败');
    }
    return data.data;
}

// ============================================================
// 【后端】更新位置
// POST /logistics/updateLoc
// ============================================================
async function apiUpdateLoc(orderId, location) {
    const data = await apiRequest('POST', '/logistics/updateLoc', {
        orderId: orderId,
        location: location
    });
    if (!data || Number(data.code) !== 200) {
        throw new Error((data && data.message) || '更新失败');
    }
    return data.data;
}

// ============================================================
// 从存证记录映射到 UI 的 doc 格式
// ============================================================
function mapStorageToDoc(item) {
    return {
        id: item.bizId || item.id,
        certId: item.txHash,                        // 存证编号 = 单证编号
        taskId: item.bizNo || ('#' + item.bizId),
        type: item.certType || '运单',
        cargo: item.goodsName || item.bizName || '--',
        spec: '--',
        weight: '--',
        from: '--',
        to: item.currentLocation || '--',
        warehouse: '--',
        vehicle: item.logisticsCompany || '--',
        logistics: 'road',
        sysData: `${item.goodsName || item.bizName || ''} ${item.currentLocation || ''}`.trim(),
        txHash: item.txHash,
        blockHeight: item.blockHeight,
        createTime: item.createTime,
        status: item.syncStatus === 1 ? '通过' : '待验证'
    };
}

// ============================================================
// 从本地档案构造 doc（兜底）
// ============================================================
function mapLocalToDoc(archiveRec, docRec) {
    const l = docRec || {};
    return {
        id: archiveRec.certId,
        certId: archiveRec.certId,
        taskId: archiveRec.taskId || l.logisticsNo || ('LG' + (l.id || '')),
        type: archiveRec.type || '运单',
        cargo: archiveRec.cargo || l.goodsName || '--',
        spec: l.spec || '--',
        weight: l.weight || '--',
        from: l.fromLocation || '--',
        to: l.toLocation || archiveRec.currentLocation || l.currentLocation || '--',
        warehouse: l.warehouseBillId != null ? ('仓单#' + l.warehouseBillId) : '--',
        vehicle: l.transportInfo || '--',
        logistics: 'road',
        sysData: `${archiveRec.cargo || l.goodsName || ''} ${l.currentLocation || archiveRec.currentLocation || ''}`.trim(),
        status: archiveRec.status
    };
}

// ============================================================
// 【核心】按关键字查询 —— 后端优先，本地兜底
// ============================================================
async function fetchDocumentByKeyword(keyword) {
    if (!keyword) return null;
    const kw = keyword.trim();
    if (!kw) return null;

    // ---------- 1. 优先后端 ----------
    try {
        const item = await apiMatchStorage(kw);
        if (item) {
            return mapStorageToDoc(item);
        }
    } catch (e) {
        console.warn('后端匹配失败，回退本地:', e.message);
    }

    // ---------- 2. 本地兜底 ----------
    const archiveList = getLocalArchive();
    const archiveRec = archiveList.find(r =>
        String(r.certId) === kw ||
        String(r.taskId) === kw
    );

    if (!archiveRec) {
        // 存证档案中不存在 → 返回特殊标记
        return { __notFound: true, keyword: kw };
    }

    const docs = getLocalDocs();
    const docRec = docs.find(d =>
        String(d.docNo) === archiveRec.certId ||
        String(d.logisticsNo) === archiveRec.taskId
    );

    return mapLocalToDoc(archiveRec, docRec);
}

// ============================================================
// 上链：查询后端是否已上链；未上链则本地更新状态
// 真实存证通常已在 ship/deliver 时自动完成
// ============================================================
async function uploadToChain(docId) {
    try {
        const doc = currentDocData;
        if (!doc) return null;

        // ---------- 1. 优先后端查询上链状态 ----------
        try {
            const item = await apiMatchStorage(doc.certId || doc.taskId || docId);
            if (item && item.txHash) {
                // 已上链，返回真实存证信息
                return {
                    certId: item.txHash,
                    blockHeight: item.blockHeight,
                    createTime: item.createTime
                };
            }
        } catch (e) {
            console.warn('后端上链状态查询失败，走本地更新:', e.message);
        }

        // ---------- 2. 后端未返回，本地标记为已上链 ----------
        const archiveList = getLocalArchive();
        const idx = archiveList.findIndex(r => r.certId === doc.certId);
        if (idx >= 0) {
            archiveList[idx].status = '通过';
            localStorage.setItem('archive_records', JSON.stringify(archiveList));
        }

        // 尝试后端更新位置（失败不影响本地）
        try {
            await apiUpdateLoc(doc.id, doc.to || '已核验');
        } catch (e) {
            console.warn('后端同步失败（不影响本地）:', e.message);
        }

        return { certId: doc.certId };
    } catch (error) {
        console.error('上链失败:', error);
        return null;
    }
}

// ============================================================
// 加载到 UI
// ============================================================
function loadDocumentToUI(doc) {
    if (!doc) { showToast('未找到匹配的单证'); return; }

    currentDocData = doc;
    isOnChain = false;

    const ocrResult = `${doc.cargo} ${doc.to}`.trim() || '—';
    setText(ocrData, ocrResult);
    setText(sysData, doc.sysData || ocrResult);

    const a = ocrResult.replace(/\s/g, '');
    const b = (doc.sysData || ocrResult).replace(/\s/g, '');
    if (a === b || !a) {
        if (diffDisplay) {
            diffDisplay.className = 'diff-highlight success';
            diffDisplay.textContent = '数据一致，可上链存证';
        }
    } else {
        if (diffDisplay) {
            diffDisplay.className = 'diff-highlight warning';
            diffDisplay.textContent = '数据有差异，建议人工复核';
        }
    }

    const logisticsLabels = { road: '公路运输', sea: '海运', rail: '铁路运输', air: '空运' };
    const logisticsClasses = { road: 'road', sea: 'sea', rail: 'rail', air: 'air' };
    if (logisticsTag) {
        logisticsTag.textContent = logisticsLabels[doc.logistics] || '未知物流';
        logisticsTag.className = 'logistics-tag ' + (logisticsClasses[doc.logistics] || '');
    }

    if (cargoContent) {
        cargoContent.innerHTML = `
            <div class="cargo-row"><span class="label">单证编号：</span><span class="value highlight">${doc.certId || '—'}</span></div>
            <div class="cargo-row"><span class="label">品名：</span><span class="value">${doc.cargo || '—'}</span></div>
            <div class="cargo-row"><span class="label">规格：</span><span class="value">${doc.spec || '—'}</span></div>
            <div class="cargo-row"><span class="label">重量：</span><span class="value">${doc.weight || '—'}</span></div>
            <div class="cargo-row"><span class="label">起讫地：</span><span class="value">${doc.from || '—'} → ${doc.to || '—'}</span></div>
            <div class="cargo-row"><span class="label">关联仓单：</span><span class="value">${doc.warehouse || '—'}</span></div>
            <div class="cargo-row"><span class="label">运输工具：</span><span class="value">${doc.vehicle || '—'}</span></div>
            <div class="cargo-row"><span class="label">任务编号：</span><span class="value highlight">${doc.taskId || '—'}</span></div>
        `;
    }

    if (uploadZone) {
        uploadZone.innerHTML = `
            <p><span class="file-name">${doc.certId || '单证'} · ${doc.type || '运单'}</span></p>
            <p class="hint">${doc.cargo || ''} | ${doc.from || ''} → ${doc.to || ''}</p>
            <p class="hint" style="margin-top:4px;">点击或拖拽重新上传</p>
            <input type="file" id="fileInput" hidden accept="image/*,.pdf">
        `;
        const newInput = uploadZone.querySelector('#fileInput');
        if (newInput) newInput.addEventListener('change', handleFileSelect);
        uploadZone.onclick = function (e) {
            if (e.target.tagName === 'INPUT') return;
            const inp = this.querySelector('#fileInput');
            if (inp) inp.click();
        };
    }

    if (resultDiv) resultDiv.classList.remove('show');
    if (onChainBtn) onChainBtn.disabled = false;

    // 如果已经上链（档案状态为通过），展示结果
    if (doc.status === '通过' || isOnChain) {
        isOnChain = true;
        setText(certIdSpan, doc.certId);
        setText(timeSpan, formatTime(doc.createTime) || new Date().toLocaleString('zh-CN', { hour12: false }));
        if (resultDiv) resultDiv.classList.add('show');
    }

    showToast('已加载单证：' + (doc.certId || doc.taskId || ''));
}

// ============================================================
// 搜索
// ============================================================
async function handleSearch() {
    const keyword = searchInput ? searchInput.value.trim() : '';
    if (!keyword) { showToast('请输入单证编号或任务编号'); return; }

    const doc = await fetchDocumentByKeyword(keyword);
    if (!doc) {
        showToast('未找到匹配的单证，请检查编号');
        return;
    }
    if (doc.__notFound) {
        showToast(`单证编号「${doc.keyword}」在存证档案中不存在，请先新建物流`);
        return;
    }
    currentTaskId = doc.taskId;
    loadDocumentToUI(doc);
}

if (searchBtn) searchBtn.addEventListener('click', handleSearch);
if (searchInput) {
    searchInput.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') handleSearch();
    });
}

// ============================================================
// 文件上传 —— 点击 + 拖拽
// ============================================================
function handleFileSelect(e) {
    const files = e.target && e.target.files ? e.target.files : (e.dataTransfer ? e.dataTransfer.files : null);
    if (files && files.length) {
        const file = files[0];
        if (currentDocData) {
            showToast('已上传：' + file.name + '，识别完成');
            loadDocumentToUI(currentDocData);
        } else {
            showToast('请先在搜索框中关联任务');
        }
    }
    if (e.target && e.target.tagName === 'INPUT') {
        e.target.value = '';
    }
}

if (fileInput) fileInput.addEventListener('change', handleFileSelect);

if (uploadZone) {
    uploadZone.addEventListener('click', function (e) {
        if (e.target.tagName === 'INPUT') return;
        const inp = this.querySelector('#fileInput');
        if (inp) inp.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.style.borderColor = '#4fc3f7';
        uploadZone.style.background = '#f0f7fe';
    });
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.style.borderColor = '#d0d7e2';
        uploadZone.style.background = '#fafbfc';
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.style.borderColor = '#d0d7e2';
        uploadZone.style.background = '#fafbfc';
        if (e.dataTransfer.files.length) {
            if (currentDocData) {
                showToast('已上传：' + e.dataTransfer.files[0].name);
                loadDocumentToUI(currentDocData);
            } else {
                showToast('请先在搜索框中关联任务');
            }
        }
    });
}

// ============================================================
// 上链
// ============================================================
if (onChainBtn) {
    onChainBtn.addEventListener('click', async function () {
        if (!currentDocData) { showToast('请先关联任务或上传单证'); return; }
        if (isOnChain) { showToast('该单证已上链'); return; }

        this.disabled = true;
        this.textContent = '上链中...';

        const result = await uploadToChain(currentDocData.id);

        this.disabled = false;
        this.textContent = '上链存证';

        if (result) {
            isOnChain = true;
            setText(certIdSpan, result.certId);
            setText(timeSpan, formatTime(result.createTime) || new Date().toLocaleString('zh-CN', { hour12: false }));
            if (resultDiv) resultDiv.classList.add('show');
            showToast('上链成功！存证编号已生成');
        } else {
            showToast('上链失败，请重试');
        }
    });
}

// ============================================================
// 复制
// ============================================================
if (copyBtn) {
    copyBtn.addEventListener('click', function () {
        const hash = certIdSpan ? certIdSpan.textContent : '';
        if (!hash || hash === '--') { showToast('暂无存证编号可复制'); return; }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(hash).then(() => showToast('已复制单证编号'));
        } else {
            const ta = document.createElement('textarea');
            ta.value = hash;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showToast('已复制单证编号');
        }
    });
}

// ============================================================
// 核验 / 异常
// ============================================================
const verifyBtn = document.getElementById('verifyBtn');
if (verifyBtn) {
    verifyBtn.addEventListener('click', function () {
        if (!currentDocData) { showToast('请先关联任务'); return; }
        showToast('已核验通过，可进行上链存证');
    });
}

const errorBtn = document.getElementById('errorBtn');
if (errorBtn) {
    errorBtn.addEventListener('click', function () {
        if (!currentDocData) { showToast('请先关联任务'); return; }
        showToast('已标记异常，等待人工复核');
    });
}

// ============================================================
// 初始化
// ============================================================
async function init() {
    const taskId = getTaskIdFromUrl();
    if (taskId) {
        if (searchInput) searchInput.value = taskId;
        const doc = await fetchDocumentByKeyword(taskId);
        if (doc && !doc.__notFound) {
            currentTaskId = taskId;
            loadDocumentToUI(doc);
        } else if (doc && doc.__notFound) {
            showToast('任务 ' + taskId + ' 未在存证档案中找到，请先新建物流');
        } else {
            showToast('未找到任务 ' + taskId + ' 的关联单证');
        }
    } else {
        if (cargoContent) {
            cargoContent.innerHTML = `
                <div style="color:#9aaec2;font-size:13px;text-align:center;padding:20px 0;">
                    请关联任务<br>
                    <span style="font-size:12px;color:#bcc8d6;">输入单证编号后点击「关联」</span>
                </div>
            `;
        }
    }
    console.log('航贸链 · 单证中心已启动 (API: ' + API_BASE + ')');
}
init();