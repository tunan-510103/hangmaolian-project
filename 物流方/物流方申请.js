// ============================================================
// 物流方申请 + 注册 融合页（带密码版）
// 后端:
//   POST /user/apply/submit   提交入驻申请（roleType=3，带 password）
//   GET  /user/apply/status   查询审核状态
//   POST /auth/register       { email, companyName }   注册（无密码）
//   POST /auth/setRole        { address, role: 3 }     注册后设置角色
// 核心修复：
//   ★ initApplyPage 跳转条件从 roleType 改为 applyStatus === 'approved'
//   ★ 只有轮询到后端 approved 才写入 applyStatus，管理员未通过不会误跳
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';
const LOGIN_PAGE = '登录.html';

let toastTimer = null;
let pollTimer = null;

// ------------------------------------------------------------
// 通用工具
// ------------------------------------------------------------
function showToast(message, type = 'info', duration = 2200) {
    const el = document.getElementById('toast');
    if (!el) return;
    if (toastTimer) {
        clearTimeout(toastTimer);
        el.classList.remove('show', 'success', 'error');
    }
    void el.offsetWidth;
    el.textContent = message;
    el.className = 'toast';
    if (type === 'success') el.classList.add('success');
    if (type === 'error') el.classList.add('error');
    el.classList.add('show');
    toastTimer = setTimeout(() => {
        el.classList.remove('show');
        toastTimer = null;
    }, duration);
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('current_user') || 'null'); }
    catch { return null; }
}

function getEnterpriseInfo() {
    const user = getCurrentUser();
    return {
        companyName: user?.companyName || '',
        email: user?.email || ''
    };
}

// ------------------------------------------------------------
// 步骤切换
// ------------------------------------------------------------
function showApplyStep() {
    const applySection = document.getElementById('applySection');
    const registerSection = document.getElementById('registerSection');
    if (applySection) applySection.style.display = '';
    if (registerSection) registerSection.style.display = 'none';
}

function showRegisterStep() {
    const applySection = document.getElementById('applySection');
    const registerSection = document.getElementById('registerSection');
    if (applySection) applySection.style.display = 'none';
    if (registerSection) registerSection.style.display = '';

    const enterprise = getEnterpriseInfo();
    const regCompanyName = document.getElementById('regCompanyName');
    const regAccount = document.getElementById('regAccount');
    if (regCompanyName && !regCompanyName.value) regCompanyName.value = enterprise.companyName || '';
    if (regAccount && !regAccount.value) regAccount.value = enterprise.email || '';
}

// ------------------------------------------------------------
// 表单禁用 / 状态
// ------------------------------------------------------------
function disableForm(disabled) {
    const form = document.getElementById('applyForm');
    if (!form) return;
    form.querySelectorAll('input, select, textarea').forEach(input => {
        input.disabled = disabled;
    });
    const btn = document.getElementById('submitBtn');
    if (btn) btn.disabled = disabled;
}

function updateApplyStatus(status) {
    const statusEl = document.getElementById('applyStatus');
    const btn = document.getElementById('submitBtn');
    if (!statusEl || !btn) return;

    if (status === 'approved') {
        statusEl.style.display = 'inline-block';
        statusEl.className = 'status-badge approved';
        statusEl.textContent = '已通过';
        btn.textContent = '已通过';
    } else if (status === 'pending') {
        statusEl.style.display = 'inline-block';
        statusEl.className = 'status-badge pending';
        statusEl.textContent = '审核中';
        btn.textContent = '审核中...';
    } else {
        statusEl.style.display = 'none';
        btn.textContent = '提交申请';
    }
}

// ------------------------------------------------------------
// 轮询：只有 approved 才跳转
// ------------------------------------------------------------
function startReviewPolling(address) {
    stopReviewPolling();
    if (!address) return;

    pollTimer = setInterval(async () => {
        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(
                `${API_BASE}/user/apply/status?chainAddress=${encodeURIComponent(address)}`,
                {
                    method: 'GET',
                    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                }
            );
            const data = await res.json();

            if (Number(data.code) === 200 && data.data) {
                const status = data.data.status;   // 'pending' | 'approved' | 'rejected'

                if (status === 'approved') {
                    stopReviewPolling();
                    updateApplyStatus('approved');

                    const u = getCurrentUser();
                    if (u) {
                        u.roleType = 3;
                        u.applyStatus = 'approved';   // ★ 关键
                        localStorage.setItem('current_user', JSON.stringify(u));
                    }

                    showToast('管理员已通过，正在前往登录...', 'success', 2000);
                    setTimeout(() => {
                        window.location.href = LOGIN_PAGE;
                    }, 1200);
                } else if (status === 'rejected') {
                    stopReviewPolling();
                    updateApplyStatus('');
                    disableForm(false);
                    showToast('申请已被驳回，请修改后重新提交', 'error', 3000);

                    const u = getCurrentUser();
                    if (u) {
                        u.applyStatus = '';
                        localStorage.setItem('current_user', JSON.stringify(u));
                    }
                }
            }
        } catch (err) {
            console.warn('轮询审核状态失败:', err);
        }
    }, 3000);
}

function stopReviewPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// ------------------------------------------------------------
// 申请页初始化
// ★ 关键修复：跳转条件只看 applyStatus === 'approved'
// ------------------------------------------------------------
function initApplyPage() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('请先登录', 'error');
        return;
    }

    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) userDisplay.textContent = currentUser.companyName || '企业用户';

    const enterprise = getEnterpriseInfo();
    const companyNameEl = document.getElementById('companyName');
    const contactEmailEl = document.getElementById('contactEmail');
    if (companyNameEl && enterprise.companyName) companyNameEl.value = enterprise.companyName;
    if (contactEmailEl && enterprise.email) contactEmailEl.value = enterprise.email;

    // ★ 只有后端确认通过才跳转
    if (currentUser.applyStatus === 'approved') {
        updateApplyStatus('approved');
        disableForm(true);
        showToast('您已认证为物流方，即将前往登录...', 'success');
        setTimeout(() => { window.location.href = LOGIN_PAGE; }, 1200);
        return;
    }

    // 已提交待审核：恢复审核中状态并开始轮询
    if (currentUser.applyStatus === 'pending') {
        disableForm(true);
        updateApplyStatus('pending');
        startReviewPolling(currentUser.chainAddress);
    }

    const form = document.getElementById('applyForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            submitApplication();
        });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', function () {
        resetFormAndUnlock();
    });
}

// ------------------------------------------------------------
// 提交申请
// ------------------------------------------------------------
async function submitApplication() {
    const currentUser = getCurrentUser();
    if (!currentUser) { showToast('请先登录', 'error'); return; }

    const address = currentUser.chainAddress;
    if (!address) {
        showToast('当前账号未绑定链上地址，无法提交申请', 'error');
        return;
    }

    const formData = {
        companyName: document.getElementById('companyName').value.trim(),
        contactPerson: document.getElementById('contactPerson').value.trim(),
        contactPhone: document.getElementById('contactPhone').value.trim(),
        contactEmail: document.getElementById('contactEmail').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        logisticsType: document.getElementById('logisticsType').value,
        serviceScope: document.getElementById('serviceScope').value,
        vehicleCount: document.getElementById('vehicleCount').value.trim(),
        businessLicense: document.getElementById('businessLicense').value.trim(),
        serviceDesc: document.getElementById('serviceDesc').value.trim()
    };

    const requiredFields = ['companyName', 'contactPerson', 'contactPhone', 'contactEmail', 'logisticsType', 'serviceScope'];
    const labelMap = {
        companyName: '企业名称', contactPerson: '联系人', contactPhone: '联系电话',
        contactEmail: '联系邮箱', logisticsType: '物流类型', serviceScope: '服务范围'
    };

    for (const field of requiredFields) {
        if (!formData[field]) {
            showToast(`请填写 ${labelMap[field] || field}`, 'error');
            return;
        }
    }

    if (!/^1\d{10}$/.test(formData.contactPhone)) {
        showToast('请输入正确的手机号码', 'error'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        showToast('请输入正确的邮箱地址', 'error'); return;
    }
    if (!formData.password || formData.password.length < 6) {
        showToast('请输入至少6位的登录密码', 'error'); return;
    }
    if (formData.password !== formData.confirmPassword) {
        showToast('两次输入的密码不一致', 'error'); return;
    }

    try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE}/user/apply/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                chainAddress: address,          // 后端修完后会用这个
                roleType: 3,
                companyName: formData.companyName,
                contactPerson: formData.contactPerson,   // ✅ 字段名对齐后端
                phone: formData.contactPhone,
                email: formData.contactEmail,
                password: formData.password,
                logisticsType: formData.logisticsType,
                serviceScope: formData.serviceScope,
                ownVehicleCount: formData.vehicleCount,   // ✅ 
                licenseNo: formData.businessLicense,      // ✅
                serviceDesc: formData.serviceDesc
            })
        });
        const data = await res.json();

        if (Number(data.code) === 200) {
            currentUser.applyStatus = 'pending';     // ★ 只写 pending
            currentUser.applyRole = 3;
            currentUser.applyTime = new Date().toISOString();
            currentUser.applyId = data.data && data.data.applyId ? data.data.applyId : undefined;
            // ★ 绝不写 currentUser.roleType = 3
            localStorage.setItem('current_user', JSON.stringify(currentUser));

            disableForm(true);
            updateApplyStatus('pending');
            showToast('申请已提交，等待管理员审核...', 'success', 2500);

            startReviewPolling(address);
        } else {
            showToast(data.message || '提交失败', 'error');
        }
    } catch (e) {
        console.error('提交申请失败:', e);
        showToast('网络错误，请重试', 'error');
    }
}

