
package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.trade.common.PageResult;
import com.trade.common.Result;
import com.trade.entity.system.SysUser;
import com.trade.entity.tax.TaxApply;
import com.trade.entity.tax.TaxMessage;
import com.trade.mapper.SysUserMapper;
import com.trade.mapper.TaxApplyMapper;
import com.trade.mapper.TaxMessageMapper;
import com.trade.utils.HashUtils;
import com.trade.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * 发票赋额 & 凭证管理
 *
 * 贸易商：
 *   POST   /tax/apply            提交申请（后端自动生成 billId）
 *   GET    /tax/quota/me         我的额度概览
 *   GET    /tax/message/list     我的消息列表
 *   POST   /tax/message/{id}/read 标记已读
 *
 * 平台管理：
 *   GET    /tax/apply/list       所有申请列表（带 billId）
 *   POST   /tax/apply/{id}/approve 审批通过
 *   POST   /tax/apply/{id}/reject  审批驳回
 *   GET    /tax/apply/log          审批日志（最近操作）
 */
@RestController
@RequestMapping("/tax")
@RequiredArgsConstructor
public class TaxController {

    private final TaxApplyMapper applyMapper;
    private final TaxMessageMapper messageMapper;
    private final SysUserMapper userMapper;
    private final JwtUtils jwtUtils;

    // ========== 贸易商接口 ==========
    @PostMapping("/apply")
    public Result<TaxApply> apply(@RequestBody TaxApply body, HttpServletRequest request) {
        Long userId = resolveUserId(request);
        if (userId == null) return Result.error("未登录");

        SysUser user = userMapper.selectById(userId);
        if (user == null) return Result.error("用户不存在");

        // 后端自动生成 billId —— 唯一数字仓单ID
        String billId = generateBillId();

        TaxApply apply = new TaxApply();
        apply.setBillId(billId);
        apply.setTraderUserId(userId);
        apply.setTraderName(user.getUserName());
        apply.setInvoiceNo(body.getInvoiceNo());
        apply.setTaxAmount(body.getTaxAmount() != null ? body.getTaxAmount() : BigDecimal.ZERO);
        apply.setGoodsName(body.getGoodsName());
        apply.setGoodsQty(body.getGoodsQty() != null ? body.getGoodsQty() : BigDecimal.ZERO);
        apply.setRemark(body.getRemark());
        apply.setStatus(0); // 待审核
        apply.setCreateTime(LocalDateTime.now());
        apply.setUpdateTime(LocalDateTime.now());
        apply.setIsDeleted(0);
        apply.setDataHash(HashUtils.entityHash(apply));

        applyMapper.insert(apply);

        return Result.success(apply);
    }

    /** GET /tax/quota/me —— 我的额度概览 */
    @GetMapping("/quota/me")
    public Result<Map<String, Object>> quotaMe(HttpServletRequest request) {
        Long userId = resolveUserId(request);
        if (userId == null) return Result.error("未登录");

        LambdaQueryWrapper<TaxApply> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaxApply::getTraderUserId, userId);

        Long total = applyMapper.selectCount(wrapper);

        // 已通过的赋额总额
        LambdaQueryWrapper<TaxApply> passed = new LambdaQueryWrapper<>();
        passed.eq(TaxApply::getTraderUserId, userId)
                .eq(TaxApply::getStatus, 1);
        BigDecimal used = applyMapper.selectList(passed).stream()
                .map(TaxApply::getTaxAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> r = new HashMap<>();
        r.put("totalApply", total);
        r.put("passedCount", applyMapper.selectCount(passed));
        r.put("pendingCount", applyMapper.selectCount(
                new LambdaQueryWrapper<TaxApply>().eq(TaxApply::getTraderUserId, userId).eq(TaxApply::getStatus, 0)));
        r.put("rejectedCount", applyMapper.selectCount(
                new LambdaQueryWrapper<TaxApply>().eq(TaxApply::getTraderUserId, userId).eq(TaxApply::getStatus, 2)));
        r.put("usedAmount", used);
        r.put("availableAmount", used); // 简化：可用 = 已通过
        return Result.success(r);
    }

