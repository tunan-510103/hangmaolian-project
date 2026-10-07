package com.trade.chain.admin.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.trade.entity.chain.ChainSyncLog;
import com.trade.entity.warehouse.WarehouseBill;
import java.util.Map;

public interface WarehouseBillService {
    IPage<WarehouseBill> page(Integer page, Integer size, String keyword, Integer status);
    WarehouseBill getById(Long id);
    WarehouseBill create(WarehouseBill bill);
    Map<String, Object> verify(Long id);
    boolean syncChain(Long id);
    ChainSyncLog getChainData(Long id);
}