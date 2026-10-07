package com.trade.entity.tax;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_tax_apply")

public class TaxApply {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String billId;
    private Long traderUserId;
    private String traderName;
    private String invoiceNo;
    private BigDecimal taxAmount;
    private String goodsName;
    private BigDecimal goodsQty;
    private String remark;
    private Integer status;/**状态：0 待审核，1 已通过，2 已驳回*/
    private Long auditUserId;
    private String auditRemark;
    private String txHash;
    private String dataHash;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer isDeleted;
}