    /** GET /tax/message/list —— 我的消息列表 */
    @GetMapping("/message/list")
    public Result<PageResult<TaxMessage>> messageList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            HttpServletRequest request) {
        Long userId = resolveUserId(request);
        if (userId == null) return Result.error("未登录");

        LambdaQueryWrapper<TaxMessage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaxMessage::getReceiverUserId, userId)
                .orderByDesc(TaxMessage::getCreateTime);

        IPage<TaxMessage> p = messageMapper.selectPage(Page.of(page, size), wrapper);
        return Result.success(PageResult.of(p));
    }

    /** POST /tax/message/{id}/read —— 标记已读 */
    @PostMapping("/message/{id}/read")
    public Result<Boolean> markRead(@PathVariable Long id, HttpServletRequest request) {
        Long userId = resolveUserId(request);
        if (userId == null) return Result.error("未登录");

        TaxMessage msg = messageMapper.selectById(id);
        if (msg == null || !msg.getReceiverUserId().equals(userId)) {
            return Result.error("消息不存在或无权限");
        }
        msg.setIsRead(1);
        messageMapper.updateById(msg);
        return Result.success(true);
    }

    // ========== 平台管理接口 ==========

    /** GET /tax/apply/list —— 所有申请列表（带数字仓单ID） */
    @GetMapping("/apply/list")
    public Result<PageResult<TaxApply>> applyList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {

        LambdaQueryWrapper<TaxApply> wrapper = new LambdaQueryWrapper<>();
        Integer statusInt = parseStatus(status);
        if (statusInt != null) wrapper.eq(TaxApply::getStatus, statusInt);
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(TaxApply::getBillId, keyword)
                    .or().like(TaxApply::getInvoiceNo, keyword)
                    .or().like(TaxApply::getTraderName, keyword));
        }
        wrapper.orderByDesc(TaxApply::getCreateTime);

        IPage<TaxApply> p = applyMapper.selectPage(Page.of(page, size), wrapper);
        return Result.success(PageResult.of(p));
    }

    /** POST /tax/apply/{id}/approve —— 审批通过 */
    @PostMapping("/apply/{id}/approve")
    public Result<TaxApply> approve(@PathVariable Long id,
                                    @RequestBody(required = false) Map<String, String> body,
                                    HttpServletRequest request) {
        Long userId = resolveUserId(request);
        if (userId == null) return Result.error("未登录");

        TaxApply apply = applyMapper.selectById(id);
        if (apply == null) return Result.error("申请不存在");
        if (apply.getStatus() != 0) return Result.error("该申请已处理，状态：" + apply.getStatus());

        apply.setStatus(1); // 已通过
        apply.setAuditUserId(userId);
        apply.setAuditRemark(body != null ? body.get("auditRemark") : null);
        apply.setUpdateTime(LocalDateTime.now());
        // mock 上链
        apply.setTxHash(HashUtils.genTxHash());
        apply.setDataHash(HashUtils.entityHash(apply));
        applyMapper.updateById(apply);

        // 推送消息给贸易商
        sendMessage(apply.getTraderUserId(), "tax_apply_result", apply.getId(), apply.getBillId(),
                "发票赋额申请已通过",
                "您的申请（数字仓单ID：" + apply.getBillId() + "）已审批通过，上链哈希：" + apply.getTxHash());

        return Result.success(apply);
    }

    /** POST /tax/apply/{id}/reject —— 审批驳回 */
    @PostMapping("/apply/{id}/reject")
    public Result<TaxApply> reject(@PathVariable Long id,
                                   @RequestBody(required = false) Map<String, String> body,
                                   HttpServletRequest request) {
        Long userId = resolveUserId(request);
        if (userId == null) return Result.error("未登录");

        TaxApply apply = applyMapper.selectById(id);
        if (apply == null) return Result.error("申请不存在");
        if (apply.getStatus() != 0) return Result.error("该申请已处理");

        apply.setStatus(2); // 已驳回
        apply.setAuditUserId(userId);
        apply.setAuditRemark(body != null ? body.get("auditRemark") : "材料不符合要求");
        apply.setUpdateTime(LocalDateTime.now());
        applyMapper.updateById(apply);

        sendMessage(apply.getTraderUserId(), "tax_apply_result", apply.getId(), apply.getBillId(),
                "发票赋额申请已驳回",
                "您的申请（数字仓单ID：" + apply.getBillId() + "）已被驳回。原因：" + apply.getAuditRemark());

        return Result.success(apply);
    }

    /** GET /tax/apply/statistics —— 赋额申请统计 */
    @GetMapping("/apply/statistics")
    public Result<Map<String, Object>> applyStatistics() {
        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime monthStart = LocalDateTime.now().toLocalDate().withDayOfMonth(1).atStartOfDay();

        // 今日已通过的赋额
        LambdaQueryWrapper<TaxApply> todayWrapper = new LambdaQueryWrapper<>();
        todayWrapper.eq(TaxApply::getStatus, 1)
                .ge(TaxApply::getCreateTime, todayStart);
        java.util.List<TaxApply> todayList = applyMapper.selectList(todayWrapper);
        BigDecimal todayAmount = todayList.stream()
                .map(TaxApply::getTaxAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Long todayCount = (long) todayList.size();

        // 本月已通过的赋额
        LambdaQueryWrapper<TaxApply> monthWrapper = new LambdaQueryWrapper<>();
        monthWrapper.eq(TaxApply::getStatus, 1)
                .ge(TaxApply::getCreateTime, monthStart);
        java.util.List<TaxApply> monthList = applyMapper.selectList(monthWrapper);
        BigDecimal monthAmount = monthList.stream()
                .map(TaxApply::getTaxAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Long monthCount = (long) monthList.size();

        Map<String, Object> r = new HashMap<>();
        r.put("todayAmount", todayAmount);
        r.put("todayCount", todayCount);
        r.put("monthAmount", monthAmount);
        r.put("monthCount", monthCount);
        return Result.success(r);
    }

    /** GET /tax/apply/log —— 审批日志（最近操作） */
    @GetMapping("/apply/log")
    public Result<java.util.List<TaxApply>> applyLog() {
        LambdaQueryWrapper<TaxApply> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(TaxApply::getStatus, 1, 2) // 已处理的
                .orderByDesc(TaxApply::getUpdateTime)
                .last("LIMIT 20");
        return Result.success(applyMapper.selectList(wrapper));
    }

    //工具方法

    /** 生成唯一的数字仓单ID*/
    private String generateBillId() {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String rand = String.format("%06d", new Random().nextInt(1000000));
        return "BILL" + ts + rand;
    }
    private void sendMessage(Long receiverUserId, String type, Long applyId, String billId,
                             String title, String content) {
        TaxMessage msg = new TaxMessage();
        msg.setReceiverUserId(receiverUserId);
        msg.setMsgType(type);
        msg.setRelatedApplyId(applyId);
        msg.setRelatedBillId(billId);
        msg.setTitle(title);
        msg.setContent(content);
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        msg.setIsDeleted(0);
        messageMapper.insert(msg);
    }
    private Integer parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try { return Integer.parseInt(status); } catch (NumberFormatException ignored) {}
        return switch (status.toLowerCase()) {
            case "pending", "待审核" -> 0;
            case "approved", "passed", "已通过" -> 1;
            case "rejected", "驳回" -> 2;
            default -> null;
        };
    }
    private Long resolveUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                Claims c = jwtUtils.parseToken(auth.substring(7));
                return Long.parseLong(c.getSubject());
            } catch (Exception ignored) {}
        }
        String xuid = request.getHeader("X-User-Id");
        if (xuid != null && !xuid.isBlank()) {
            try { return Long.parseLong(xuid); } catch (Exception ignored) {}
        }
        return null;
    }
}