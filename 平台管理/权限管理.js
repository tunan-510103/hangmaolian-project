// ============================================================
// 权限管理
// 后端: RoleController
//   GET  /role/list
//   GET  /role/permission/tree?roleType=1
//   POST /role/permission/save   body:{roleType, permissionIds:[]}
//   GET  /role/permission/ids?roleType=1
// ============================================================
const API_BASE = 'http://192.168.0.3:10001/api';   // 保留

// 安全 DOM 工具
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

const tbody = document.getElementById('tableBody');
const totalCount = document.getElementById('totalCount');
const recordCount = document.getElementById('recordCount');
const pageInfo = document.getElementById('pageInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');

const statTotal = document.getElementById('statTotal');
const statPermissions = document.getElementById('statPermissions');

const modal = document.getElementById('permissionModal');
const modalRoleName = document.getElementById('modalRoleName');
const permissionTree = document.getElementById('permissionTree');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalResetBtn = document.getElementById('modalResetBtn');
const modalSaveBtn = document.getElementById('modalSaveBtn');

const dateDisplay = document.getElementById('dateDisplay');

let currentPage = 1;
let pageSize = 8;
let currentKeyword = '';
let currentEditingRole = null;

const PRESET_ROLES = [
    { id: 'role_trader', roleType: 1, name: '贸易商', desc: '贸易商用户，可管理订单、合同', userCount: 0, createTime: '2026-01-15 10:30' },
    { id: 'role_warehouse', roleType: 2, name: '仓储方', desc: '仓储方用户，可管理入库/出库、库存', userCount: 0, createTime: '2026-01-20 14:20' },
    { id: 'role_logistics', roleType: 3, name: '物流方', desc: '物流方用户，可管理运输单、轨迹', userCount: 0, createTime: '2026-02-01 09:15' },
    { id: 'role_admin', roleType: 5, name: '平台管理员', desc: '平台管理员，拥有全部权限', userCount: 0, createTime: '2026-01-01 08:00' },
];

const PERMISSION_TREE = [
    {
        id: 'menu_order', label: '订单管理', icon: 'fa-shopping-cart', children: [
            { id: 'order_view', label: '查看订单' },
            { id: 'order_create', label: '新增订单' },
            { id: 'order_edit', label: '编辑订单' },
            { id: 'order_delete', label: '删除订单' },
            { id: 'order_export', label: '导出订单' }
        ]
    },
    {
        id: 'menu_cert', label: '存证管理', icon: 'fa-upload', children: [
            { id: 'cert_view', label: '查看存证' },
            { id: 'cert_create', label: '上传存证' },
            { id: 'cert_verify', label: '核验存证' },
            { id: 'cert_delete', label: '删除存证' }
        ]
    },
    {
        id: 'menu_verify', label: '核验看板', icon: 'fa-check-double', children: [
            { id: 'verify_view', label: '查看核验' },
            { id: 'verify_audit', label: '执行核验' },
            { id: 'verify_export', label: '导出报告' }
        ]
    },
    {
        id: 'menu_voucher', label: '凭证管理', icon: 'fa-file-invoice', children: [
            { id: 'voucher_view', label: '查看凭证' },
            { id: 'voucher_verify', label: '验证凭证' },
            { id: 'voucher_push', label: '推送凭证' }
        ]
    },
    {
        id: 'menu_user', label: '用户管理', icon: 'fa-users', children: [
            { id: 'user_view', label: '查看用户' },
            { id: 'user_create', label: '新增用户' },
            { id: 'user_edit', label: '编辑用户' },
            { id: 'user_delete', label: '删除用户' },
            { id: 'user_role', label: '分配角色' }
        ]
    },
    {
        id: 'menu_permission', label: '权限管理', icon: 'fa-lock', children: [
            { id: 'perm_view', label: '查看角色' },
            { id: 'perm_edit', label: '编辑角色' },
            { id: 'perm_config', label: '配置权限' }
        ]
    },
    {
        id: 'menu_system', label: '系统管理', icon: 'fa-cog', children: [
            { id: 'system_config', label: '系统配置' },
            { id: 'system_log', label: '审计日志' },
            { id: 'system_node', label: '节点监控' }
        ]
    }
];

