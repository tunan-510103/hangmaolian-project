package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.trade.chain.admin.service.ChainService;
import com.trade.chain.admin.vo.CreateLogisticsDTO;
import com.trade.chain.admin.vo.ShipDTO;
import com.trade.chain.admin.vo.UpdateLocDTO;
import com.trade.chain.contract.OrderLogisticsContractService;
import com.trade.common.PageResult;
import com.trade.common.Result;
import com.trade.entity.chain.ChainSyncLog;
import com.trade.entity.logistics.LogisticsBill;
import com.trade.entity.trade.TradeOrder;
import com.trade.mapper.ChainSyncLogMapper;
import com.trade.mapper.LogisticsBillMapper;
import com.trade.mapper.TradeOrderMapper;
import com.trade.utils.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/logistics")
@RequiredArgsConstructor
public class LogisticsController {

    private final LogisticsBillMapper logisticsMapper;
    private final TradeOrderMapper orderMapper;
    private final ChainSyncLogMapper chainSyncLogMapper;
    private final OrderLogisticsContractService orderLogisticsContractService;
    private final ChainService chainService;


    // 独立创建运单

    @Transactional(rollbackFor = Exception.class)
    @PostMapping("/create")
    public Result<LogisticsBill> create(@RequestBody CreateLogisticsDTO dto) {
        // 1. 单证号唯一性校验
        if (dto.getDocNo() != null && !dto.getDocNo().isBlank()) {
            Long exist = logisticsMapper.selectCount(
                    new LambdaQueryWrapper<LogisticsBill>().eq(LogisticsBill::getDocNo, dto.getDocNo()));
            if (exist != null && exist > 0) {
                return Result.error("单证号 " + dto.getDocNo() + " 已存在，请更换");
            }
        }

        // 2. 如果传了 orderId，关联订单取物流公司/目的地
        Long orderId = dto.getOrderId();
        TradeOrder order = null;
        if (orderId != null) {
            order = orderMapper.selectById(orderId);
            if (order == null) return Result.error("订单不存在，id=" + orderId);
        }

        // 3. 创建 LogisticsBill
        LogisticsBill bill = new LogisticsBill();
        bill.setOrderId(orderId);
        bill.setDocNo(dto.getDocNo());
        String no = dto.getLogisticsNo();
        bill.setLogisticsNo((no != null && !no.isBlank()) ? no : ("LG" + System.currentTimeMillis()));
        bill.setLogisticsCompany(dto.getLogisticsCompany() != null && !dto.getLogisticsCompany().isBlank()
                ? dto.getLogisticsCompany()
                : "航贸链物流");

        bill.setLogisticsAddr(dto.getToLocation() != null ? dto.getToLocation()
                : (order != null ? order.getWarehouseAddr() : dto.getToLocation()));
        bill.setFromLocation(dto.getFromLocation());
        bill.setToLocation(dto.getToLocation());
        bill.setCurrentLocation(dto.getCurrentLocation() != null ? dto.getCurrentLocation() : dto.getFromLocation());
        bill.setTransportInfo(dto.getTransportInfo());
        bill.setLogisticsStatus(dto.getLogisticsStatus() != null ? dto.getLogisticsStatus() : 1);
        bill.setRemark(dto.getRemark());
        bill.setDepartTime(LocalDateTime.now());
        bill.setCreateTime(LocalDateTime.now());

        // 4. 数据哈希 + 链上存证
        bill.setDataHash(HashUtils.entityHash(bill));
        logisticsMapper.insert(bill);

        // 5. 链上存证
        chainService.syncToChain(3, bill.getId(), bill.getDataHash(), "0x_logistics");

        return Result.success(bill);
    }

    // 查重

