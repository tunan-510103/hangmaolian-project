// ============================================================
// 仓储方注册页
// 后端: POST /auth/register   { email, password, confirmPassword, companyName }
//       POST /auth/setRole    { address, role: 2 }
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';
const LOGIN_PAGE = '登录.html';

const backBtn = document.getElementById('backBtn');
const loginLink = document.getElementById('loginLink');
if (backBtn) backBtn.addEventListener('click', function () { window.location.href = LOGIN_PAGE; });
if (loginLink) loginLink.addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = LOGIN_PAGE;
});

// ============================================================
// 表单提交
// ============================================================
document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const companyName = document.getElementById('regCompanyName').value.trim();
    const account = document.getElementById('regAccount').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPwd = document.getElementById('regConfirmPassword').value.trim();
    const messageEl = document.getElementById('registerMessage');
    const registerBtn = document.getElementById('registerBtn');

    messageEl.className = 'message';
    messageEl.textContent = '';

    if (!companyName || !account || !password || !confirmPwd) {
        messageEl.textContent = '请填写所有字段';
        messageEl.className = 'message show error';
        return;
    }

    if (password.length < 6) {
        messageEl.textContent = '密码长度不能少于6位';
        messageEl.className = 'message show error';
        return;
    }

    if (password !== confirmPwd) {
        messageEl.textContent = '两次输入的密码不一致';
        messageEl.className = 'message show error';
        return;
    }

    // 邮箱格式校验
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
        messageEl.textContent = '请输入正确的邮箱格式';
        messageEl.className = 'message show error';
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = '注册中...';

    try {
        // ---------- 1. 注册 ----------
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: account,
                password: password,
                confirmPassword: confirmPwd,
                companyName: companyName
            })
        });

        // 先检查 HTTP 状态码
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

        // ---------- 2. 设置角色为仓储方 (role=2) ----------
        if (newUser.chainAddress) {
            try {
                const roleRes = await fetch(`${API_BASE}/auth/setRole`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        address: newUser.chainAddress,
                        role: 2
                    })
                });
                if (!roleRes.ok) {
                    console.warn('setRole HTTP 异常:', roleRes.status);
                }
            } catch (err) {
                console.warn('设置角色失败:', err);
            }
        }

        // ---------- 3. 显示结果 ----------
        messageEl.textContent = '注册成功！仓储方账号需等待管理员审核，审核通过后即可登录';
        messageEl.className = 'message show info';

        document.getElementById('regCompanyName').value = '';
        document.getElementById('regAccount').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regConfirmPassword').value = '';

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