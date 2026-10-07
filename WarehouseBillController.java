package com.trade.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.trade.common.PageResult;
import com.trade.common.Result;
import com.trade.entity.chain.ChainSyncLog;
import com.trade.entity.warehouse.WarehouseBill;
import com.trade.chain.admin.service.WarehouseBillService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/warehouse/bill")
@RequiredArgsConstructor
public class WarehouseBillController {

    private final WarehouseBillService billService;

    /**
     * 仓单列表
     */
    @GetMapping("/list")
    public Result<PageResult<WarehouseBill>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "8") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        IPage<WarehouseBill> result = billService.page(page, size, keyword, status);
        return Result.success(PageResult.of(result));
    }

    /**
     * 仓单详情
     */
    @GetMapping("/{id}")
    public Result<WarehouseBill> detail(@PathVariable Long id) {
        return Result.success(billService.getById(id));
    }

    /**
     * 新建仓单
     */
    @PostMapping("/create")
    public Result<WarehouseBill> create(@RequestBody WarehouseBill bill) {
        return Result.success(billService.create(bill));
    }

    /**
     * 存证核验（真正的哈希比对）
     */
    @GetMapping("/verify/{id}")
    public Result<Map<String, Object>> verify(@PathVariable Long id) {
        return Result.success(billService.verify(id));
    }

    /**
     * 手动上链
     */
    @PostMapping("/sync/{id}")
    public Result<Boolean> sync(@PathVariable Long id) {
        return Result.success(billService.syncChain(id));
    }

    /**
     * 获取仓单链上数据
     */
    @GetMapping("/{id}/chain")
    public Result<ChainSyncLog> getChainData(@PathVariable Long id) {
        return Result.success(billService.getChainData(id));
    }
}