// ------------------------------------------------------------
// 重置
// ------------------------------------------------------------
function resetFormAndUnlock() {
    if (!confirm('确认重置表单？所有已填写内容将被清空。')) return;

    stopReviewPolling();

    const form = document.getElementById('applyForm');
    if (form) form.reset();

    disableForm(false);

    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.textContent = '提交申请';
        btn.disabled = false;
    }

    const statusEl = document.getElementById('applyStatus');
    if (statusEl) {
        statusEl.style.display = 'none';
        statusEl.className = 'status-badge';
        statusEl.textContent = '';
    }

    const currentUser = getCurrentUser();
    if (currentUser) {
        currentUser.applyStatus = '';
        currentUser.applyRole = '';
        currentUser.applyTime = '';
        currentUser.applyId = '';
        if (currentUser.roleType === 3) {
            currentUser.roleType = undefined;
        }
        localStorage.setItem('current_user', JSON.stringify(currentUser));
    }

    const enterprise = getEnterpriseInfo();
    const cn = document.getElementById('companyName');
    const ce = document.getElementById('contactEmail');
    if (cn && enterprise.companyName) cn.value = enterprise.companyName;
    if (ce && enterprise.email) ce.value = enterprise.email;

    showToast('表单已重置，可以重新填写', 'info', 2000);
}

// ------------------------------------------------------------
// 注册区逻辑（无密码版）
// ------------------------------------------------------------
function initRegisterPage() {
    const backBtn = document.getElementById('backBtn');
    const loginLink = document.getElementById('loginLink');
    if (backBtn) backBtn.addEventListener('click', function () { window.location.href = LOGIN_PAGE; });
    if (loginLink) loginLink.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = LOGIN_PAGE;
    });

    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const companyName = document.getElementById('regCompanyName').value.trim();
        const account = document.getElementById('regAccount').value.trim();
        const messageEl = document.getElementById('registerMessage');
        const registerBtn = document.getElementById('registerBtn');

        messageEl.className = 'message';
        messageEl.textContent = '';

        if (!companyName || !account) {
            messageEl.textContent = '请填写所有字段';
            messageEl.className = 'message show error';
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
            messageEl.textContent = '请输入正确的邮箱格式';
            messageEl.className = 'message show error';
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = '注册中...';

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: account,
                    companyName: companyName
                })
            });

            if (!res.ok) {
                const text = await res.text();
                console.error('HTTP', res.status, text);
                throw new Error(`服务器返回 ${res.status}`);
            }

            const data = await res.json();

            if (data.code !== 200) {
                messageEl.textContent = data.message || '注册失败';
                messageEl.className = 'message show error';
                registerBtn.disabled = false;
                registerBtn.textContent = '注 册';
                return;
            }

            const newUser = data.data || {};

            if (newUser.chainAddress) {
                try {
                    const roleRes = await fetch(`${API_BASE}/auth/setRole`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            address: newUser.chainAddress,
                            role: 3
                        })
                    });
                    if (!roleRes.ok) {
                        console.warn('setRole HTTP 异常:', roleRes.status);
                    }
                } catch (err) {
                    console.warn('设置角色失败:', err);
                }
            }

            messageEl.textContent = '注册成功！物流方账号需等待管理员审核，审核通过后即可登录';
            messageEl.className = 'message show info';

            document.getElementById('regCompanyName').value = '';
            document.getElementById('regAccount').value = '';

            setTimeout(() => {
                window.location.href = LOGIN_PAGE;
            }, 2500);

        } catch (err) {
            console.error('注册失败:', err);
            messageEl.textContent = '网络错误：' + (err.message || '请重试');
            messageEl.className = 'message show error';
            registerBtn.disabled = false;
            registerBtn.textContent = '注 册';
        }
    });
}

// ------------------------------------------------------------
// 启动
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    initRegisterPage();
    showApplyStep();
    initApplyPage();
});