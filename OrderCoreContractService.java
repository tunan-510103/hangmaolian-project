package com.trade.chain.contract;

import java.math.BigDecimal;
import java.util.Map;


public interface OrderCoreContractService {

    Map<String, Object> createOrder(String warehouseAddress, String goodsName,
                                    BigDecimal goodsNum, BigDecimal tradePrice);

    String warehousing(long orderId, String dataHash);

    /** 链上查询订单完整结构 */
    Map<String, Object> orders(long orderId);

    /** 链上订单总数 */
    long count();

    /** 链上订单状态（权威值） 0/3/1/2/4 */
    int getOrderStatus(long orderId);

    /**
     * 管理员核验订单 —— Only Admin 权限
     * 订单已签收(status=2) → 核验后变成 status=4(已核验)
     * @param orderId 链上/本地订单 ID
     * @return 交易哈希 txHash
     */
    String verifyOrder(long orderId);
}