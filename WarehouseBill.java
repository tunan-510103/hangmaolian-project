package com.trade.entity.warehouse;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_warehouse_bill")
public class WarehouseBill {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String warehouseBillNo;
    private Long tradeOrderId;
    private Long warehouseUserId;
    private BigDecimal goodsWeight;
    private String qualityReport;
    private Long cargoOwnerId;
    private Integer billStatus; // 0新建 1已确权 2已出库 3质押锁定
    private String dataHash;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer isDeleted;
}