const ROLE_PERMISSIONS = {
    'role_trader': ['menu_order', 'order_view', 'order_create', 'order_edit', 'menu_cert', 'cert_view',
        'cert_create', 'menu_voucher', 'voucher_view'],
    'role_warehouse': ['menu_cert', 'cert_view', 'cert_create', 'menu_voucher', 'voucher_view'],
    'role_logistics': ['menu_cert', 'cert_view', 'cert_create', 'menu_voucher', 'voucher_view'],
    'role_admin': ['menu_order', 'order_view', 'order_create', 'order_edit', 'order_delete', 'order_export',
        'menu_cert', 'cert_view', 'cert_create', 'cert_verify', 'cert_delete', 'menu_verify', 'verify_view',
        'verify_audit', 'verify_export', 'menu_voucher', 'voucher_view', 'voucher_verify', 'voucher_push',
        'menu_user', 'user_view', 'user_create', 'user_edit', 'user_delete', 'user_role', 'menu_permission',
        'perm_view', 'perm_edit', 'perm_config', 'menu_system', 'system_config', 'system_log', 'system_node']
};

let currentRoleTree = null;

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const existing = container.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type) toast.classList.add(type);
    toast.textContent = msg;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============================================================
// setUserRole（✅ 用 request）
// ============================================================
async function setUserRole(address, role) {
    try {
        const data = await request.post('/auth/setRole', {
            address: address,
            role: role
        }, { autoRedirect: false });

        if (data && Number(data.code) === 200) {
            showToast('角色设置成功', 'success');
        } else {
            showToast((data && data.message) || '设置失败', 'error');
        }
    } catch (e) {
        console.error('设置角色失败:', e);
        showToast('设置失败: ' + e.message, 'error');
    }
}

// ============================================================
// 拉取用户列表统计各角色数量（✅ 用 request）
// ============================================================
async function loadUserCounts() {
    try {
        const data = await request.get('/user/list', { page: 1, size: 1000 }, { autoRedirect: false });
        if (!data || Number(data.code) !== 200) return;
        const list = data.data?.list || [];
        const counts = { 1: 0, 2: 0, 3: 0, 5: 0 };
        list.forEach(u => {
            if (counts[u.roleType] !== undefined) counts[u.roleType]++;
        });
        PRESET_ROLES.forEach(r => {
            if (counts[r.roleType] !== undefined) r.userCount = counts[r.roleType];
        });
    } catch (e) {
        console.warn('加载用户统计失败:', e);
    }
}

function renderTable(data) {
    if (!tbody) return;

    const list = data.list || [];
    const total = data.total || 0;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data"><i class="fas fa-inbox"></i>暂无角色数据</td></tr>';
    } else {
        tbody.innerHTML = list.map(item => `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td style="color:#4a5a6a;">${item.desc}</td>
                <td>${item.userCount}</td>
                <td style="font-size:0.8rem;color:#6f8aa8;">${item.createTime}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="openPermissionModal('${item.id}')"><i class="fas fa-key"></i> 权限</button>
                    <button class="btn btn-sm btn-outline" onclick="showToast('编辑角色：${item.name}')"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    }

    const totalPages = Math.ceil(total / pageSize) || 1;
    setText('totalCount', total);
    setText('recordCount', '共 ' + total + ' 条');
    setText('pageInfo', currentPage + ' / ' + totalPages);
    if (prevPage) prevPage.disabled = currentPage <= 1;
    if (nextPage) nextPage.disabled = currentPage >= totalPages;
}

async function loadData() {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="loading-spinner">加载中...</td></tr>';
    try {
        await loadUserCounts();

        let list = PRESET_ROLES;
        if (currentKeyword) {
            list = list.filter(r => r.name.includes(currentKeyword) || r.desc.includes(currentKeyword));
        }
        const total = list.length;

        setText('statTotal', total);
        setText('statPermissions', PERMISSION_TREE.length);

        renderTable({ list, total });
    } catch (e) {
        console.error('加载数据失败:', e);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="no-data">数据加载失败: ${e.message}</td></tr>`;
        showToast('数据加载失败: ' + e.message, 'error');
    }
}

