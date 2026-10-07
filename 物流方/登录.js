// ============================================================
// 登录2 - 物流方登录
// 后端: POST /auth/login  (字段：email / password)
// 返回结构：{ code, message, data: { user: {...}, token: '...' } }
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

const form = document.getElementById('loginForm');
const accountInput = document.getElementById('loginAccount');
const passwordInput = document.getElementById('loginPassword');
const accountError = document.getElementById('accountError');
const passwordError = document.getElementById('passwordError');
const messageEl = document.getElementById('loginMessage');
const loginBtn = document.getElementById('loginBtn');

function clearErrors() {
    accountInput.classList.remove('error');
    passwordInput.classList.remove('error');
    accountError.classList.remove('show');
    passwordError.classList.remove('show');
}

function showFieldError(field) {
    if (field === 'account') {
        accountInput.classList.add('error');
        accountError.classList.add('show');
    } else if (field === 'password') {
        passwordInput.classList.add('error');
        passwordError.classList.add('show');
    }
}

function showMessage(text, type = 'error') {
    messageEl.textContent = text;
    messageEl.className = `message show ${type}`;
}

function hideMessage() {
    messageEl.className = 'message';
    messageEl.textContent = '';
}

form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();
    hideMessage();

    const account = accountInput.value.trim();
    const password = passwordInput.value.trim();

    let hasError = false;
    if (!account) { showFieldError('account'); hasError = true; }
    if (!password) { showFieldError('password'); hasError = true; }
    if (hasError) {
        showMessage('请填写完整信息', 'error');
        passwordInput.value = '';
        passwordInput.focus();
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';

    try {
        // === 用 request 统一请求（自动带 token、统一处理 401）===
        // autoRedirect:false —— 登录接口本身 401 时不要跳登录页
        const data = await request.post('/auth/login', {
            email: account,
            password: password
        }, { autoRedirect: false });

        console.log('登录接口返回:', data);

        if (!data || Number(data.code) !== 200) {
            showMessage((data && data.message) || '登录失败', 'error');
            passwordInput.value = '';
            passwordInput.focus();
            loginBtn.disabled = false;
            loginBtn.textContent = '登 录';
            return;
        }

        // ============================================================
        // ✅ 关键修复：根据实际返回结构取 user 和 token
        // 实际返回：data.data = { user: {...}, token: '...' }
        // ============================================================
        const payload = data.data || {};
        const user = payload.user || payload;                 // 用户对象
        const token = payload.token || user.token || data.token;  // token

        console.log('解析出的 user =', user);
        console.log('解析出的 roleType =', user.roleType);

        // 校验是否为物流方
        if (Number(user.roleType) !== 3) {
            showMessage('该账号不是物流方角色，无法登录此页面', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = '登 录';
            return;
        }

        // ---------- 统一写入登录态 ----------
        const userInfo = {
            id: user.id,
            account: user.userAccount || user.account,
            companyName: user.userName || user.companyName,
            roleType: user.roleType,
            chainAddress: user.chainAddress,
            email: user.email || user.userAccount || user.account,
            phone: user.phone || '',
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('current_user', JSON.stringify(userInfo));

        // 如果后端返回 token，一并保存
        if (token) localStorage.setItem('token', token);

        console.log('已写入 current_user =', userInfo);
        console.log('已写入 token =', token);

        showMessage('登录成功，正在跳转...', 'success');

        setTimeout(() => {
            window.location.href = '物流方-工作台.html';
        }, 800);

    } catch (err) {
        console.error('登录失败:', err);
        showMessage('网络错误，请重试', 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = '登 录';
    }
});

accountInput.addEventListener('focus', function () {
    accountInput.classList.remove('error');
    accountError.classList.remove('show');
    hideMessage();
});
passwordInput.addEventListener('focus', function () {
    passwordInput.classList.remove('error');
    passwordError.classList.remove('show');
    hideMessage();
});