// ============================================================
// 平台管理-设置
// 后端: GET /user/{id}、PUT /user/{id}
//       POST /user/changePassword
// ============================================================
const API_CONFIG = {
    baseURL: 'http://192.168.0.3:10001/api',
    headers: { 'Content-Type': 'application/json' },
    getToken() { return localStorage.getItem('token') || ''; }
};

const ApiService = {
    async request(endpoint, options = {}) {
        const url = API_CONFIG.baseURL + endpoint;
        const headers = { ...API_CONFIG.headers, ...options.headers };
        const token = API_CONFIG.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const config = { ...options, headers };
        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                let msg = `HTTP ${response.status}`;
                try {
                    const e = await response.json();
                    msg = e.message || msg;
                } catch (e) { }
                throw new Error(msg);
            }
            return await response.json();
        } catch (error) {
            console.error(`API请求失败 [${endpoint}]:`, error);
            throw error;
        }
    },

    async getProfile() {
        const user = JSON.parse(localStorage.getItem('current_user') || 'null');
        if (!user || !user.id) throw new Error('未登录');
        const res = await this.request(`/user/${user.id}`);
        if (res.code !== 200) throw new Error(res.message || '加载失败');
        const d = res.data || {};
        return {
            name: d.userName || '',
            email: d.email || '',
            registerTime: d.createTime || '--',
            lastLogin: user.loginTime || '--',
            actionCount: '--',
            bio: ''
        };
    },

    async updateProfile(data) {
        const user = JSON.parse(localStorage.getItem('current_user') || 'null');
        if (!user || !user.id) throw new Error('未登录');
        const res = await this.request(`/user/${user.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                userName: data.name,
                email: data.email,
                phone: user.phone || '',
                roleType: user.roleType
            })
        });
        return { success: res.code === 200, message: res.message };
    },

    // 【修改】真实调用 POST /user/changePassword
    async changePassword(oldPassword, newPassword) {
        const user = JSON.parse(localStorage.getItem('current_user') || 'null');
        if (!user || !user.id) throw new Error('未登录');
        const res = await this.request(`/user/changePassword`, {
            method: 'POST',
            body: JSON.stringify({
                userId: user.id,
                oldPassword: oldPassword,
                newPassword: newPassword
            })
        });
        return { success: res.code === 200, message: res.message };
    }
};

function renderTopProfile(data) {
    const name = data.name || '加载失败';
    document.getElementById('topAvatar').textContent = name.charAt(0) || '管';
    document.getElementById('topName').textContent = name;
    document.getElementById('topEmail').textContent = data.email || '--';
    document.getElementById('topRegisterTime').textContent = data.registerTime || '--';
    document.getElementById('topLastLogin').textContent = data.lastLogin || '--';
    document.getElementById('topActionCount').textContent = data.actionCount || '--';

    document.getElementById('editName').value = data.name || '';
    document.getElementById('editEmail').value = data.email || '';
    document.getElementById('editBio').value = data.bio || '';
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('profileMessage');

    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    if (!name || !email) {
        showMessage(messageEl, '请完整填写姓名和邮箱', 'error');
        return false;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '保存中...';

    try {
        const result = await ApiService.updateProfile({ name, email, bio });
        if (result.success) {
            showMessage(messageEl, '个人信息更新成功！', 'success');
            const user = JSON.parse(localStorage.getItem('current_user') || 'null');
            if (user) {
                user.companyName = name;
                user.email = email;
                localStorage.setItem('current_user', JSON.stringify(user));
            }
            await loadProfile();
        } else {
            showMessage(messageEl, result.message || '更新失败', 'error');
        }
    } catch (error) {
        showMessage(messageEl, error.message || '网络错误', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '保存修改';
    }
    return false;
}

// 【修改】校验 + 真实调用改密码接口
async function handleChangePassword(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('passwordMessage');

    const oldPwd = document.getElementById('oldPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;

    if (!oldPwd || !newPwd || !confirmPwd) {
        showMessage(messageEl, '请完整填写三项密码', 'error');
        return false;
    }
    if (newPwd.length < 6) {
        showMessage(messageEl, '新密码长度不能少于6位', 'error');
        return false;
    }
    if (newPwd !== confirmPwd) {
        showMessage(messageEl, '两次输入的新密码不一致', 'error');
        return false;
    }
    if (newPwd === oldPwd) {
        showMessage(messageEl, '新密码不能与原密码相同', 'error');
        return false;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    try {
        const result = await ApiService.changePassword(oldPwd, newPwd);
        if (result.success) {
            showMessage(messageEl, '密码修改成功，请重新登录', 'success');
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('current_user');
                window.location.href = '登录.html';
            }, 2000);
        } else {
            showMessage(messageEl, result.message || '密码修改失败', 'error');
        }
    } catch (error) {
        showMessage(messageEl, error.message || '网络错误', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '修改密码';
    }
    return false;
}

function showMessage(el, text, type = 'success') {
    el.textContent = text;
    el.className = `message show ${type}`;
    setTimeout(() => {
        if (el.classList.contains('show')) el.classList.remove('show');
    }, 5000);
}

function switchTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });
}

async function loadProfile() {
    try {
        const data = await ApiService.getProfile();
        renderTopProfile(data);
    } catch (error) {
        console.error('加载个人信息失败:', error);
        document.getElementById('topName').textContent = '加载失败';
        document.getElementById('topEmail').textContent = '--';
        document.getElementById('topRegisterTime').textContent = '--';
        document.getElementById('topLastLogin').textContent = '--';
        document.getElementById('topActionCount').textContent = '--';
    }
}

function handleBack() {
    if (document.referrer) window.history.back();
    else window.location.href = '管理界面.html';
}

document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
    console.log('设置界面已加载');
});

window.switchTab = switchTab;
window.handleUpdateProfile = handleUpdateProfile;
window.handleChangePassword = handleChangePassword;
window.handleBack = handleBack;