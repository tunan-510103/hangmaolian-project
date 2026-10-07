package com.trade.entity.tax;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 消息通知 —— 审核结果推送给贸易商
 */
@Data
@TableName("t_tax_message")
public class TaxMessage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long receiverUserId;
    private String msgType;
    private Long relatedApplyId;
    private String relatedBillId;
    private String title;
    private String content;
    private Integer isRead;
    private LocalDateTime createTime;
    @TableLogic
    private Integer isDeleted;
}