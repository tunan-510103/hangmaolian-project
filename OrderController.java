package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.trade.chain.admin.service.ChainService;
import com.trade.chain.admin.vo.CreateOrderDTO;
import com.trade.chain.admin.vo.WarehousingDTO;
import com.trade.chain.contract.OrderCoreContractService;
import com.trade.common.PageResult;
import com.trade.common.Result;
import com.trade.entity.system.SysUser;
import com.trade.entity.trade.TradeOrder;
import com.trade.mapper.SysUserMapper;
import com.trade.mapper.TradeOrderMapper;
import com.trade.utils.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {

    private final TradeOrderMapper orderMapper;
    private final SysUserMapper userMapper;
    private final OrderCoreContractService orderCoreContractService;
    private final ChainService chainService;

    @Transactional(rollbackFor = Exception.class)
    @PostMapping("/create")
    public Result<TradeOrder> create(@RequestBody CreateOrderDTO dto) {
        if (dto.getGoodsName() == null || dto.getGoodsName().isBlank()) {
            return Result.error("货物名称不能为空");
        }
        if (dto.getGoodsNum() == null || dto.getGoodsNum().doubleValue() <= 0) {
            return Result.error("货物数量必须大于0");
        }
        if (dto.getTradePrice() == null || new java.math.BigDecimal(dto.getTradePrice()).compareTo(java.math.BigDecimal.ZERO) <= 0) {
            return Result.error("交易价格必须大于0");
        }

        SysUser warehouse = userMapper.selectById(dto.getWarehouseUserId());
        if (warehouse == null) {
            return Result.error("仓库用户不存在（id=" + dto.getWarehouseUserId() + "），请先注册账号");
        }

        // 链上调用：先调链，失败则抛异常触发事务回滚
        String txHash;
        Long chainOrderId;
        try {
            Map<String, Object> chainResult = orderCoreContractService.createOrder(
                    warehouse.getChainAddress(),
                    dto.getGoodsName(),
                    dto.getGoodsNum(),
                    new java.math.BigDecimal(dto.getTradePrice())
            );
            txHash = (String) chainResult.get("txHash");
            chainOrderId = (Long) chainResult.get("chainOrderId");
            log.info("[OrderCreate] 链上订单创建成功 chainOrderId={} txHash={}", chainOrderId, txHash);
        } catch (Exception e) {
            log.error("[OrderCreate] 链上订单创建失败: {}", e.getMessage(), e);
            throw new RuntimeException("链上订单创建失败，请稍后重试", e);
        }

        TradeOrder order = new TradeOrder();
        order.setOrderNo("ORD" + System.currentTimeMillis());
        order.setSellerUserId(dto.getWarehouseUserId());
        order.setChainOrderId(chainOrderId);
        order.setGoodsName(dto.getGoodsName());
        order.setGoodsNum(dto.getGoodsNum());
        order.setTradePrice(dto.getTradePrice());
        order.setOrderStatus(0);
        order.setDataHash(HashUtils.entityHash(order));
        order.setTxHash(txHash);
        order.setCreateTime(LocalDateTime.now());
        orderMapper.insert(order);
        // 链上存证
        chainService.syncToChain(1, order.getId(), order.getDataHash(), "0x_trader");
        return Result.success(order);
    }

    @Transactional(rollbackFor = Exception.class)
    @PostMapping("/warehousing")
    public Result<TradeOrder> warehousing(@RequestBody WarehousingDTO dto) {
        if (dto.getOrderId() == null || dto.getOrderId() <= 0) {
            return Result.error("订单ID无效");
        }
        TradeOrder order = orderMapper.selectById(dto.getOrderId());
        if (order == null) return Result.error("订单不存在");
        if (order.getOrderStatus() != 0) return Result.error("订单状态不允许入库操作");

        String dataHash = dto.getDataHash() != null ? dto.getDataHash() : order.getDataHash();
        Long chainOrderId = order.getChainOrderId();
        if (chainOrderId == null) {
            log.warn("[Warehousing] 订单 chainOrderId 为空，降级用本地 DB id={}（真实链下可能失败）", order.getId());
            chainOrderId = order.getId();
        }
        String txHash;
        try {
            txHash = orderCoreContractService.warehousing(chainOrderId, dataHash);
            log.info("[Warehousing] 链上入库成功 chainOrderId={} txHash={}", chainOrderId, txHash);
        } catch (Exception e) {
            log.error("[Warehousing] 链上入库失败 chainOrderId={}: {}", chainOrderId, e.getMessage(), e);
            throw new RuntimeException("链上入库失败，请稍后重试", e);
        }


        order.setOrderStatus(3);
        order.setDataHash(HashUtils.entityHash(order));
        order.setTxHash(txHash);
        order.setUpdateTime(LocalDateTime.now());
        orderMapper.updateById(order);
        // 链上存证
        chainService.syncToChain(1, order.getId(), order.getDataHash(), "0x_warehouse");
        return Result.success(order);
    }

    @GetMapping("/{id}")
    public Result<TradeOrder> detail(@PathVariable Long id) {
        TradeOrder order = orderMapper.selectById(id);
        if (order == null) return Result.error("订单不存在");
        return Result.success(order);
    }

    @GetMapping("/count")
    public Result<Long> count() {
        long chainCount = orderCoreContractService.count();
        return Result.success(chainCount > 0 ? chainCount : orderMapper.selectCount(null));
    }

    @GetMapping("/status/{id}")
    public Result<Map<String, Object>> status(@PathVariable Long id) {
        TradeOrder order = orderMapper.selectById(id);
        if (order == null) return Result.error("订单不存在");

        int chainStatus = orderCoreContractService.getOrderStatus(id);
        int finalStatus = (chainStatus != 3) ? chainStatus : order.getOrderStatus();
        if (finalStatus != order.getOrderStatus()) {
            order.setOrderStatus(finalStatus);
            orderMapper.updateById(order);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("id", order.getId());
        result.put("orderNo", order.getOrderNo());
        result.put("orderStatus", finalStatus);
        result.put("statusText", getStatusText(finalStatus));
        return Result.success(result);
    }

    /**
     * 订单列表（分页，支持关键字搜索货物名称/订单号 + 状态筛选）
     */
    @GetMapping("/list")
    public Result<PageResult<TradeOrder>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer orderStatus) {

        LambdaQueryWrapper<TradeOrder> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(TradeOrder::getGoodsName, keyword)
                    .or().like(TradeOrder::getOrderNo, keyword));
        }
        if (orderStatus != null) wrapper.eq(TradeOrder::getOrderStatus, orderStatus);
        wrapper.orderByDesc(TradeOrder::getCreateTime);

        IPage<TradeOrder> result = orderMapper.selectPage(new Page<>(page, size), wrapper);
        PageResult<TradeOrder> pageResult = new PageResult<>();
        pageResult.setList(result.getRecords());
        pageResult.setTotal(result.getTotal());
        pageResult.setPages(result.getPages());
        pageResult.setPage(result.getCurrent());
        pageResult.setSize(result.getSize());
        return Result.success(pageResult);
    }
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        TradeOrder order = orderMapper.selectById(id);
        if (order == null) return Result.error("订单不存在");
        orderMapper.deleteById(id);  // MyBatis-Plus @TableLogic → 自动转 isDeleted=1
        log.info("[OrderDelete] 订单已删除 id={} orderNo={}", id, order.getOrderNo());
        return Result.success(true);
    }

    private String getStatusText(Integer status) {
        if (status == null) return "未知";
        return switch (status) {
            case 0 -> "待入库";
            case 3 -> "已入库";
            case 1 -> "运输中";
            case 2 -> "已签收";
            case 4 -> "已核验";
            default -> "未知";
        };
    }
}