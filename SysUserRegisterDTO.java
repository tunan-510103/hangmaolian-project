package com.trade.chain.admin;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SysUserRegisterDTO {
    @NotBlank(message = "企业名称不能为空")
    @Size(max = 100, message = "企业名称不能超过100字符")
    @JsonAlias({"company_name", "companyName"})
    private String companyName;

    @NotBlank(message = "邮箱不能为空")
    @Pattern(regexp = "^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$", message = "邮箱格式不正确")
    @JsonAlias({"email"})
    private String email;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, message = "密码至少 6 位")
    @JsonAlias({"password"})
    private String password;

    @NotBlank(message = "确认密码不能为空")
    @JsonAlias({"confirm_password", "confirmPassword"})
    private String confirmPassword;

    /**
     * 注册角色：1=贸易商(默认) 2=仓储 3=物流 5=管理员
     * 前端不传时默认为贸易商
     */
    @JsonAlias({"role_type", "roleType"})
    private Integer roleType;

    //仓储/物流方扩展信息

    /** 联系人姓名（仓储/物流方的对接人） */
    @JsonAlias({"contact_person", "contactPerson"})
    private String contactPerson;

    /** 联系电话 */
    @JsonAlias({"phone"})
    private String phone;

    /** 仓储/办公地址 */
    @JsonAlias({"warehouse_addr", "warehouseAddr"})
    private String warehouseAddr;

    /** 仓储面积（㎡） */
    @JsonAlias({"warehouse_area", "warehouseArea"})
    private java.math.BigDecimal warehouseArea;

    /** 仓储类型：普通仓库/冷链/危化品 等 */
    @JsonAlias({"warehouse_type", "warehouseType"})
    private String warehouseType;

    /** 营业执照编号 */
    @JsonAlias({"license_no", "licenseNo"})
    private String licenseNo;

    /** 服务描述（业务范围介绍） */
    @JsonAlias({"service_desc", "serviceDesc"})
    private String serviceDesc;
}