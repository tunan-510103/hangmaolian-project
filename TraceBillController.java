package com.trade.controller;

import com.trade.common.Result;
import com.trade.entity.tax.TaxApply;
import com.trade.mapper.TaxApplyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 存证溯源 —— 按 billId（数字仓单ID）查询
 * GET /trace/bill/{billId}            基本信息
 * GET /trace/bill/{billId}/cargo      商品/货物详情
 * GET /trace/bill/{billId}/timeline   时间线（全生命周期事件）
 */
@RestController
@RequestMapping("/trace/bill")
@RequiredArgsConstructor
public class TraceBillController {

    private final TaxApplyMapper applyMapper;

    /** GET /trace/bill/{billId} —— 基本信息 */
    @GetMapping("/{billId}")
    public Result<Map<String, Object>> getBill(@PathVariable String billId) {
        TaxApply apply = applyMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<TaxApply>()
                        .eq(TaxApply::getBillId, billId));
        if (apply == null) {
            return Result.error("数字仓单ID不存在：" + billId);
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("billId", apply.getBillId());
        r.put("traderName", apply.getTraderName());
        r.put("invoiceNo", apply.getInvoiceNo());
        r.put("taxAmount", apply.getTaxAmount());
        r.put("goodsName", apply.getGoodsName());
        r.put("goodsQty", apply.getGoodsQty());
        r.put("remark", apply.getRemark());
        r.put("status", apply.getStatus());
        r.put("statusText", statusText(apply.getStatus()));
        r.put("txHash", apply.getTxHash());
        r.put("dataHash", apply.getDataHash());
        r.put("createTime", apply.getCreateTime());
        r.put("updateTime", apply.getUpdateTime());
        return Result.success(r);
    }

    /** GET /trace/bill/{billId}/cargo —— 货物详情 */
    @GetMapping("/{billId}/cargo")
    public Result<Map<String, Object>> getCargo(@PathVariable String billId) {
        TaxApply apply = applyMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<TaxApply>()
                        .eq(TaxApply::getBillId, billId));
        if (apply == null) return Result.error("数字仓单ID不存在：" + billId);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("billId", apply.getBillId());
        r.put("goodsName", apply.getGoodsName());
        r.put("goodsQty", apply.getGoodsQty());
        r.put("taxAmount", apply.getTaxAmount());
        r.put("invoiceNo", apply.getInvoiceNo());
        r.put("traderName", apply.getTraderName());
        return Result.success(r);
    }

    /** GET /trace/bill/{billId}/timeline —— 全生命周期时间线 */
    @GetMapping("/{billId}/timeline")
    public Result<List<Map<String, Object>>> getTimeline(@PathVariable String billId) {
        TaxApply apply = applyMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<TaxApply>()
                        .eq(TaxApply::getBillId, billId));
        if (apply == null) return Result.error("数字仓单ID不存在：" + billId);

        List<Map<String, Object>> timeline = new ArrayList<>();

        // 1. 申请创建
        Map<String, Object> e1 = new LinkedHashMap<>();
        e1.put("time", apply.getCreateTime());
        e1.put("event", "申请提交");
        e1.put("actor", apply.getTraderName());
        e1.put("detail", "提交发票赋额申请，生成数字仓单ID：" + apply.getBillId());
        timeline.add(e1);

        // 2. 审核结果
        if (apply.getStatus() != 0) {
            Map<String, Object> e2 = new LinkedHashMap<>();
            e2.put("time", apply.getUpdateTime());
            e2.put("event", apply.getStatus() == 1 ? "审批通过" : "审批驳回");
            e2.put("actor", "平台管理员");
            e2.put("detail", apply.getAuditRemark() != null ? apply.getAuditRemark() : statusText(apply.getStatus()));
            timeline.add(e2);

            if (apply.getStatus() == 1 && apply.getTxHash() != null) {
                Map<String, Object> e3 = new LinkedHashMap<>();
                e3.put("time", apply.getUpdateTime());
                e3.put("event", "链上存证");
                e3.put("actor", "FISCO BCOS 链");
                e3.put("detail", "txHash: " + apply.getTxHash());
                timeline.add(e3);
            }
        }

        return Result.success(timeline);
    }

    private String statusText(Integer s) {
        if (s == null) return "未知";
        return switch (s) {
            case 0 -> "待审核";
            case 1 -> "已通过";
            case 2 -> "已驳回";
            default -> "未知";
        };
    }
}