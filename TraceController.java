package com.trade.controller;

import com.trade.chain.admin.service.ChainService;
import com.trade.common.Result;
import com.trade.entity.chain.ChainSyncLog;
import com.trade.entity.logistics.LogisticsBill;
import com.trade.entity.trade.TradeOrder;
import com.trade.entity.warehouse.WarehouseBill;
import com.trade.mapper.LogisticsBillMapper;
import com.trade.mapper.TradeOrderMapper;
import com.trade.mapper.WarehouseBillMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/trace")
@RequiredArgsConstructor
public class TraceController {

    private final ChainService chainService;
    private final TradeOrderMapper orderMapper;
    private final WarehouseBillMapper warehouseBillMapper;
    private final LogisticsBillMapper logisticsBillMapper;

    /**
     * 扫码核验统一接口
     */
    @GetMapping("/verify")
    public Result<Map<String, Object>> verify(
            @RequestParam Integer bizType,
            @RequestParam Long bizId) {

        Object entity = fetchEntity(bizType, bizId);
        if (entity == null) {
            Map<String, Object> r = new HashMap<>();
            r.put("verified", false);
            r.put("tampered", false);
            r.put("reason", "业务数据不存在（bizType=" + bizType + " bizId=" + bizId + "）");
            return Result.success(r);
        }
        return Result.success(chainService.verify(bizType, bizId, entity));
    }

    /** 按 txHash 查链上存证记录 */
    @GetMapping("/tx/{txHash}")
    public Result<ChainSyncLog> getByTxHash(@PathVariable String txHash) {
        return Result.success(chainService.getByTxHash(txHash));
    }

    /** 查某业务最新的链上存证记录 */
    @GetMapping("/record")
    public Result<ChainSyncLog> getBizRecord(
            @RequestParam Integer bizType,
            @RequestParam Long bizId) {
        return Result.success(chainService.getByBiz(bizType, bizId));
    }

    /** 链上存证 + 当前业务数据 + 核验结果） */
    @GetMapping("/full")
    public Result<Map<String, Object>> fullTrace(
            @RequestParam Integer bizType,
            @RequestParam Long bizId) {

        Map<String, Object> result = new HashMap<>();
        Object entity = fetchEntity(bizType, bizId);
        if (entity == null) {
            result.put("exists", false);
            return Result.success(result);
        }
        result.put("exists", true);
        result.put("entity", entity);
        result.put("bizType", bizType);
        result.put("bizTypeName", bizTypeName(bizType));

        ChainSyncLog log = chainService.getByBiz(bizType, bizId);
        result.put("onChain", log != null);
        result.put("chainLog", log);
        result.put("verify", chainService.verify(bizType, bizId, entity));

        return Result.success(result);
    }

    private Object fetchEntity(Integer bizType, Long bizId) {
        return switch (bizType) {
            case 1 -> orderMapper.selectById(bizId);
            case 2 -> warehouseBillMapper.selectById(bizId);
            case 3 -> logisticsBillMapper.selectById(bizId);
            default -> null;
        };
    }

    private String bizTypeName(Integer bizType) {
        return switch (bizType) {
            case 1 -> "订单";
            case 2 -> "仓单";
            case 3 -> "运单";
            default -> "未知";
        };
    }
}