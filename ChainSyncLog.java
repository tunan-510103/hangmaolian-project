package com.trade.entity.chain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_chain_sync_log")
public class ChainSyncLog {
    @TableId(value = "日志编号", type = IdType.AUTO)
    private Long id;

    @TableField("业务类型")
    private Integer bizType; // 1订单 2仓单 3运单

    @TableField("业务主键ID")
    private Long bizId;

    @TableField("data_hash")
    private String dataHash;

    @TableField("交易哈希")
    private String txHash;

    @TableField("block_height")
    private Long blockHeight;

    @TableField("同步状态")
    private Integer syncStatus; // 0待上链 1成功 2失败

    @TableField("异常信息")
    private String errorMsg;

    @TableField("创建时间")
    private LocalDateTime createTime;

    @TableField("update_time")
    private LocalDateTime updateTime;

    @TableLogic
    @TableField("is_deleted")
    private Integer isDeleted;
}