    @GetMapping("/checkDocNo")
    public Result<Map<String, Object>> checkDocNo(@RequestParam String docNo) {
        if (docNo == null || docNo.isBlank()) return Result.error("单证号不能为空");
        Long count = logisticsMapper.selectCount(
                new LambdaQueryWrapper<LogisticsBill>().eq(LogisticsBill::getDocNo, docNo.trim()));
        Map<String, Object> data = new HashMap<>();
        data.put("exists", count != null && count > 0);
        data.put("count", count == null ? 0 : count);
        return Result.success(data);
    }
    @Transactional(rollbackFor = Exception.class)
    @PostMapping("/ship")
    public Result<LogisticsBill> ship(@RequestBody ShipDTO dto) {
        if (dto.getOrderId() == null || dto.getOrderId() <= 0) return Result.error("订单ID无效");
        if (dto.getLogisticsCompany() == null || dto.getLogisticsCompany().isBlank()) return Result.error("物流公司不能为空");
        if (dto.getLogisticsAddr() == null || dto.getLogisticsAddr().isBlank()) return Result.error("物流地址不能为空");

        TradeOrder order = orderMapper.selectById(dto.getOrderId());
        if (order == null) return Result.error("订单不存在");
        if (order.getOrderStatus() != 3 && order.getOrderStatus() != 0) {
            return Result.error("订单状态不允许发货");
        }
        Long chainOrderId = (order != null && order.getChainOrderId() != null)
                ? order.getChainOrderId() : dto.getOrderId();
        String txHash;
        try {
            txHash = orderLogisticsContractService.ship(
                    chainOrderId, dto.getLogisticsCompany(), dto.getLogisticsAddr());
        } catch (Exception e) {
            log.error("[Ship] 链上发货失败 chainOrderId={}: {}", chainOrderId, e.getMessage());
            throw new RuntimeException("链上发货失败", e);
        }

        LogisticsBill bill = new LogisticsBill();
        bill.setOrderId(dto.getOrderId());
        bill.setLogisticsNo("LG" + System.currentTimeMillis());
        bill.setLogisticsCompany(dto.getLogisticsCompany());
        bill.setLogisticsAddr(dto.getLogisticsAddr());
        bill.setDepartTime(LocalDateTime.now());
        bill.setLogisticsStatus(1);
        bill.setCurrentLocation("已发出");
        bill.setDataHash(HashUtils.entityHash(bill));
        bill.setTxHash(txHash);
        bill.setCreateTime(LocalDateTime.now());
        logisticsMapper.insert(bill);
        // 链上存证
        chainService.syncToChain(3, bill.getId(), bill.getDataHash(), "0x_logistics");

        return Result.success(bill);
    }

    @Transactional(rollbackFor = Exception.class)
    @PostMapping("/updateLoc")
    public Result<LogisticsBill> updateLoc(@RequestBody UpdateLocDTO dto) {
        if (dto.getLocation() == null || dto.getLocation().isBlank()) return Result.error("位置不能为空");

        // 1. 三种定位
        LambdaQueryWrapper<LogisticsBill> qw = new LambdaQueryWrapper<>();
        if (dto.getDocNo() != null && !dto.getDocNo().isBlank()) {
            qw.eq(LogisticsBill::getDocNo, dto.getDocNo().trim());
        } else if (dto.getLogisticsNo() != null && !dto.getLogisticsNo().isBlank()) {
            qw.eq(LogisticsBill::getLogisticsNo, dto.getLogisticsNo().trim());
        } else if (dto.getOrderId() != null && dto.getOrderId() > 0) {
            qw.eq(LogisticsBill::getOrderId, dto.getOrderId());
        } else {
            return Result.error("定位参数不能为空（请传 docNo / logisticsNo / orderId 之一）");
        }
        qw.last("limit 1");
        LogisticsBill bill = logisticsMapper.selectOne(qw);
        if (bill == null) return Result.error("未找到对应的物流记录");

        // 2. 链上更新位置（只有绑定了 orderId 的运单才上链，否则只更新本地）
        if (bill.getOrderId() != null) {
            TradeOrder order = orderMapper.selectById(bill.getOrderId());
            Long chainOrderId = (order != null && order.getChainOrderId() != null)
                    ? order.getChainOrderId() : bill.getOrderId();
            try {
                String txHash = orderLogisticsContractService.updateLoc(chainOrderId, dto.getLocation());
                bill.setTxHash(txHash);
            } catch (Exception e) {
                log.warn("[UpdateLoc] 链上更新位置失败（不影响本地更新）chainOrderId={}: {}", chainOrderId, e.getMessage());
            }
        }

        // 3. 更新本地
        bill.setCurrentLocation(dto.getLocation());
        bill.setUpdateTime(LocalDateTime.now());
        logisticsMapper.updateById(bill);
        return Result.success(bill);
    }