function renderPermissionTree(selectedIds) {
    const selectedSet = new Set((selectedIds || []).map(String));
    let html = '';
    PERMISSION_TREE.forEach(menu => {
        const menuChecked = selectedSet.has(String(menu.id));
        html += `
            <li>
                <div class="tree-item">
                    <input type="checkbox" id="perm_${menu.id}" data-perm-id="${menu.id}" ${menuChecked ? 'checked' : ''}>
                    <i class="fas ${menu.icon} menu-icon"></i>
                    <label for="perm_${menu.id}"><strong>${menu.label}</strong></label>
                    <span style="font-size:0.7rem;color:#9aaec2;margin-left:auto;">菜单</span>
                </div>
                <ul class="tree-children">
                    ${(menu.children || []).map(child => {
            const childChecked = selectedSet.has(String(child.id));
            return `
                            <li>
                                <div class="tree-item">
                                    <input type="checkbox" id="perm_${child.id}" data-perm-id="${child.id}" ${childChecked ? 'checked' : ''}>
                                    <label for="perm_${child.id}">${child.label}</label>
                                    <span style="font-size:0.7rem;color:#9aaec2;margin-left:auto;">操作</span>
                                </div>
                            </li>
                        `;
        }).join('')}
                </ul>
            </li>
        `;
    });
    permissionTree.innerHTML = html;
    bindTreeEvents();
}

function renderPermissionTreeFromApi(tree) {
    let html = '';
    tree.forEach(menu => {
        const menuName = menu.name || menu.label || menu.permissionName || '';
        const menuId = menu.id;
        const menuChecked = !!menu.checked;
        const children = menu.children || [];
        html += `
            <li>
                <div class="tree-item">
                    <input type="checkbox" id="perm_${menuId}" data-perm-id="${menuId}" ${menuChecked ? 'checked' : ''}>
                    <i class="fas fa-folder menu-icon"></i>
                    <label for="perm_${menuId}"><strong>${menuName}</strong></label>
                    <span style="font-size:0.7rem;color:#9aaec2;margin-left:auto;">菜单</span>
                </div>
                <ul class="tree-children">
                    ${children.map(child => {
            const childName = child.name || child.label || child.permissionName || '';
            const childId = child.id;
            const childChecked = !!child.checked;
            return `
                            <li>
                                <div class="tree-item">
                                    <input type="checkbox" id="perm_${childId}" data-perm-id="${childId}" ${childChecked ? 'checked' : ''}>
                                    <label for="perm_${childId}">${childName}</label>
                                    <span style="font-size:0.7rem;color:#9aaec2;margin-left:auto;">操作</span>
                                </div>
                            </li>
                        `;
        }).join('')}
                </ul>
            </li>
        `;
    });
    permissionTree.innerHTML = html;
    bindTreeEvents();
}

function bindTreeEvents() {
    permissionTree.querySelectorAll('.tree-item > input[type="checkbox"]').forEach(parentCheckbox => {
        parentCheckbox.addEventListener('change', function () {
            const parentLi = this.closest('li');
            const childCheckboxes = parentLi.querySelectorAll('.tree-children input[type="checkbox"]');
            childCheckboxes.forEach(cb => cb.checked = this.checked);
        });
    });

    permissionTree.querySelectorAll('.tree-children input[type="checkbox"]').forEach(childCheckbox => {
        childCheckbox.addEventListener('change', function () {
            const parentLi = this.closest('li').parentElement.closest('li');
            if (parentLi) {
                const parentCheckbox = parentLi.querySelector('.tree-item > input[type="checkbox"]');
                const siblings = parentLi.querySelectorAll('.tree-children input[type="checkbox"]');
                const allChecked = Array.from(siblings).every(cb => cb.checked);
                if (parentCheckbox) parentCheckbox.checked = allChecked;
            }
        });
    });
}

// ============================================================
// 打开弹窗（✅ 用 request）
// ============================================================
async function openPermissionModal(roleId) {
    const role = PRESET_ROLES.find(r => r.id === roleId);
    if (!role) { showToast('角色不存在', 'error'); return; }

    currentEditingRole = roleId;
    setText('modalRoleName', role.name);

    let permissions = ROLE_PERMISSIONS[roleId] || [];
    renderPermissionTree(permissions);
    if (modal) modal.classList.add('show');

    try {
        const data = await request.get('/role/permission/tree', { roleType: role.roleType }, { autoRedirect: false });
        if (data && Number(data.code) === 200 && Array.isArray(data.data)) {
            currentRoleTree = data.data;
            if (currentEditingRole === roleId && modal && modal.classList.contains('show')) {
                renderPermissionTreeFromApi(data.data);
            }
        }
    } catch (e) {
        console.warn('拉取角色权限树失败，使用本地缓存:', e);
    }
}

function closePermissionModal() {
    if (modal) modal.classList.remove('show');
    currentEditingRole = null;
    currentRoleTree = null;
}

