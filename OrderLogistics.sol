// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAuth - Auth合约接口
 * @notice 定义Auth合约的查询函数
 */
interface IAuth {
    function isWarehouse(address) external view returns (bool);
    function isLogistics(address) external view returns (bool);
}

/**
 * @title IOrderCore - OrderCore合约接口
 * @notice 定义OrderCore合约的查询和更新函数
 */
interface IOrderCore {
    function getOrderStatus(uint256) external view returns (uint8);
    function getOrderWarehouse(uint256) external view returns (address);
    function setStatus(uint256, uint8) external;
    function setLogistics(uint256, address) external;
}

/**
 * @title OrderLogistics - 物流管理合约
 * @notice 负责发货、物流位置更新、签收确认
 * @dev 部署时需要传入 Auth 和 OrderCore 合约地址
 * 
 * 跨合约调用：
 * - ship() 会调用 OrderCore.setLogistics() 和 OrderCore.setStatus()
 * - deliver() 会调用 OrderCore.setStatus()
 * 
 * 状态流转：
 * - 发货：OrderCore 状态从 3(已入库) → 1(运输中)
 * - 签收：OrderCore 状态从 1(运输中) → 2(已签收)
 */
contract OrderLogistics {
    // Auth合约接口引用，用于权限检查
    IAuth public auth;
    
    // OrderCore合约接口引用，用于跨合约调用
    IOrderCore public orderCore;

    // 物流信息结构体
    struct LogisticsInfo {
        address logistics;      // 物流方地址
        string company;         // 物流公司名称
        string location;        // 当前位置
        uint256 shipTime;       // 发货时间戳
        uint256 deliveryTime;   // 签收时间戳
    }

    // 物流信息映射表：订单ID => 物流信息
    mapping(uint256 => LogisticsInfo) public logistics;

    // 事件：发货时触发
    event Shipped(uint256 indexed id, address logistics);
    
    // 事件：物流位置更新时触发
    event LocationUpdated(uint256 indexed id, string loc);
    
    // 事件：签收确认时触发
    event Delivered(uint256 indexed id);

    /**
     * @notice 构造函数
     * @param _auth Auth合约地址
     * @param _orderCore OrderCore合约地址
     */
    constructor(address _auth, address _orderCore) {
        auth = IAuth(_auth);
        orderCore = IOrderCore(_orderCore);
    }

    /**
     * @notice 发货
     * @dev 只有订单指定的仓储方可以调用，会同步更新OrderCore状态为1（运输中）
     * @param _id 订单ID
     * @param _co 物流公司名称
     * @param _lg 物流方地址
     */
    function ship(uint256 _id, string memory _co, address _lg) public {
        require(auth.isWarehouse(msg.sender), "Not Warehouse");
        require(orderCore.getOrderWarehouse(_id) == msg.sender, "Not yours");
        require(orderCore.getOrderStatus(_id) == 3, "Wrong status");
        require(auth.isLogistics(_lg), "Not Logistics");

        logistics[_id] = LogisticsInfo({
            logistics: _lg,
            company: _co,
            location: "In Transit",
            shipTime: block.timestamp,
            deliveryTime: 0
        });

        // 同步更新OrderCore中的状态：3(已入库) -> 1(运输中)
        orderCore.setLogistics(_id, _lg);
        orderCore.setStatus(_id, 1);

        emit Shipped(_id, _lg);
    }

    /**
     * @notice 更新物流位置
     * @dev 只有绑定的物流方可以调用，订单状态必须为1（运输中）
     * @param _id 订单ID
     * @param _loc 新位置描述
     */
    function updateLoc(uint256 _id, string memory _loc) public {
        require(auth.isLogistics(msg.sender), "Not Logistics");
        require(logistics[_id].logistics == msg.sender, "Not yours");
        require(orderCore.getOrderStatus(_id) == 1, "Wrong status");

        logistics[_id].location = _loc;
        emit LocationUpdated(_id, _loc);
    }

    /**
     * @notice 确认签收
     * @dev 只有绑定的物流方可以调用，会同步更新OrderCore状态为2（已签收）
     * @param _id 订单ID
     */
    function deliver(uint256 _id) public {
        require(auth.isLogistics(msg.sender), "Not Logistics");
        require(logistics[_id].logistics == msg.sender, "Not yours");
        require(orderCore.getOrderStatus(_id) == 1, "Wrong status");

        logistics[_id].deliveryTime = block.timestamp;
        logistics[_id].location = "Delivered";

        // 同步更新OrderCore中的状态：1(运输中) -> 2(已签收)
        orderCore.setStatus(_id, 2);

        emit Delivered(_id);
    }
}
