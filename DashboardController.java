package com.trade.controller;

import com.trade.common.Result;
import com.trade.entity.system.SysUser;
import com.trade.entity.tax.TaxApply;
import com.trade.mapper.SysUserMapper;
import com.trade.mapper.TaxApplyMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 平台管理首页
 *
 * GET /dashboard/stats        数据概览
 * GET /dashboard/activities   最近动态
 * GET /dashboard/todos        待办事项
 */
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TaxApplyMapper applyMapper;
    private final SysUserMapper userMapper;

    /** GET /dashboard/stats —— 数据概览 */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        Map<String, Object> r = new LinkedHashMap<>();

        long totalApplies = applyMapper.selectCount(null);
        long pending = applyMapper.selectCount(new LambdaQueryWrapper<TaxApply>().eq(TaxApply::getStatus, 0));
        long passed = applyMapper.selectCount(new LambdaQueryWrapper<TaxApply>().eq(TaxApply::getStatus, 1));
        long rejected = applyMapper.selectCount(new LambdaQueryWrapper<TaxApply>().eq(TaxApply::getStatus, 2));

        long totalTraders = userMapper.selectCount(new LambdaQueryWrapper<SysUser>().eq(SysUser::getRoleType, 1));
        long totalUsers = userMapper.selectCount(null);

        r.put("totalApplies", totalApplies);
        r.put("pendingApplies", pending);
        r.put("passedApplies", passed);
        r.put("rejectedApplies", rejected);
        r.put("totalTraders", totalTraders);
        r.put("totalUsers", totalUsers);

        return Result.success(r);
    }

    /** GET /dashboard/activities —— 最近动态（最近10条申请/审核） */
    @GetMapping("/activities")
    public Result<List<TaxApply>> activities() {
        LambdaQueryWrapper<TaxApply> w = new LambdaQueryWrapper<>();
        w.orderByDesc(TaxApply::getCreateTime).last("LIMIT 10");
        return Result.success(applyMapper.selectList(w));
    }

    /** GET /dashboard/todos —— 待办事项（待审核的申请） */
    @GetMapping("/todos")
    public Result<List<TaxApply>> todos() {
        LambdaQueryWrapper<TaxApply> w = new LambdaQueryWrapper<>();
        w.eq(TaxApply::getStatus, 0).orderByAsc(TaxApply::getCreateTime);
        return Result.success(applyMapper.selectList(w));
    }
}