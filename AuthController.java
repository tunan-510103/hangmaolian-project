package com.trade.controller;

import com.trade.chain.admin.LoginDTO;
import com.trade.chain.admin.SysUserRegisterDTO;
import com.trade.chain.admin.vo.SetRoleDTO;
import com.trade.chain.contract.AuthContractService;
import com.trade.common.Result;
import com.trade.entity.system.SysUser;
import com.trade.mapper.SysUserMapper;
import com.trade.utils.AesEncryptUtils;
import com.trade.utils.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.CryptoType;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private static final ObjectMapper OM = new ObjectMapper();

    private final SysUserMapper userMapper;
    private final AesEncryptUtils encryptUtils;
    private final AuthContractService authContractService;
    private final JwtUtils jwtUtils;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(HttpServletRequest request) {
        LoginDTO dto = parseLogin(request);
        String account = dto.getAccount();
        SysUser user = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUserAccount, account)
        );
        if (user == null) {
            user = userMapper.selectOne(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                            .eq(SysUser::getEmail, account)
            );
        }
        if (user == null) return Result.error("账号不存在");
        if (!encryptUtils.matches(dto.getPassword(), user.getPassword())) {
            return Result.error("密码错误");
        }
        if (user.getIsEnable() == 0) return Result.error("账号已禁用");
        // 审核状态检查（仓储/物流/税收需要管理员审核后才能登录）
        Integer audit = user.getAuditStatus();
        if (audit != null && audit == 0) return Result.error("账号待审核，请耐心等待管理员审批");
        if (audit != null && audit == 2) return Result.error("账号申请已被驳回，请联系管理员");
        String token = jwtUtils.createToken(user.getId(), user.getUserAccount(), user.getUserName(), user.getRoleType());
        user.setPassword(null);
        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("user", user);
        return Result.success(resp);
    }

    @Transactional(rollbackFor = Exception.class)
    @PostMapping("/register")
    public Result<SysUser> register(HttpServletRequest request) {
        SysUserRegisterDTO dto = parseRegister(request);
        // 1. 邮箱唯一性校验
        Long existCount = userMapper.selectCount(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getEmail, dto.getEmail())
                        .eq(SysUser::getIsDeleted, 0)
        );
        if (existCount > 0) return Result.error("该邮箱已注册");

        // 2. 确认密码校验
        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            return Result.error("两次密码输入不一致");
        }
        // 2.1 companyName
        String companyName = dto.getCompanyName();
        if (companyName == null || companyName.isBlank()) {
            companyName = dto.getEmail().substring(0, dto.getEmail().indexOf('@'));
            log.info("[Register] 未填写 companyName，使用邮箱前缀={}", companyName);
        }

        // 3. 解析角色
        Integer roleType = dto.getRoleType();
        if (roleType == null || !isValidRole(roleType)) {
            roleType = 1;
        }
        // 是否需要审核：贸易商(1)/管理员(5) 直接通过；仓储(2)/物流(3)/税收(4) 需审核
        boolean needAudit = roleType == 2 || roleType == 3 || roleType == 4;
        log.info("[Register] roleType={} needAudit={}", roleType, needAudit);

        // 4. 生成链地址
        CryptoSuite cryptoSuite = new CryptoSuite(CryptoType.ECDSA_TYPE);
        CryptoKeyPair keyPair = cryptoSuite.getCryptoKeyPair();
        String chainAddress = keyPair.getAddress();
        String encryptedPrivateKey = encryptUtils.encryptAes(keyPair.getHexPrivateKey());
        log.info("[Register] 生成链地址={}", chainAddress);

        // 5. 链操作
        if (!needAudit) {
            try {
                authContractService.register(chainAddress, companyName);
                authContractService.setRole(chainAddress, roleType);
                log.info("[Register] ✅ 链上注册通过 roleType={} address={}", roleType, chainAddress);
            } catch (Exception e) {
                log.error("[Register] 链上注册失败: {}", e.getMessage(), e);
                throw new RuntimeException("链上注册失败，请稍后重试", e);
            }
        } else {
            log.info("[Register] ⏸ roleType={} 需要审核，暂不上链", roleType);
        }

        // 6. 写 DB
        SysUser user = new SysUser();
        user.setEmail(dto.getEmail());
        String accountPrefix = dto.getEmail().substring(0, dto.getEmail().indexOf('@'));
        user.setUserAccount(accountPrefix + "_" + System.currentTimeMillis());
        user.setPassword(encryptUtils.encrypt(dto.getPassword()));
        user.setUserName(companyName);
        user.setRoleType(roleType);
        user.setChainAddress(chainAddress);
        user.setPrivateKey(encryptedPrivateKey);
        // 仓储/物流方扩展业务字段
        user.setContactPerson(dto.getContactPerson());
        user.setPhone(dto.getPhone());
        user.setWarehouseAddr(dto.getWarehouseAddr());
        user.setWarehouseArea(dto.getWarehouseArea());
        user.setWarehouseType(dto.getWarehouseType());
        user.setLicenseNo(dto.getLicenseNo());
        user.setServiceDesc(dto.getServiceDesc());
        if (needAudit) {
            user.setIsEnable(0);        // 待审核，先禁用
            user.setAuditStatus(0);      // 0=待审核
        } else {
            user.setIsEnable(1);
            user.setAuditStatus(1);      // 1=已通过
        }
        try {
            userMapper.insert(user);
        } catch (DuplicateKeyException e) {
            log.warn("[Register] 邮箱重复: {}", dto.getEmail());
            throw new RuntimeException("该邮箱已被注册，请直接登录或换一个邮箱", e);
        }
        user.setPassword(null);
        if (needAudit) {
            Result<SysUser> r = Result.success(user);
            r.setMessage("注册成功，请等待管理员审核后登录");
            return r;
        }
        return Result.success(user);
    }

    @PostMapping("/setRole")
    public Result<Map<String, Object>> setRole(@RequestBody SetRoleDTO dto) {
        // 输入校验
        if (dto.getAddress() == null || dto.getAddress().isBlank()) {
            return Result.error("链地址不能为空");
        }
        if (dto.getRole() == null || !isValidRole(dto.getRole())) {
            return Result.error("角色值无效，只能为 1(贸易商)/2(仓库)/3(物流)/5(管理员)");
        }

        SysUser user = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getChainAddress, dto.getAddress())
        );
        if (user == null) return Result.error("用户不存在");

        String txHash = authContractService.setRole(dto.getAddress(), dto.getRole());

        user.setRoleType(dto.getRole());
        userMapper.updateById(user);
        Map<String, Object> result = new HashMap<>();
        result.put("address", dto.getAddress());
        result.put("role", dto.getRole());
        result.put("txHash", txHash);
        return Result.success(result);
    }

    //角色核验

    @PostMapping("/isTrader")
    public Result<Boolean> isTraderPost(@RequestBody Map<String, String> body) {
        return Result.success(_isTrader(body.get("address")));
    }
    @GetMapping("/isTrader/{address}")
    public Result<Boolean> isTraderGet(@PathVariable String address) {
        return Result.success(_isTrader(address));
    }
    private boolean _isTrader(String addr) {
        boolean chainResult = authContractService.isTrader(addr);
        if (!chainResult) {
            SysUser user = findByChainAddress(addr);
            chainResult = user != null && user.getRoleType() != null && user.getRoleType() == 1;
        }
        return chainResult;
    }

    @PostMapping("/isWarehouse")
    public Result<Boolean> isWarehousePost(@RequestBody Map<String, String> body) {
        return Result.success(_isWarehouse(body.get("address")));
    }
    @GetMapping("/isWarehouse/{address}")
    public Result<Boolean> isWarehouseGet(@PathVariable String address) {
        return Result.success(_isWarehouse(address));
    }
    private boolean _isWarehouse(String addr) {
        boolean chainResult = authContractService.isWarehouse(addr);
        if (!chainResult) {
            SysUser user = findByChainAddress(addr);
            chainResult = user != null && user.getRoleType() != null && user.getRoleType() == 2;
        }
        return chainResult;
    }

    @PostMapping("/isLogistics")
    public Result<Boolean> isLogisticsPost(@RequestBody Map<String, String> body) {
        return Result.success(_isLogistics(body.get("address")));
    }
    @GetMapping("/isLogistics/{address}")
    public Result<Boolean> isLogisticsGet(@PathVariable String address) {
        return Result.success(_isLogistics(address));
    }
    private boolean _isLogistics(String addr) {
        boolean chainResult = authContractService.isLogistics(addr);
        if (!chainResult) {
            SysUser user = findByChainAddress(addr);
            chainResult = user != null && user.getRoleType() != null && user.getRoleType() == 3;
        }
        return chainResult;
    }

    @PostMapping("/isAdmin")
    public Result<Boolean> isAdminPost(@RequestBody Map<String, String> body) {
        return Result.success(_isAdmin(body.get("address")));
    }
    @GetMapping("/isAdmin/{address}")
    public Result<Boolean> isAdminGet(@PathVariable String address) {
        return Result.success(_isAdmin(address));
    }
    private boolean _isAdmin(String addr) {
        boolean chainResult = authContractService.isAdmin(addr);
        if (!chainResult) {
            SysUser user = findByChainAddress(addr);
            chainResult = user != null && user.getRoleType() != null && user.getRoleType() == 5;
        }
        return chainResult;
    }

    @PostMapping("/transferAdmin")
    public Result<String> transferAdmin(@RequestBody Map<String, String> body) {
        String newAddr = body.get("newAddress");
        SysUser newAdmin = findByChainAddress(newAddr);
        if (newAdmin == null) return Result.error("目标用户不存在");
        String txHash = authContractService.transferAdmin(newAddr);
        newAdmin.setRoleType(5);
        userMapper.updateById(newAdmin);
        return Result.success(newAddr);
    }

    private SysUser findByChainAddress(String addr) {
        return userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getChainAddress, addr)
        );
    }

    private boolean isValidRole(int role) {
        return role == 1 || role == 2 || role == 3 || role == 5;
    }

    /** 通用：解析 LoginDTO */
    private LoginDTO parseLogin(HttpServletRequest request) {
        String ct = request.getContentType();
        LoginDTO dto = new LoginDTO();
        if (ct != null && ct.contains("application/json")) {
            try (InputStream is = request.getInputStream()) {
                LoginDTO fromJson = OM.readValue(is, LoginDTO.class);
                dto.setAccount(fromJson.getAccount());
                dto.setPassword(fromJson.getPassword());
            } catch (IOException e) {
                throw new RuntimeException("JSON 解析失败", e);
            }
        } else {
            dto.setAccount(first(request.getParameter("account"), request.getParameter("email")));
            dto.setPassword(first(request.getParameter("password"), request.getParameter("userPassword")));
        }
        return dto;
    }

    /** 通用：解析 SysUserRegisterDTO */
    private SysUserRegisterDTO parseRegister(HttpServletRequest request) {
        String ct = request.getContentType();
        if (ct != null && ct.contains("application/json")) {
            try (InputStream is = request.getInputStream()) {
                return OM.readValue(is, SysUserRegisterDTO.class);
            } catch (IOException e) {
                throw new RuntimeException("JSON 解析失败", e);
            }
        }
        SysUserRegisterDTO dto = new SysUserRegisterDTO();
        dto.setCompanyName(first(request.getParameter("companyName"), request.getParameter("company_name")));
        dto.setEmail(request.getParameter("email"));
        dto.setPassword(request.getParameter("password"));
        dto.setConfirmPassword(first(request.getParameter("confirmPassword"), request.getParameter("confirm_password")));
        String rt = first(request.getParameter("roleType"), request.getParameter("role_type"));
        if (rt != null && !rt.isBlank()) {
            try { dto.setRoleType(Integer.parseInt(rt)); } catch (NumberFormatException ignored) {}
        }
        return dto;
    }

    private String first(String... vals) {
        for (String v : vals) if (v != null && !v.isBlank()) return v;
        return null;
    }
}