package com.trade.entity.trade;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_trade_order")
public class TradeOrder {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long buyerUserId;
    private Long sellerUserId;
    private String goodsName;
    private BigDecimal goodsNum;
    private String tradePrice;
    private String contractContent;
    /** 链上合约自动生成的 orderId */
    private Long chainOrderId;
    private Integer orderStatus; // 0待入库 3已入库 1运输中 2已签收
    private String warehouseAddr;
    private String dataHash;
    private String txHash;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer isDeleted;
}