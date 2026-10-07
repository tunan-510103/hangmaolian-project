package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.trade.common.PageResult;
import com.trade.common.Result;
import com.trade.entity.warehouse.Inventory;
import com.trade.mapper.InventoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/warehouse/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryMapper inventoryMapper;

    /**库存列表*/
    @GetMapping("/list")
    public Result<PageResult<Inventory>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        LambdaQueryWrapper<Inventory> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(Inventory::getSkuCode, keyword)
                    .or().like(Inventory::getGoodsName, keyword));
        }
        if (status != null) wrapper.eq(Inventory::getStockStatus, status);
        wrapper.orderByDesc(Inventory::getCreateTime);
        IPage<Inventory> result = inventoryMapper.selectPage(new Page<>(page, size), wrapper);
        return Result.success(PageResult.of(result));
    }

    /**新增/入库登记*/
    @PostMapping("/add")
    public Result<Inventory> add(@RequestBody Inventory inventory) {
        inventoryMapper.insert(inventory);
        return Result.success(inventory);
    }
}
