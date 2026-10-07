// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Auth - 权限管理合约
 * @notice 负责用户注册和角色管理
 * @dev 部署后需要把合约地址复制，填入 OrderCore 和 OrderLogistics 合约的构造函数参数中
 * 
 * 角色说明：
 * - 管理员（admin）：可以注册用户、设置角色、转移管理员权限
 * - 贸易商（trader）：可以创建订单
 * - 仓储方（warehouse）：可以确认入库、发货
 * - 物流方（logistics）：可以更新物流位置、确认签收
 */
contract Auth {
    // 管理员地址，部署合约时自动设置为部署者
    address public admin;

    // 用户信息结构体
    struct User {
        bool registered;    // 是否已注册
        bool admin_;        // 是否为管理员
        bool trader;        // 是否为贸易商
        bool warehouse;     // 是否为仓储方
        bool logistics;     // 是否为物流方
        uint256 credit;     // 信用分（初始100）
        string name;        // 用户名称
    }

    // 用户映射表：地址 => 用户信息
    mapping(address => User) public users;

    // 事件：用户注册成功时触发
    event UserRegistered(address indexed u, string name);

    /**
     * @notice 构造函数
     * @dev 部署合约时自动执行，将部署者设为管理员
     */
    constructor() {
        admin = msg.sender;
        users[msg.sender] = User(true, true, false, false, false, 100, "SuperAdmin");
    }

    /**
     * @notice 检查地址是否为管理员
     * @param _a 要检查的地址
     * @return 是否为管理员
     */
    function isAdmin(address _a) public view returns (bool) {
        return users[_a].admin_;
    }

    /**
     * @notice 检查地址是否为贸易商
     * @param _a 要检查的地址
     * @return 是否为贸易商
     */
    function isTrader(address _a) public view returns (bool) {
        return users[_a].trader;
    }

    /**
     * @notice 检查地址是否为仓储方
     * @param _a 要检查的地址
     * @return 是否为仓储方
     */
    function isWarehouse(address _a) public view returns (bool) {
        return users[_a].warehouse;
    }

    /**
     * @notice 检查地址是否为物流方
     * @param _a 要检查的地址
     * @return 是否为物流方
     */
    function isLogistics(address _a) public view returns (bool) {
        return users[_a].logistics;
    }

    /**
     * @notice 注册新用户
     * @dev 只有管理员可以调用，新用户初始信用分为100
     * @param _u 新用户的地址
     * @param _name 新用户的名称
     */
    function register(address _u, string memory _name) public {
        require(msg.sender == admin, "Only Admin");
        require(!users[_u].registered, "Already registered");
        users[_u] = User(true, false, false, false, false, 100, _name);
        emit UserRegistered(_u, _name);
    }

    /**
     * @notice 设置用户角色
     * @dev 只有管理员可以调用
     * @param _u 要设置角色的用户地址
     * @param _role 角色编号：1=贸易商，2=仓储方，3=物流方
     */
    function setRole(address _u, uint8 _role) public {
        require(msg.sender == admin, "Only Admin");
        require(users[_u].registered, "Not registered");
        if (_role == 1) users[_u].trader = true;
        else if (_role == 2) users[_u].warehouse = true;
        else if (_role == 3) users[_u].logistics = true;
    }

    /**
     * @notice 转移管理员权限
     * @dev 只有当前管理员可以调用，将管理员权限转移给新用户
     * @param _newAdmin 新管理员的地址（必须是已注册用户）
     */
    function transferAdmin(address _newAdmin) public {
        require(msg.sender == admin, "Only Admin");
        require(users[_newAdmin].registered, "Not registered");
        users[_newAdmin].admin_ = true;
        users[admin].admin_ = false;
        admin = _newAdmin;
    }
}
