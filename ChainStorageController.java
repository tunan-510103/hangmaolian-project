package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.trade.chain.admin.service.ChainService;
import com.trade.common.PageResult;
import com.trade.common.Result;
import com.trade.entity.chain.ChainSyncLog;
import com.trade.entity.logistics.LogisticsBill;
import com.trade.entity.trade.TradeOrder;
import com.trade.entity.warehouse.WarehouseBill;
import com.trade.mapper.ChainSyncLogMapper;
import com.trade.mapper.LogisticsBillMapper;
import com.trade.mapper.TradeOrderMapper;
import com.trade.mapper.WarehouseBillMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;
@Slf4j
@RestController
@RequestMapping("/chain/storage")
@RequiredArgsConstructor
public class ChainStorageController {

    private final ChainSyncLogMapper syncLogMapper;
    private final TradeOrderMapper orderMapper;
    private final WarehouseBillMapper warehouseBillMapper;
    private final LogisticsBillMapper logisticsBillMapper;
    private final ChainService chainService;

    // 1. 存证档案列表（后端分页，高效）
    @GetMapping("/list")
    public Result<PageResult<Map<String, Object>>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false, defaultValue = "all") String certType,
            @RequestParam(required = false) String keyword) {

        LambdaQueryWrapper<ChainSyncLog> wrapper = new LambdaQueryWrapper<>();
        if ("order".equalsIgnoreCase(certType)) wrapper.eq(ChainSyncLog::getBizType, 1);
        else if ("warehouse".equalsIgnoreCase(certType)) wrapper.eq(ChainSyncLog::getBizType, 2);
        else if ("logistics".equalsIgnoreCase(certType)) wrapper.eq(ChainSyncLog::getBizType, 3);

        wrapper.eq(ChainSyncLog::getSyncStatus, 1);
        wrapper.orderByDesc(ChainSyncLog::getCreateTime);

        IPage<ChainSyncLog> logPage = syncLogMapper.selectPage(new Page<>(page, size), wrapper);
        List<Map<String, Object>> enriched = enrichBizInfo(logPage.getRecords(), keyword);

        PageResult<Map<String, Object>> result = new PageResult<>();
        result.setList(enriched);
        result.setTotal(logPage.getTotal());
        result.setPages(logPage.getPages());
        result.setPage(logPage.getCurrent());
        result.setSize(logPage.getSize());
        return Result.success(result);
    }

    // 2. 关联匹配（、订单号、运单号）

    @GetMapping("/match")
    public Result<Map<String, Object>> match(@RequestParam String input) {
        if (input == null || input.isBlank()) return Result.error("请输入存证编号或任务编号");
        String trimmed = input.trim();

        // txHash 精确 + 前缀匹配
        List<ChainSyncLog> logs = syncLogMapper.selectList(
                new LambdaQueryWrapper<ChainSyncLog>()
                        .eq(ChainSyncLog::getSyncStatus, 1)
                        .and(w -> w.eq(ChainSyncLog::getTxHash, trimmed)
                                .or().likeRight(ChainSyncLog::getTxHash, trimmed))
                        .orderByDesc(ChainSyncLog::getCreateTime)
                        .last("limit 5"));

        // 业务号兜底（订单号/运单号）
        if (logs.isEmpty()) logs = matchByBizNo(trimmed);

        if (logs.isEmpty()) return Result.error("未找到匹配的单证，请检查编号");

        Map<String, Object> item = enrichSingleWithBiz(logs.get(0));
        return Result.success(item);
    }

    // ========== 3. 存证详情 ==========

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        ChainSyncLog log = syncLogMapper.selectById(id);
        if (log == null) return Result.error("存证记录不存在");
        return Result.success(enrichSingleWithBiz(log));
    }

    // 4. 链上核验（防篡改检测）

    /**
     * 对某条存证记录做链上验证 —— 用 ChainService.verify 对比 dataHash
     * txHash: 存证交易哈希
     */
    @GetMapping("/verify")
    public Result<Map<String, Object>> verify(@RequestParam String txHash) {
        ChainSyncLog log = syncLogMapper.selectOne(
                new LambdaQueryWrapper<ChainSyncLog>()
                        .eq(ChainSyncLog::getTxHash, txHash)
                        .eq(ChainSyncLog::getSyncStatus, 1));
        if (log == null) return Result.error("存证记录不存在");

        // 根据 bizType 查当前实体，对比 dataHash
        Object entity = null;
        if (log.getBizType() == 1) entity = orderMapper.selectById(log.getBizId());
        else if (log.getBizType() == 2) entity = warehouseBillMapper.selectById(log.getBizId());
        else if (log.getBizType() == 3) entity = logisticsBillMapper.selectById(log.getBizId());

        Map<String, Object> result;
        if (entity == null) {
            result = new LinkedHashMap<>();
            result.put("verified", false);
            result.put("tampered", false);
            result.put("reason", "对应业务实体已不存在，无法验证");
            result.put("txHash", txHash);
        } else {
            result = chainService.verify(log.getBizType(), log.getBizId(), entity);
            result.put("txHash", txHash);
            result.put("bizType", log.getBizType());
            result.put("bizId", log.getBizId());
        }
        return Result.success(result);
    }

    // ========== 内部工具 ==========

    private List<ChainSyncLog> matchByBizNo(String bizNo) {
        List<ChainSyncLog> result = new ArrayList<>();

        List<TradeOrder> orders = orderMapper.selectList(
                new LambdaQueryWrapper<TradeOrder>().like(TradeOrder::getOrderNo, bizNo).last("limit 1"));
        if (!orders.isEmpty()) {
            result.addAll(syncLogMapper.selectList(
                    new LambdaQueryWrapper<ChainSyncLog>()
                            .eq(ChainSyncLog::getBizType, 1)
                            .eq(ChainSyncLog::getBizId, orders.get(0).getId())
                            .eq(ChainSyncLog::getSyncStatus, 1)
                            .orderByDesc(ChainSyncLog::getCreateTime)
                            .last("limit 5")));
        }
        if (result.isEmpty()) {
            List<LogisticsBill> bills = logisticsBillMapper.selectList(
                    new LambdaQueryWrapper<LogisticsBill>().like(LogisticsBill::getLogisticsNo, bizNo).last("limit 1"));
            if (!bills.isEmpty()) {
                result.addAll(syncLogMapper.selectList(
                        new LambdaQueryWrapper<ChainSyncLog>()
                                .eq(ChainSyncLog::getBizType, 3)
                                .eq(ChainSyncLog::getBizId, bills.get(0).getId())
                                .eq(ChainSyncLog::getSyncStatus, 1)
                                .orderByDesc(ChainSyncLog::getCreateTime)
                                .last("limit 5")));
            }
        }
        return result;
    }

    private List<Map<String, Object>> enrichBizInfo(List<ChainSyncLog> logs, String keyword) {
        if (logs.isEmpty()) return new ArrayList<>();
        Map<Integer, List<Long>> typeIds = new HashMap<>();
        for (ChainSyncLog l : logs) typeIds.computeIfAbsent(l.getBizType(), k -> new ArrayList<>()).add(l.getBizId());

        Map<Long, String> bizNoMap = new HashMap<>();
        Map<Long, String> bizNameMap = new HashMap<>();

        if (typeIds.containsKey(1)) {
            for (TradeOrder o : orderMapper.selectBatchIds(typeIds.get(1))) {
                bizNoMap.put(o.getId(), "#" + o.getId());
                bizNameMap.put(o.getId(), o.getGoodsName());
            }
        }
        if (typeIds.containsKey(2)) {
            for (WarehouseBill b : warehouseBillMapper.selectBatchIds(typeIds.get(2))) bizNoMap.put(b.getId(), "#" + b.getId());
        }
        if (typeIds.containsKey(3)) {
            for (LogisticsBill b : logisticsBillMapper.selectBatchIds(typeIds.get(3))) bizNoMap.put(b.getId(), "#" + b.getOrderId());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (ChainSyncLog l : logs) {
            Map<String, Object> item = enrichSingle(l);
            item.put("bizNo", bizNoMap.getOrDefault(l.getBizId(), "#" + l.getBizId()));
            item.put("bizName", bizNameMap.getOrDefault(l.getBizId(), ""));

            if (keyword != null && !keyword.isBlank()) {
                String kw = keyword.toLowerCase();
                boolean hit = (item.get("txHash") != null && item.get("txHash").toString().toLowerCase().contains(kw))
                        || bizNoMap.getOrDefault(l.getBizId(), "").toLowerCase().contains(kw)
                        || bizNameMap.getOrDefault(l.getBizId(), "").toLowerCase().contains(kw);
                if (!hit) continue;
            }
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> enrichSingleWithBiz(ChainSyncLog log) {
        Map<String, Object> item = enrichSingle(log);
        Long bizId = log.getBizId();
        if (log.getBizType() == 1) {
            TradeOrder o = orderMapper.selectById(bizId);
            if (o != null) { item.put("bizNo", "#" + bizId); item.put("bizName", o.getGoodsName()); item.put("orderNo", o.getOrderNo()); item.put("goodsName", o.getGoodsName()); }
        } else if (log.getBizType() == 2) {
            item.put("bizNo", "#" + bizId);
        } else if (log.getBizType() == 3) {
            LogisticsBill b = logisticsBillMapper.selectById(bizId);
            if (b != null) {
                item.put("bizNo", "#" + b.getOrderId());
                TradeOrder o = orderMapper.selectById(b.getOrderId());
                if (o != null) item.put("goodsName", o.getGoodsName());
                item.put("currentLocation", b.getCurrentLocation());
                item.put("logisticsCompany", b.getLogisticsCompany());
            }
        }
        return item;
    }

    private Map<String, Object> enrichSingle(ChainSyncLog log) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", log.getId());
        item.put("certType", getCertTypeName(log.getBizType()));
        item.put("bizType", log.getBizType());
        item.put("bizId", log.getBizId());
        item.put("txHash", log.getTxHash());
        item.put("dataHash", log.getDataHash());
        item.put("blockHeight", log.getBlockHeight());
        item.put("syncStatus", log.getSyncStatus());
        item.put("createTime", log.getCreateTime());
        return item;
    }

    private String getCertTypeName(Integer bizType) {
        if (bizType == null) return "未知";
        return switch (bizType) {
            case 1 -> "订单"; case 2 -> "仓单"; case 3 -> "运单"; default -> "其他";
        };
    }
}