package com.trade.entity.logistics;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_logistics_bill")
public class LogisticsBill {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private String docNo;           // 单证编号
    private String logisticsNo;
    private Long warehouseBillId;
    private Long logisticsUserId;
    private String logisticsCompany;
    private String logisticsAddr;
    private String fromLocation;    // 起点
    private String toLocation;      // 终点
    private String currentLocation;
    private String transportInfo;
    private LocalDateTime departTime;
    private LocalDateTime receiveTime;
    private Integer logisticsStatus; // 0待起运 1在途 2已签收
    private String remark;          // 备注
    private String dataHash;
    private String txHash;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer isDeleted;
}