// ============================================================
// 保存权限（✅ 用 request）
// ============================================================
async function savePermissions() {
    if (!currentEditingRole) return;
    const role = PRESET_ROLES.find(r => r.id === currentEditingRole);
    if (!role) return;

    const permissionIds = [];
    permissionTree.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        const n = parseInt(cb.dataset.permId, 10);
        if (!isNaN(n)) permissionIds.push(n);
    });

    if (permissionIds.length === 0) {
        showToast('未勾选任何权限', 'error');
        return;
    }

    modalSaveBtn.disabled = true;
    try {
        const data = await request.post('/role/permission/save', {
            roleType: role.roleType,
            permissionIds: permissionIds
        }, { autoRedirect: false });

        if (data && Number(data.code) === 200) {
            showToast('权限配置已保存 (' + permissionIds.length + ' 项)', 'success');
            closePermissionModal();
        } else {
            showToast((data && data.message) || '保存失败', 'error');
        }
    } catch (e) {
        showToast('保存失败: ' + e.message, 'error');
    } finally {
        modalSaveBtn.disabled = false;
    }
}

// ============================================================
// 重置权限（✅ 用 request）
// ============================================================
async function resetPermissions() {
    if (!currentEditingRole) return;
    const role = PRESET_ROLES.find(r => r.id === currentEditingRole);
    if (!role) return;

    try {
        const data = await request.get('/role/permission/ids', { roleType: role.roleType }, { autoRedirect: false });
        if (data && Number(data.code) === 200 && Array.isArray(data.data)) {
            const mapped = data.data.map(String);
            ROLE_PERMISSIONS[currentEditingRole] = mapped;
            if (currentRoleTree) {
                const idSet = new Set(data.data.map(Number));
                const cloned = JSON.parse(JSON.stringify(currentRoleTree));
                cloned.forEach(m => {
                    m.checked = idSet.has(Number(m.id));
                    (m.children || []).forEach(c => { c.checked = idSet.has(Number(c.id)); });
                });
                renderPermissionTreeFromApi(cloned);
            } else {
                renderPermissionTree(mapped);
            }
            showToast('已重置为后端最新配置', '');
        } else {
            const defaultPerms = ROLE_PERMISSIONS[currentEditingRole] || [];
            renderPermissionTree(defaultPerms);
            showToast('已重置为本地配置', '');
        }
    } catch (e) {
        console.warn('重置失败，使用本地:', e);
        const defaultPerms = ROLE_PERMISSIONS[currentEditingRole] || [];
        renderPermissionTree(defaultPerms);
        showToast('已重置为本地配置', '');
    }
}

function doSearch() {
    currentKeyword = searchInput ? searchInput.value.trim() : '';
    currentPage = 1;
    loadData();
}

function resetSearch() {
    if (searchInput) searchInput.value = '';
    currentKeyword = '';
    currentPage = 1;
    loadData();
    showToast('已重置搜索', '');
}

function updateDateDisplay() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    if (dateDisplay) dateDisplay.textContent = y + '-' + m + '-' + d + ' ' + h + ':' + min;
}

function handleSettings() { window.location.href = '设置.html'; }
function handleLogout() {
    if (confirm('确认退出登录吗？')) {
        localStorage.removeItem('token');
        localStorage.removeItem('current_user');
        // ✅ 跳平台管理登录页
        window.location.href = '登录-平台管理.html';
    }
}

if (searchBtn) searchBtn.addEventListener('click', doSearch);
if (searchInput) {
    searchInput.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') doSearch();
    });
}
if (resetBtn) resetBtn.addEventListener('click', resetSearch);

if (prevPage) {
    prevPage.addEventListener('click', function () {
        if (currentPage > 1) { currentPage--; loadData(); }
    });
}
if (nextPage) {
    nextPage.addEventListener('click', function () {
        const total = totalCount ? parseInt(totalCount.textContent) : 0;
        const totalPages = Math.ceil(total / pageSize);
        if (currentPage < totalPages) { currentPage++; loadData(); }
    });
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePermissionModal);
if (modalResetBtn) modalResetBtn.addEventListener('click', resetPermissions);
if (modalSaveBtn) modalSaveBtn.addEventListener('click', savePermissions);
if (modal) {
    modal.addEventListener('click', function (e) {
        if (e.target === this) closePermissionModal();
    });
}

window.openPermissionModal = openPermissionModal;
window.showToast = showToast;
window.handleSettings = handleSettings;
window.handleLogout = handleLogout;
window.setUserRole = setUserRole;

async function init() {
    updateDateDisplay();
    await loadData();
    console.log('权限管理已启动 (API: ' + API_BASE + ')');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}