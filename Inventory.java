package com.trade.entity.warehouse;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_inventory")
public class Inventory {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String skuCode;
    private String goodsName;
    private String warehouseLocation;
    private BigDecimal stockNum;
    private String unit;
    private Integer stockStatus; // 0正常 1低库存
    private Long warehouseUserId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer isDeleted;
}
