// ============================================================
// 设置
// 后端: PUT  /user/{id}     修改资料
//       （密码修改、日志后端暂无）
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

// ============================================================
// Toast
// ============================================================
let toastTimer = null;

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

// ============================================================
// Toggle
// ============================================================
function toggleSwitch(el) {
    el.classList.toggle('active');
    const label = el.closest('.setting-item')?.querySelector('.title');
    const isActive = el.classList.contains('active');
    showToast(`${label ? label.textContent : '开关'} 已${isActive ? '开启' : '关闭'}`, 'info', 1200);
}

// ============================================================
// 当前用户
// ============================================================
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('current_user') || 'null'); }
    catch { return null; }
}

// ============================================================
// 修改密码（后端暂无接口，仅本地提示）
// ============================================================
function changePassword() {
    const currentPwd = document.getElementById('currentPassword').value.trim();
    const newPwd = document.getElementById('newPassword').value.trim();
    const confirmPwd = document.getElementById('confirmPassword').value.trim();

    if (!currentPwd || !newPwd || !confirmPwd) {
        showToast('请完整填写所有密码字段', 'error'); return;
    }
    if (newPwd.length < 6) { showToast('新密码至少6位', 'error'); return; }
    if (!/\d/.test(newPwd)) { showToast('新密码需包含数字', 'error'); return; }
    if (newPwd !== confirmPwd) { showToast('两次输入的密码不一致', 'error'); return; }
    if (currentPwd === newPwd) { showToast('新密码不能与当前密码相同', 'error'); return; }

    showToast('后端暂不支持在线改密码，请联系管理员', 'error', 3000);
}

// ============================================================
// 加载角色申请状态
// ============================================================
function loadRoleStatus() {
    const user = getCurrentUser();
    if (!user) return;
    if (user.roleType === 2) {
        const btn = document.getElementById('warehouseApplyBtn');
        const status = document.getElementById('warehouseStatus');
        if (btn) { btn.disabled = true; btn.textContent = '已认证'; }
        if (status) {
            status.style.display = 'inline-block';
            status.className = 'status-badge approved';
            status.textContent = '已认证';
        }
    }
    if (user.roleType === 3) {
        const btn = document.getElementById('logisticsApplyBtn');
        const status = document.getElementById('logisticsStatus');
        if (btn) { btn.disabled = true; btn.textContent = '已认证'; }
        if (status) {
            status.style.display = 'inline-block';
            status.className = 'status-badge approved';
            status.textContent = '已认证';
        }
    }
}

// ============================================================
// 重置设置
// ============================================================
function resetSettings() {
    if (!confirm('确认重置所有设置为默认值？')) return;

    const cn = document.getElementById('companyName');
    const ce = document.getElementById('companyEmail');
    if (cn) cn.value = '演示企业';
    if (ce) ce.value = 'demo@company.com';

    const toggles = document.querySelectorAll('.toggle');
    if (toggles[0]) toggles[0].classList.add('active');
    if (toggles[1]) toggles[1].classList.add('active');
    if (toggles[2]) toggles[2].classList.remove('active');

    const themeEl = document.getElementById('themeSelect');
    const pageEl = document.getElementById('pageSizeSelect');
    if (themeEl) themeEl.value = 'light';
    if (pageEl) pageEl.value = '20';

    ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    showToast('已重置为默认设置', 'success', 2000);
}

// ============================================================
// 保存设置 → PUT /user/{id}（✅ 用 request）
// ============================================================
async function saveSettings() {
    const companyName = document.getElementById('companyName').value.trim();
    const companyEmail = document.getElementById('companyEmail').value.trim();

    if (!companyName) { showToast('企业名称不能为空', 'error'); return; }

    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
        showToast('未登录', 'error'); return;
    }

    try {
        // ✅ 用 request，自动带 token
        const data = await request.put('/user/' + currentUser.id, {
            userName: companyName,
            email: companyEmail,
            phone: currentUser.phone || '',
            roleType: currentUser.roleType
        }, { autoRedirect: false });

        if (data && Number(data.code) === 200) {
            currentUser.companyName = companyName;
            currentUser.email = companyEmail;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            const ud = document.getElementById('userDisplay');
            if (ud) ud.textContent = `👤 ${companyName}`;
            showToast('设置已保存', 'success');
        } else if (data && Number(data.code) === 403) {
            showToast('无权限修改该用户资料', 'error');
        } else if (data && Number(data.code) === 401) {
            showToast('登录已过期，请重新登录', 'error');
            setTimeout(() => { window.location.href = '登录-贸易商.html'; }, 1200);
        } else {
            showToast((data && data.message) || '保存失败', 'error');
        }
    } catch (e) {
        console.error(e);
        // ✅ request 抛出的 401
        const msg = String(e.message || '');
        if (msg.indexOf('未登录') !== -1 || msg.indexOf('UNAUTHORIZED') !== -1) {
            showToast('登录已过期，请重新登录', 'error');
            setTimeout(() => { window.location.href = '登录-贸易商.html'; }, 1200);
            return;
        }
        showToast('网络错误', 'error');
    }
}

// ============================================================
// 清除所有数据
// ============================================================
function clearAllData() {
    if (!confirm('确认清除所有本地数据？此操作不可恢复！')) return;
    if (!confirm('再次确认？')) return;

    ['transactions', 'system_settings', 'enterprise_users',
        'role_applications', 'warehouse_records', 'warehouse_inventory'].forEach(k => {
            localStorage.removeItem(k);
        });

    showToast('本地数据已清除', 'success', 2000);
    setTimeout(() => location.reload(), 1500);
}

// ============================================================
// 加载已保存设置
// ============================================================
function loadSettings() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        const ud = document.getElementById('userDisplay');
        const ca = document.getElementById('companyAccount');
        const cn = document.getElementById('companyName');
        const ce = document.getElementById('companyEmail');
        if (ud) ud.textContent = currentUser.companyName || '企业用户';
        if (ca) ca.value = currentUser.account || '';
        if (cn && !cn.value) cn.value = currentUser.companyName || '';
        if (ce && !ce.value) ce.value = currentUser.email || '';
    }

    loadRoleStatus();

    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetSettings);
}

// ============================================================
// 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', loadSettings);

window.toggleSwitch = toggleSwitch;
window.changePassword = changePassword;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.clearAllData = clearAllData;