package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.trade.common.PageResult;
import com.trade.common.Result;
import com.trade.entity.system.SysUser;
import com.trade.mapper.SysUserMapper;
import com.trade.utils.AesEncryptUtils;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.CryptoType;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final SysUserMapper userMapper;
    private final AesEncryptUtils encryptUtils;


    @GetMapping("/list")
    public Result<PageResult<UserVO>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer roleType,
            @RequestParam(required = false) Integer isEnable) {

        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(SysUser::getEmail, keyword)
                    .or().like(SysUser::getUserName, keyword)
                    .or().like(SysUser::getChainAddress, keyword)
                    .or().like(SysUser::getUserAccount, keyword));
        }
        if (roleType != null) wrapper.eq(SysUser::getRoleType, roleType);
        if (isEnable != null) wrapper.eq(SysUser::getIsEnable, isEnable);
        wrapper.orderByDesc(SysUser::getCreateTime);

        IPage<SysUser> result = userMapper.selectPage(new Page<>(page, size), wrapper);
        IPage<UserVO> voPage = result.convert(this::toVO);

        PageResult<UserVO> pageResult = new PageResult<>();
        pageResult.setList(voPage.getRecords());
        pageResult.setTotal(voPage.getTotal());
        pageResult.setPages(voPage.getPages());
        pageResult.setPage(voPage.getCurrent());
        pageResult.setSize(voPage.getSize());
        return Result.success(pageResult);
    }

    @GetMapping("/options")
    public Result<List<Map<String, Object>>> options(@RequestParam(required = false) Integer roleType) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getIsEnable, 1);
        if (roleType != null) wrapper.eq(SysUser::getRoleType, roleType);
        wrapper.orderByAsc(SysUser::getId);

        List<SysUser> users = userMapper.selectList(wrapper);
        List<Map<String, Object>> list = users.stream().map(u -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", u.getId());
            m.put("userName", u.getUserName());
            m.put("email", u.getEmail());
            m.put("chainAddress", u.getChainAddress());
            m.put("roleType", u.getRoleType());
            m.put("roleTypeName", getRoleTypeName(u.getRoleType()));
            return m;
        }).collect(Collectors.toList());
        return Result.success(list);
    }

    @GetMapping("/{id}")
    public Result<UserVO> detail(@PathVariable Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        return Result.success(toVO(user));
    }



    @PostMapping("/changePassword")
    public Result<String> changePassword(@RequestBody ChangePasswordDTO dto) {
        if (dto.getUserId() == null) return Result.error("缺少 userId");
        if (dto.getOldPassword() == null || dto.getOldPassword().isBlank()) return Result.error("请输入原密码");
        if (dto.getNewPassword() == null || dto.getNewPassword().isBlank()) return Result.error("请输入新密码");
        if (dto.getConfirmPassword() == null || dto.getConfirmPassword().isBlank()) return Result.error("请输入确认密码");
        if (dto.getNewPassword().length() < 6) return Result.error("新密码长度不能少于6位");
        if (!dto.getNewPassword().equals(dto.getConfirmPassword())) return Result.error("两次输入的新密码不一致");
        if (dto.getOldPassword().equals(dto.getNewPassword())) return Result.error("新密码不能与原密码相同");

        SysUser user = userMapper.selectById(dto.getUserId());
        if (user == null) return Result.error("用户不存在");
        if (user.getIsEnable() == 0) return Result.error("账号已禁用");

        // 校验原密码
        if (!encryptUtils.matches(dto.getOldPassword(), user.getPassword())) {
            return Result.error("原密码错误");
        }

        // 加密新密码并存库
        user.setPassword(encryptUtils.encrypt(dto.getNewPassword()));
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        return Result.success("密码修改成功");
    }

    // 修改用户资料
    @PutMapping("/{id}")
    public Result<UserVO> update(@PathVariable Long id, @RequestBody UpdateUserDTO dto) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");

        if (dto.getEmail() != null) user.setEmail(dto.getEmail());
        if (dto.getUserName() != null) user.setUserName(dto.getUserName());
        if (dto.getPhone() != null) user.setPhone(dto.getPhone());
        if (dto.getRoleType() != null) user.setRoleType(dto.getRoleType());

        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        return Result.success(toVO(user));
    }

    @PatchMapping("/{id}/status")
    public Result<String> updateStatus(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");

        Integer isEnable = body.get("isEnable");
        if (isEnable == null) return Result.error("缺少 isEnable 参数");

        if (isEnable == 0 && user.getRoleType() != null && user.getRoleType() == 5) {
            return Result.error("不能禁用管理员");
        }

        user.setIsEnable(isEnable);
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        return Result.success(isEnable == 1 ? "已启用" : "已禁用");
    }

    // ============ 新增：删除用户 ============

    /**
     * DELETE /user/{id}
     * 不能删除管理员（roleType=5）
     */
    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        if (user.getRoleType() != null && user.getRoleType() == 5) {
            return Result.error("不能删除管理员");
        }
        userMapper.deleteById(id);
        return Result.success("已删除");
    }
    @PostMapping("/disable/{id}")
    public Result<String> disable(@PathVariable Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        if (user.getRoleType() != null && user.getRoleType() == 5) return Result.error("不能禁用管理员");
        user.setIsEnable(0);
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        return Result.success("已禁用");
    }

    @PostMapping("/enable/{id}")
    public Result<String> enable(@PathVariable Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        user.setIsEnable(1);
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        return Result.success("已启用");
    }

    // ============ 角色申请审核接口
    @GetMapping("/apply/status")
    public Result<Map<String, Object>> getApplyStatus(@RequestParam String chainAddress) {
        SysUser user = userMapper.selectOne(
                new LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getChainAddress, chainAddress)
                        .last("LIMIT 1")
        );

        Map<String, Object> data = new HashMap<>();
        if (user == null) {
            data.put("status", "none");
        } else {
            data.put("userId", user.getId());
            data.put("email", user.getEmail());
            data.put("roleType", user.getRoleType());
            data.put("isEnable", user.getIsEnable());
            Integer audit = user.getAuditStatus();
            data.put("status", audit == null ? "none"
                    : audit == 0 ? "pending"
                    : audit == 1 ? "approved"
                    : "rejected");
            if (audit != null && audit == 2) {
                data.put("rejectReason", user.getAuditRemark());
            }
        }
        return Result.success(data);
    }
    @GetMapping("/apply/list")
    public Result<PageResult<UserVO>> applyList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String status) {

        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        // 只查需要审核的角色：仓储/物流/税收
        wrapper.in(SysUser::getRoleType, 2, 3, 4);

        if (status != null) {
            switch (status.toLowerCase()) {
                case "pending"  -> wrapper.eq(SysUser::getAuditStatus, 0);
                case "approved" -> wrapper.eq(SysUser::getAuditStatus, 1);
                case "rejected" -> wrapper.eq(SysUser::getAuditStatus, 2);
            }
        }
        wrapper.orderByDesc(SysUser::getCreateTime);

        IPage<SysUser> result = userMapper.selectPage(new Page<>(page, size), wrapper);
        IPage<UserVO> voPage = result.convert(this::toVO);
        PageResult<UserVO> pr = new PageResult<>();
        pr.setList(voPage.getRecords());
        pr.setTotal(voPage.getTotal());
        pr.setPages(voPage.getPages());
        pr.setPage(voPage.getCurrent());
        pr.setSize(voPage.getSize());
        return Result.success(pr);
    }


    @PostMapping("/apply/{applyId}/approve")
    public Result<Map<String, Object>> approve(@PathVariable Long applyId,
                                               @RequestBody(required = false) Map<String, String> body) {
        SysUser user = userMapper.selectById(applyId);
        if (user == null) return Result.error("申请记录不存在");
        if (user.getAuditStatus() != null && user.getAuditStatus() != 0) {
            return Result.error("该申请已处理（当前状态=" + user.getAuditStatus() + "）");
        }

        user.setAuditStatus(1);
        user.setIsEnable(1);
        user.setAuditRemark(body != null ? body.getOrDefault("remark", "审核通过") : "审核通过");
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);

        Map<String, Object> r = new java.util.HashMap<>();
        r.put("userId", user.getId());
        r.put("email", user.getEmail());
        r.put("roleType", user.getRoleType());
        r.put("chainAddress", user.getChainAddress());
        r.put("msg", "审核通过（角色标记存链下 DB，不上链）");
        return Result.success(r);
    }

    /**
     * POST /user/apply/{applyId}/reject — 驳回申请
     */
    @PostMapping("/apply/{applyId}/reject")
    public Result<String> reject(@PathVariable Long applyId,
                                 @RequestBody(required = false) Map<String, String> body) {
        SysUser user = userMapper.selectById(applyId);
        if (user == null) return Result.error("申请记录不存在");
        if (user.getAuditStatus() != null && user.getAuditStatus() != 0) {
            return Result.error("该申请已处理");
        }

        user.setAuditStatus(2);
        user.setIsEnable(0);
        String remark = body != null ? body.getOrDefault("remark", "申请不符合要求") : "申请不符合要求";
        user.setAuditRemark(remark);
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        return Result.success("已驳回");
    }

    @PostMapping("/apply/submit")
    public Result<Map<String, Object>> applySubmit(@RequestBody Map<String, Object> body) {
        // 1. 解析角色（仓储=2 / 物流=3 / 税收=4）
        Integer roleType = parseInt(body.get("roleType"));
        if (roleType == null) {
            // 前端可能通过 applyType 传：warehouse / logistics
            String applyType = (String) body.get("applyType");
            if ("warehouse".equalsIgnoreCase(applyType)) roleType = 2;
            else if ("logistics".equalsIgnoreCase(applyType)) roleType = 3;
            else roleType = 2; // 默认仓储
        }
        if (roleType != 2 && roleType != 3 && roleType != 4) {
            return Result.error("申请角色无效：只能是 2=仓储 / 3=物流 / 4=税收");
        }

        // 2. 必填字段校验
        String companyName = (String) body.get("companyName");
        String email       = (String) body.get("email");
        String password    = (String) body.get("password");
        if (email       == null || email.isBlank())       return Result.error("邮箱不能为空");
        if (companyName == null || companyName.isBlank()) {
            companyName = email.substring(0, email.indexOf('@'));
            log.info("[ApplySubmit] 未填写 companyName，使用邮箱前缀={}", companyName);
        }
        boolean autoGenPassword = password == null || password.isBlank();
        if (autoGenPassword) {
            password = generateRandomPassword(12);
            log.info("[ApplySubmit] 未传密码，自动生成={}", password);
        }

        String chainAddress = stringOf(body.get("chainAddress"));
        String encryptedPrivateKey;
        if (chainAddress != null && !chainAddress.isBlank()) {
            SysUser existUser = userMapper.selectOne(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                            .eq(SysUser::getChainAddress, chainAddress)
                            .eq(SysUser::getIsDeleted, 0)
            );
            if (existUser != null) {
                if (existUser.getRoleType() != null && existUser.getRoleType() == 5) {
                    log.warn("[ApplySubmit] 管理员 account={} 禁止走角色申请", existUser.getUserAccount());
                    return Result.error("管理员账号不允许提交仓储/物流/税收申请");
                }
                if (!email.equals(existUser.getEmail())) {
                    Long emailCnt = userMapper.selectCount(
                            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                                    .eq(SysUser::getEmail, email)
                                    .eq(SysUser::getIsDeleted, 0)
                    );
                    if (emailCnt > 0) {
                        return Result.error("邮箱 " + email + " 已被其他账号使用，请换一个");
                    }
                    existUser.setEmail(email);
                }
                existUser.setUserName(companyName);
                existUser.setRoleType(roleType);
                existUser.setIsEnable(0);
                existUser.setAuditStatus(0);
                String contactPerson = stringOf(body.get("contactPerson"));
                if (contactPerson == null || contactPerson.isBlank()) contactPerson = stringOf(body.get("contactName"));
                existUser.setContactPerson(contactPerson);
                existUser.setPhone(stringOf(body.get("phone")));

                String licenseNo = stringOf(body.get("licenseNo"));
                if (licenseNo == null || licenseNo.isBlank()) licenseNo = stringOf(body.get("businessLicense"));
                existUser.setLicenseNo(licenseNo);
                String warehouseAddr = stringOf(body.get("warehouseAddr"));
                if (warehouseAddr == null || warehouseAddr.isBlank()) warehouseAddr = stringOf(body.get("warehouseAddress"));
                existUser.setWarehouseAddr(warehouseAddr);
                existUser.setWarehouseArea(parseDecimal(body.get("warehouseArea")));
                existUser.setWarehouseType(stringOf(body.get("warehouseType")));

                existUser.setLogisticsType(stringOf(body.get("logisticsType")));
                existUser.setServiceScope(stringOf(body.get("serviceScope")));
                existUser.setOwnVehicleCount(parseInt(body.get("ownVehicleCount")));

                existUser.setServiceDesc(stringOf(body.get("serviceDesc")));
                existUser.setUpdateTime(LocalDateTime.now());
                if (password != null && !password.isBlank()) {
                    existUser.setPassword(encryptUtils.encrypt(password));
                }
                try {
                    userMapper.updateById(existUser);
                } catch (DuplicateKeyException e) {
                    log.warn("[ApplySubmit] 更新已有用户时唯一键冲突: {}", e.getMessage());
                    return Result.error("该邮箱已被其他账号使用，请换一个邮箱");
                }
                log.info("[ApplySubmit] 复用已有用户 id={} chainAddress={} 升级为 roleType={}",
                        existUser.getId(), chainAddress, roleType);

                Map<String, Object> r = new HashMap<>();
                r.put("userId", existUser.getId());
                r.put("email", existUser.getEmail());
                r.put("chainAddress", chainAddress);
                r.put("roleType", roleType);
                Result<Map<String, Object>> result = Result.success(r);
                result.setMessage("申请已提交，请等待管理员审核");
                return result;
            }
            CryptoSuite cs = new CryptoSuite(CryptoType.ECDSA_TYPE);
            CryptoKeyPair kp = cs.getCryptoKeyPair();
            chainAddress = kp.getAddress();
            encryptedPrivateKey = encryptUtils.encryptAes(kp.getHexPrivateKey());
        } else {
            CryptoSuite cs = new CryptoSuite(CryptoType.ECDSA_TYPE);
            CryptoKeyPair kp = cs.getCryptoKeyPair();
            chainAddress = kp.getAddress();
            encryptedPrivateKey = encryptUtils.encryptAes(kp.getHexPrivateKey());
        }
        log.info("[ApplySubmit] 最终链地址={} roleType={}", chainAddress, roleType);

        SysUser user = new SysUser();
        user.setEmail(email);
        String accountPrefix = email.substring(0, email.indexOf('@'));
        user.setUserAccount(accountPrefix + "_" + System.currentTimeMillis());
        user.setPassword(encryptUtils.encrypt(password));
        user.setUserName(companyName);
        user.setRoleType(roleType);
        user.setChainAddress(chainAddress);
        user.setPrivateKey(encryptedPrivateKey);
        // 仓储/物流/税收需管理员审核：先禁用 + 待审核
        user.setIsEnable(0);
        user.setAuditStatus(0);

        // 业务扩展字段（仓储/物流表单里的）
        user.setContactPerson(stringOf(body.get("contactPerson")));
        user.setPhone(stringOf(body.get("phone")));
        user.setWarehouseAddr(stringOf(body.get("warehouseAddr")));
        user.setWarehouseArea(decimalOf(body.get("warehouseArea")));
        user.setWarehouseType(stringOf(body.get("warehouseType")));
        user.setLicenseNo(stringOf(body.get("licenseNo")));
        user.setServiceDesc(stringOf(body.get("serviceDesc")));
        // 物流方特有字段
        user.setServiceScope(stringOf(body.get("serviceScope")));
        user.setOwnVehicleCount(parseInt(body.get("ownVehicleCount")));
        user.setLogisticsType(stringOf(body.get("logisticsType")));

        try {
            userMapper.insert(user);
        } catch (DuplicateKeyException e) {
            return Result.error("该邮箱已被注册，请直接登录或换一个邮箱");
        }

        Map<String, Object> r = new HashMap<>();
        r.put("userId", user.getId());
        r.put("email", user.getEmail());
        r.put("chainAddress", chainAddress);
        r.put("roleType", roleType);
        if (autoGenPassword) {
            r.put("tempPassword", password);
            r.put("tempPasswordHint", "⚠️ 这是自动生成的临时密码，请立即保存！审核通过后用它登录，登录后尽快修改");
        }
        Result<Map<String, Object>> result = Result.success(r);
        result.setMessage(autoGenPassword 
                ? "申请已提交！请保存好返回的临时密码，审核通过后用它登录" 
                : "申请已提交，请等待管理员审核");
        return result;
    }

    //辅助方法
    /** 生成随机密码：大小写字母 + 数字，避免易混淆字符 */
    private static String generateRandomPassword(int len) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        java.util.Random r = new java.util.Random();
        for (int i = 0; i < len; i++) sb.append(chars.charAt(r.nextInt(chars.length())));
        return sb.toString();
    }

    private static String stringOf(Object o) { return o == null ? null : o.toString(); }
    private static java.math.BigDecimal parseDecimal(Object o) {
        if (o == null) return null;
        try { return new java.math.BigDecimal(o.toString()); } catch (Exception e) { return null; }
    }
    private static Integer parseInt(Object o) {
        if (o == null) return null;
        if (o instanceof Integer i) return i;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(o.toString()); } catch (Exception e) { return null; }
    }
    private static BigDecimal decimalOf(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        try { return new BigDecimal(o.toString()); } catch (Exception e) { return null; }
    }

    // ============ DTO / VO / 工具方法 ============

    @Data
    public static class ChangePasswordDTO {
        private Long userId;
        private String oldPassword;
        private String newPassword;
        private String confirmPassword;
    }

    @Data
    public static class UpdateUserDTO {
        private String email;
        private String userName;
        private String phone;
        private Integer roleType;
    }

    private UserVO toVO(SysUser user) {
        UserVO vo = new UserVO();
        BeanUtils.copyProperties(user, vo);
        vo.setRoleTypeName(getRoleTypeName(user.getRoleType()));
        return vo;
    }

    private String getRoleTypeName(Integer roleType) {
        if (roleType == null) return "未知";
        return switch (roleType) {
            case 1 -> "贸易商";
            case 2 -> "仓储";
            case 3 -> "物流";
            case 4 -> "税收";
            case 5 -> "管理员";
            default -> "未知";
        };
    }

    @Data
    public static class UserVO {
        private Long id;
        private String userAccount;
        private String email;
        private String userName;
        private Integer roleType;
        private String roleTypeName;
        private String chainAddress;
        private String phone;
        private Integer isEnable;
        private LocalDateTime createTime;
        private LocalDateTime updateTime;

        // ============ 审核相关字段 ============
        private Integer auditStatus;
        private String auditRemark;

        // ============ 仓储/物流扩展业务字段 ============
        private String contactPerson;
        private String warehouseAddr;
        private BigDecimal warehouseArea;
        private String warehouseType;
        private String licenseNo;
        private String serviceDesc;
        private String logisticsType;
        private String serviceScope;
        private Integer ownVehicleCount;

        @JsonIgnore
        private String password;
    }
}