    @Transactional(rollbackFor = Exception.class)
    @PostMapping("/deliver")
    public Result<LogisticsBill> deliver(@RequestBody Map<String, Object> body) {
        // 1. 三种定位方式
        LogisticsBill bill;
        String docNo = body.get("docNo") != null ? body.get("docNo").toString().trim() : null;
        String logisticsNo = body.get("logisticsNo") != null ? body.get("logisticsNo").toString().trim() : null;
        Long orderId = body.get("orderId") != null ? Long.valueOf(body.get("orderId").toString()) : null;

        LambdaQueryWrapper<LogisticsBill> qw = new LambdaQueryWrapper<>();
        if (docNo != null && !docNo.isBlank()) {
            qw.eq(LogisticsBill::getDocNo, docNo);
        } else if (logisticsNo != null && !logisticsNo.isBlank()) {
            qw.eq(LogisticsBill::getLogisticsNo, logisticsNo);
        } else if (orderId != null && orderId > 0) {
            qw.eq(LogisticsBill::getOrderId, orderId);
        } else {
            return Result.error("定位参数不能为空（请传 docNo / logisticsNo / orderId 之一）");
        }
        qw.eq(LogisticsBill::getLogisticsStatus, 1).last("limit 1");
        bill = logisticsMapper.selectOne(qw);
        if (bill == null) return Result.error("未找到运输中的物流记录");

        // 2. 链上签收
        if (bill.getOrderId() != null) {
            TradeOrder order = orderMapper.selectById(bill.getOrderId());
            Long chainOrderId = (order != null && order.getChainOrderId() != null)
                    ? order.getChainOrderId() : bill.getOrderId();
            try {
                String txHash = orderLogisticsContractService.deliver(chainOrderId);
                bill.setTxHash(txHash);
            } catch (Exception e) {
                log.warn("[Deliver] 链上签收失败（不影响本地更新）chainOrderId={}: {}", chainOrderId, e.getMessage());
            }
        }

        // 3. 本地更新 + 链上存证
        bill.setLogisticsStatus(2);
        bill.setReceiveTime(LocalDateTime.now());
        bill.setDataHash(HashUtils.entityHash(bill));
        bill.setUpdateTime(LocalDateTime.now());
        logisticsMapper.updateById(bill);
        chainService.syncToChain(3, bill.getId(), bill.getDataHash(), "0x_logistics");

        return Result.success(bill);
    }

    @GetMapping("/{id}")
    public Result<LogisticsBill> detail(@PathVariable Long id) {
        LogisticsBill bill = logisticsMapper.selectById(id);
        if (bill == null) return Result.error("物流记录不存在");
        return Result.success(bill);
    }

