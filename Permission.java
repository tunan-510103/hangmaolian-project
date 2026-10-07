package com.trade.entity.system;


import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName("t_permission")
public class Permission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long parentId;

    @JsonProperty("label")
    private String name;
    private Integer type;
    private String path;
    private Integer sort;
    private LocalDateTime createTime;

    @TableField(exist = false)
    private List<Permission> children;

    @TableField(exist = false)
    private Boolean checked;
}