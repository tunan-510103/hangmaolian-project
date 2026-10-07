package com.trade.controller;
import com.trade.common.Result;
import com.trade.mapper.WarehouseBillMapper;
import com.trade.mapper.InventoryMapper;
import com.trade.entity.warehouse.WarehouseBill;
import com.trade.entity.warehouse.Inventory;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/warehouse/workbench")
@RequiredArgsConstructor
public class WarehouseWorkbenchController {

    private final WarehouseBillMapper billMapper;
    private final InventoryMapper inventoryMapper;

    /**
     * 工作台统计数据
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        Map<String, Object> stats = new HashMap<>();
        Long totalBills = billMapper.selectCount(null);
        Long pendingBills = billMapper.selectCount(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<WarehouseBill>()
                        .eq(WarehouseBill::getBillStatus, 0)
        );
        Long totalSku = inventoryMapper.selectCount(null);
        Long lowStock = inventoryMapper.selectCount(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Inventory>()
                        .eq(Inventory::getStockStatus, 1)
        );

        stats.put("totalBills", totalBills);
        stats.put("pendingBills", pendingBills);
        stats.put("totalSku", totalSku);
        stats.put("lowStock", lowStock);
        return Result.success(stats);
    }
}
