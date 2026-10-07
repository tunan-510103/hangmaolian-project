package com.trade.chain.admin.vo;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateOrderDTO {
    private Long warehouseUserId;
    private String goodsName;
    private BigDecimal goodsNum;
    private String tradePrice;
    private String dataHash;
}