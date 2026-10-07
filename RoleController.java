package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.trade.common.Result;
import com.trade.entity.system.Permission;
import com.trade.entity.system.RolePermission;
import com.trade.mapper.PermissionMapper;
import com.trade.mapper.RolePermissionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/role")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RoleController {

    private final PermissionMapper permissionMapper;
    private final RolePermissionMapper rolePermissionMapper;

    /** 角色列表 */
    @GetMapping("/list")
    public Result<List<Map<String, Object>>> list() {
        List<Map<String, Object>> roles = new ArrayList<>();
        // ✅ 用 Object[] 循环，或直接用 Map 更清晰
        String[][] defs = {
                {"1", "贸易商"},
                {"2", "仓储方"},
                {"3", "物流方"},
                {"5", "平台管理员"}
        };
        for (String[] d : defs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("roleType", Integer.parseInt(d[0]));
            m.put("roleName", d[1]);
            roles.add(m);
        }
        return Result.success(roles);
    }

    /** 权限树 */
    @GetMapping("/permission/tree")
    public Result<List<Permission>> tree(@RequestParam Integer roleType) {
        List<Permission> all = permissionMapper.selectList(null);
        List<Long> checkedIds = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<RolePermission>()
                        .eq(RolePermission::getRoleType, roleType)
        ).stream().map(RolePermission::getPermissionId).collect(Collectors.toList());

        Set<Long> checkedSet = new HashSet<>(checkedIds);
        return Result.success(buildTree(all, 0L, checkedSet));
    }

    /** 保存角色权限分配 */
    @PostMapping("/permission/save")
    public Result<String> save(@RequestBody Map<String, Object> body) {
        Integer roleType;
        try {
            roleType = ((Number) body.get("roleType")).intValue();
        } catch (Exception e) {
            return Result.error("缺少 roleType 参数");
        }

        @SuppressWarnings("unchecked")
        List<Object> rawIds = (List<Object>) body.get("permissionIds");
        List<Long> permIds = rawIds == null ? List.of() : rawIds.stream()
                .map(id -> ((Number) id).longValue())
                .collect(Collectors.toList());

        rolePermissionMapper.delete(new LambdaQueryWrapper<RolePermission>()
                .eq(RolePermission::getRoleType, roleType));

        if (!permIds.isEmpty()) {
            for (Long pid : permIds) {
                RolePermission rp = new RolePermission();
                rp.setRoleType(roleType);
                rp.setPermissionId(pid);
                rolePermissionMapper.insert(rp);
            }
        }
        return Result.success("保存成功");
    }

    /** 获取角色的权限ID列表 */
    @GetMapping("/permission/ids")
    public Result<List<Long>> ids(@RequestParam Integer roleType) {
        List<Long> ids = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<RolePermission>()
                        .eq(RolePermission::getRoleType, roleType)
        ).stream().map(RolePermission::getPermissionId).collect(Collectors.toList());
        return Result.success(ids);
    }


    private List<Permission> buildTree(List<Permission> all, Long parentId, Set<Long> checkedSet) {
        return all.stream()
                .filter(p -> Objects.equals(p.getParentId(), parentId))
                .peek(p -> {
                    p.setChecked(checkedSet.contains(p.getId()));
                    p.setChildren(buildTree(all, p.getId(), checkedSet));
                })
                .sorted(Comparator.comparingInt(p -> p.getSort() == null ? 0 : p.getSort()))
                .collect(Collectors.toList());
    }
}