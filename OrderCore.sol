// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAuth - Auth合约接口
 * @notice 定义Auth合约的查询函数，用于跨合约调用
 */
interface IAuth {
    function isTrader(address) external view returns (bool);
    function isWarehouse(address) external view returns (bool);
    function isLogistics(address) external view returns (bool);
    function isAdmin(address) external view returns (bool);
}

/**
 * @title OrderCore - 订单核心合约
 * @notice 负责订单创建、入库确认、核验功能
 * @dev 部署时需要传入 Auth 合约地址
 * 
 * 状态流转：
 * 0(待入库) → 3(已入库) → 1(运输中) → 2(已签收) → 4(已核验)
 * 
 * 跨合约调用：
 * - OrderLogistics 合约可以调用 setStatus 和 setLogistics 更新订单状态
 * - 需要先部署 OrderLogistics，然后调用 setOrderLogistics 设置其地址
 */
contract OrderCore {
    // Auth合约接口引用，用于权限检查
    IAuth public auth;
    
    // OrderLogistics合约地址，部署后通过 setOrderLogistics 设置
    address public orderLogistics;

    // 订单信息结构体
    struct OrderInfo {
        uint256 id;             // 订单ID
        address trader;         // 贸易商地址
        address warehouse;      // 仓储方地址
        address logistics;      // 物流方地址（发货时绑定）
        uint8 status;           // 订单状态：0待入库，3已入库，1运输中，2已签收，4已核验
        string goodsName;       // 商品名称
        uint256 quantity;       // 数量
        uint256 price;          // 单价
        string hash;            // 存证哈希（合同哈希→仓单哈希）
        uint256 createTime;     // 创建时间戳
    }

    // 订单映射表：订单ID => 订单信息
    mapping(uint256 => OrderInfo) public orders;
    
    // 订单计数器，用于生成订单ID
    uint256 public orderCount;

    // 事件：订单创建时触发
    event OrderCreated(uint256 indexed id, address trader);
    
    // 事件：入库确认时触发
    event Warehoused(uint256 indexed id);
    
    // 事件：核验完成时触发（新增）
    event OrderVerified(uint256 indexed id, address verifier, uint256 time);

    /**
     * @notice 构造函数
     * @param _auth Auth合约地址
     */
    constructor(address _auth) {
        auth = IAuth(_auth);
    }

    /**
     * @notice 设置OrderLogistics合约地址
     * @dev 部署OrderLogistics后调用此函数，只能调用一次
     * @param _addr OrderLogistics合约地址
     */
    function setOrderLogistics(address _addr) public {
        require(orderLogistics == address(0), "Already set");
        orderLogistics = _addr;
    }

    /**
     * @notice 更新订单状态（供OrderLogistics合约调用）
     * @dev 只有OrderLogistics合约可以调用
     * @param _id 订单ID
     * @param _status 新状态值
     */
    function setStatus(uint256 _id, uint8 _status) public {
        require(msg.sender == orderLogistics, "Only OrderLogistics");
        require(orders[_id].id > 0, "Order not exist");
        orders[_id].status = _status;
    }

    /**
     * @notice 设置物流方地址（供OrderLogistics合约调用）
     * @dev 只有OrderLogistics合约可以调用
     * @param _id 订单ID
     * @param _logistics 物流方地址
     */
    function setLogistics(uint256 _id, address _logistics) public {
        require(msg.sender == orderLogistics, "Only OrderLogistics");
        require(orders[_id].id > 0, "Order not exist");
        orders[_id].logistics = _logistics;
    }

    /**
     * @notice 创建订单
     * @dev 只有贸易商可以调用，订单初始状态为0（待入库）
     * @param _wh 仓储方地址
     * @param _goods 商品名称
     * @param _qty 数量（必须大于0）
     * @param _price 单价（必须大于0）
     * @param _hash 合同存证哈希
     */
    function createOrder(
        address _wh,
        string memory _goods,
        uint256 _qty,
        uint256 _price,
        string memory _hash
    ) public {
        require(auth.isTrader(msg.sender), "Not Trader");
        require(auth.isWarehouse(_wh), "Not Warehouse");
        require(_qty > 0 && _price > 0, "Invalid");

        orderCount++;
        orders[orderCount] = OrderInfo({
            id: orderCount,
            trader: msg.sender,
            warehouse: _wh,
            logistics: address(0),
            status: 0,
            goodsName: _goods,
            quantity: _qty,
            price: _price,
            hash: _hash,
            createTime: block.timestamp
        });
        emit OrderCreated(orderCount, msg.sender);
    }

    /**
     * @notice 确认入库
     * @dev 只有订单指定的仓储方可以调用，状态从0变为3
     * @param _id 订单ID
     * @param _hash 仓单哈希
     */
    function warehousing(uint256 _id, string memory _hash) public {
        OrderInfo storage o = orders[_id];
        require(o.id > 0, "Not exist");
        require(auth.isWarehouse(msg.sender), "Not Warehouse");
        require(o.warehouse == msg.sender, "Not yours");
        require(o.status == 0, "Wrong status");

        o.status = 3;
        o.hash = _hash;
        emit Warehoused(_id);
    }

    /**
     * @notice 核验订单（一键核验采纳）
     * @dev 只有管理员可以调用，订单状态必须为2（已签收），核验后状态变为4
     * @param _id 订单ID
     */
    function verifyOrder(uint256 _id) public {
        require(auth.isAdmin(msg.sender), "Only Admin");
        require(orders[_id].id > 0, "Order not exist");
        require(orders[_id].status == 2, "Order not delivered");
        
        orders[_id].status = 4;
        emit OrderVerified(_id, msg.sender, block.timestamp);
    }

    /**
     * @notice 查询订单状态（供OrderLogistics合约调用）
     * @param _id 订单ID
     * @return 订单状态
     */
    function getOrderStatus(uint256 _id) public view returns (uint8) {
        return orders[_id].status;
    }

    /**
     * @notice 查询订单仓储方地址（供OrderLogistics合约调用）
     * @param _id 订单ID
     * @return 仓储方地址
     */
    function getOrderWarehouse(uint256 _id) public view returns (address) {
        return orders[_id].warehouse;
    }
}
