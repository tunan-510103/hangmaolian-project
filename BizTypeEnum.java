package com.trade.common;

import lombok.Getter;

/**
 * 业务类型枚举
 * 对应数据库 biz_type 字段：1.订单 2.仓单 3.物流单
 */
@Getter
public enum BizTypeEnum {
    TRADE_ORDER(1, "贸易订单"),
    WAREHOUSE_BILL(2, "仓储仓单"),
    LOGISTICS_BILL(3, "物流运单");

    private final Integer code;
    private final String desc;

    BizTypeEnum(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}