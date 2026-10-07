package com.trade.entity.system;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_sys_user")
public class SysUser {
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 登录账号
     */
    private String userAccount;

    /**
     * 登录邮箱（唯一）
     */
    private String email;

    /**
     * 登录密码（AES加密存储）
     */
    @JsonIgnore
    private String password;

    /**
     * 企业/用户名称
     */
    private String userName;

    /**
     * 角色：1贸易商，2仓储，3物流，4税收，5管理员
     */
    private Integer roleType;

    /**
     * 区块链账户地址
     */
    private String chainAddress;

    /**
     * 链上私钥（AES 加密存储，生产环境不得明文落库）
     * 用 @JsonIgnore 防止接口返回时泄露
     */
    @JsonIgnore
    private String privateKey;

    /**
     * 联系电话（AES加密存储）
     */
    private String phone;

    /** 联系人姓名（仓储/物流方的对接人） */
    private String contactPerson;

    /** 仓储/办公地址（链下业务数据，不上链） */
    private String warehouseAddr;

    /** 仓储面积（㎡，仓储方专用） */
    private java.math.BigDecimal warehouseArea;

    /** 仓储类型：普通仓库/冷链仓库/危化品仓库 等 */
    private String warehouseType;

    /** 营业执照编号 */
    private String licenseNo;

    /** 服务描述（仓储/物流方的业务范围介绍） */
    private String serviceDesc;

    // ============ 物流方特有字段 ============
    /** 物流类型：陆运/海运/空运/快递 等 */
    private String logisticsType;

    /** 服务范围：全国/省内/同城 等 */
    private String serviceScope;

    /** 自有车辆数量（物流方） */
    private Integer ownVehicleCount;

    /**
     * 账号状态：0禁用，1启用
     */
    private Integer isEnable;

    /**
     * 角色申请审核状态（仓储/物流/税收注册需要管理员审核）：
     *   0 待审核
     *   1 已通过（已链上注册）
     *   2 已驳回
     * 贸易商(1) / 管理员(5) 注册时自动置为 1
     */
    private Integer auditStatus;

    /** 审核意见（驳回时填写） */
    private String auditRemark;

    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    /**
     * 逻辑删除标记
     */
    @TableLogic
    private Integer isDeleted;

}