package com.trade.chain.admin.service;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.trade.entity.chain.ChainSyncLog;
import com.trade.entity.warehouse.WarehouseBill;
import com.trade.mapper.WarehouseBillMapper;
import com.trade.utils.HashUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WarehouseBillServiceImpl implements WarehouseBillService {

    private final WarehouseBillMapper billMapper;
    private final ChainService chainService;

    @Override
    public IPage<WarehouseBill> page(Integer page, Integer size, String keyword, Integer status) {
        LambdaQueryWrapper<WarehouseBill> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(WarehouseBill::getWarehouseBillNo, keyword)
                    .or().like(WarehouseBill::getQualityReport, keyword));
        }
        if (status != null) wrapper.eq(WarehouseBill::getBillStatus, status);
        wrapper.orderByDesc(WarehouseBill::getCreateTime);
        return billMapper.selectPage(new Page<>(page, size), wrapper);
    }

    @Override
    public WarehouseBill getById(Long id) {
        return billMapper.selectById(id);
    }

    @Override
    public WarehouseBill create(WarehouseBill bill) {
        // 1. 生成仓单号（如果没传）
        if (bill.getWarehouseBillNo() == null || bill.getWarehouseBillNo().isBlank()) {
            bill.setWarehouseBillNo("WH" + System.currentTimeMillis());
        }
        // 2. 自动生成 dataHash
        bill.setDataHash(HashUtils.entityHash(bill));
        // 3. 默认值设置（数据库 NOT NULL 字段）
        if (bill.getBillStatus() == null) bill.setBillStatus(0);
        if (bill.getWarehouseUserId() == null) bill.setWarehouseUserId(0L);
        if (bill.getCargoOwnerId() == null) bill.setCargoOwnerId(0L);
        if (bill.getTradeOrderId() == null) bill.setTradeOrderId(0L);
        if (bill.getGoodsWeight() == null) bill.setGoodsWeight(java.math.BigDecimal.ZERO);
        billMapper.insert(bill);
        // 4. 自动上链存证
        chainService.syncToChain(2, bill.getId(), HashUtils.entityHash(bill), "0x_warehouse");
        return bill;
    }

    @Override
    public Map<String, Object> verify(Long id) {
        WarehouseBill bill = getById(id);
        if (bill == null) {
            Map<String, Object> r = new HashMap<>();
            r.put("verified", false);
            r.put("reason", "仓单不存在");
            return r;
        }
        return chainService.verify(2, id, bill);
    }

    @Override
    public boolean syncChain(Long id) {
        WarehouseBill bill = getById(id);
        if (bill == null) throw new RuntimeException("仓单不存在，id=" + id);
        chainService.syncToChain(2, id, HashUtils.entityHash(bill), "0x_warehouse");
        return true;
    }

    @Override
    public ChainSyncLog getChainData(Long id) {
        return chainService.getByBiz(2, id);
    }
}