package com.trade.chain.contract;


public interface OrderLogisticsContractService{

    String ship(long orderId, String logisticsCompany, String logisticsAddr);

    /** 链端位置更新（仅在物流状态 = 运输中 时可调用） */
    String updateLoc(long orderId, String location);

    /**
     * 链端签收
     * 合约内部自动把 OrderCore 订单状态 运输中(1) → 已签收(2)
     */
    String deliver(long orderId);

    /** 链端查询物流详情 */
    String logistics(long orderId);
}
