package com.trade.chain.admin.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TradeOrderVO {
    private Long id;
    private String orderNo;
    private Long buyerEnterpriseId;
    private String buyerEnterpriseName;
    private Long sellerEnterpriseId;
    private String sellerEnterpriseName;
    private String goodsName;
    private BigDecimal goodsQuantity;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private Integer orderStatus;
    private LocalDateTime signTime;
    private LocalDateTime createTime;
}