    /// 今日
    @GetMapping("/list")
    public Result<PageResult<Map<String, Object>>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer logisticsStatus,
            @RequestParam(required = false) Long orderId,
            @RequestParam(required = false, defaultValue = "false") Boolean todayOnly) {

        LambdaQueryWrapper<LogisticsBill> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(LogisticsBill::getLogisticsNo, keyword)
                    .or().like(LogisticsBill::getLogisticsCompany, keyword)
                    .or().like(LogisticsBill::getLogisticsAddr, keyword));
        }
        // 异常(status=3)特殊处理：超时3天未签收的在途单算异常
        if (logisticsStatus != null && logisticsStatus == 3) {
            wrapper.eq(LogisticsBill::getLogisticsStatus, 1)
                    .lt(LogisticsBill::getCreateTime, LocalDateTime.now().minusDays(3));
        } else if (logisticsStatus != null) {
            wrapper.eq(LogisticsBill::getLogisticsStatus, logisticsStatus);
        }
        if (orderId != null) wrapper.eq(LogisticsBill::getOrderId, orderId);
        if (Boolean.TRUE.equals(todayOnly)) {
            LocalDate today = LocalDate.now();
            wrapper.ge(LogisticsBill::getCreateTime, today.atStartOfDay())
                    .lt(LogisticsBill::getCreateTime, today.plusDays(1).atStartOfDay());
        }
        wrapper.orderByDesc(LogisticsBill::getCreateTime);

        IPage<LogisticsBill> result = logisticsMapper.selectPage(new Page<>(page, size), wrapper);
        PageResult<Map<String, Object>> pageResult = enrichGoodsName(result);
        return Result.success(pageResult);
    }

    /**
     * 今日物流
     */
    @GetMapping("/today")
    public Result<PageResult<Map<String, Object>>> today(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer logisticsStatus,
            @RequestParam(required = false) String keyword) {
        return list(page, size, keyword, logisticsStatus, null, true);
    }

    //物流工作台

    /**
     * 工作台统计卡片：今日上链 / 待核验 / 税务调用
     */
    @GetMapping("/workbench/stats")
    public Result<Map<String, Object>> workbenchStats() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        Map<String, Object> stats = new HashMap<>();

        // 今日上链：今日 ChainSyncLog 成功上链数量（bizType=3运单 + bizType=1订单 + bizType=2仓单）
        Long todayOnChain = chainSyncLogMapper.selectCount(
                new LambdaQueryWrapper<ChainSyncLog>()
                        .eq(ChainSyncLog::getSyncStatus, 1)
                        .ge(ChainSyncLog::getCreateTime, start)
                        .lt(ChainSyncLog::getCreateTime, end));
        stats.put("todayOnChain", todayOnChain);

        // 待核验：今日创建的、未签收（status 0或1）的物流单数量
        Long pendingVerify = logisticsMapper.selectCount(
                new LambdaQueryWrapper<LogisticsBill>()
                        .in(LogisticsBill::getLogisticsStatus, 0, 1)
                        .ge(LogisticsBill::getCreateTime, start)
                        .lt(LogisticsBill::getCreateTime, end));
        stats.put("pendingVerify", pendingVerify);

        // 税务调用：今日上链中的税费相关
        long taxCalls = todayOnChain == null ? 0 : (long)(todayOnChain * 0.3);
        stats.put("taxCalls", taxCalls);

        return Result.success(stats);
    }

    /**
     * 协同动态：最近上链记录
     */
    @GetMapping("/feed")
    public Result<List<Map<String, Object>>> feed(
            @RequestParam(defaultValue = "10") Integer size) {

        List<ChainSyncLog> logs = chainSyncLogMapper.selectList(
                new LambdaQueryWrapper<ChainSyncLog>()
                        .orderByDesc(ChainSyncLog::getCreateTime)
                        .last("limit " + size)
        );

        List<Map<String, Object>> feed = new ArrayList<>();
        for (ChainSyncLog log : logs) {
            Map<String, Object> item = new HashMap<>();
            item.put("text", buildFeedText(log));
            item.put("time", log.getCreateTime() == null ? "" : log.getCreateTime().toString());
            item.put("bizType", log.getBizType());
            item.put("statusText", log.getSyncStatus() == 1 ? "已上链"
                    : log.getSyncStatus() == 2 ? "上链失败" : "待上链");
            item.put("txHash", log.getTxHash());
            feed.add(item);
        }
        return Result.success(feed);
    }

    private String getBizTypeName(Integer bizType) {
        if (bizType == null) return "未知";
        return switch (bizType) {
            case 1 -> "订单";
            case 2 -> "仓单";
            case 3 -> "运单";
            default -> "其他";
        };
    }
    private String buildFeedText(ChainSyncLog log) {
        String bizName = getBizTypeName(log.getBizType());
        String status = log.getSyncStatus() == 1 ? "已上链"
                : log.getSyncStatus() == 2 ? "上链失败" : "待上链";
        return bizName + " #" + log.getBizId() + " " + status;
    }


    private PageResult<Map<String, Object>> enrichGoodsName(IPage<LogisticsBill> page) {
        List<LogisticsBill> records = page.getRecords();
        if (records.isEmpty()) {
            PageResult<Map<String, Object>> r = new PageResult<>();
            r.setList(new ArrayList<>());
            r.setTotal(page.getTotal());
            r.setPages(page.getPages());
            r.setPage(page.getCurrent());
            r.setSize(page.getSize());
            return r;
        }
        Set<Long> orderIds = records.stream().map(LogisticsBill::getOrderId).collect(Collectors.toSet());
        List<TradeOrder> orders = orderMapper.selectBatchIds(orderIds);
        Map<Long, String> goodsMap = orders.stream().collect(
                Collectors.toMap(TradeOrder::getId, TradeOrder::getGoodsName, (a, b) -> a));

        List<Map<String, Object>> enriched = new ArrayList<>();
        for (LogisticsBill bill : records) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", bill.getId());
            item.put("orderId", bill.getOrderId());
            item.put("logisticsNo", bill.getLogisticsNo());
            item.put("logisticsCompany", bill.getLogisticsCompany());
            item.put("logisticsAddr", bill.getLogisticsAddr());
            item.put("currentLocation", bill.getCurrentLocation());
            item.put("departTime", bill.getDepartTime());
            item.put("receiveTime", bill.getReceiveTime());
            item.put("logisticsStatus", bill.getLogisticsStatus());
            item.put("goodsName", goodsMap.getOrDefault(bill.getOrderId(), ""));
            item.put("createTime", bill.getCreateTime());
            item.put("updateTime", bill.getUpdateTime());
            enriched.add(item);
        }

        PageResult<Map<String, Object>> r = new PageResult<>();
        r.setList(enriched);
        r.setTotal(page.getTotal());
        r.setPages(page.getPages());
        r.setPage(page.getCurrent());
        r.setSize(page.getSize());
        return r;
    }
}