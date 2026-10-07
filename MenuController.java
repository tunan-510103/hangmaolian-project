package com.trade.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.trade.common.Result;
import com.trade.entity.system.Permission;
import com.trade.entity.system.RolePermission;
import com.trade.entity.system.SysUser;
import com.trade.mapper.PermissionMapper;
import com.trade.mapper.RolePermissionMapper;
import com.trade.mapper.SysUserMapper;
import com.trade.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/menu")
@RequiredArgsConstructor
public class MenuController {

    private final PermissionMapper permissionMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final SysUserMapper userMapper;
    private final JwtUtils jwtUtils;
    @GetMapping("/tree")
    public Result<List<Permission>> tree(HttpServletRequest request) {
        Integer roleType = extractRoleType(request);
        List<Permission> all = permissionMapper.selectList(null);

        // 非管理员：只保留 role_permission 里已勾选的节点（及其父节点，否则树会断）
        if (roleType != null && roleType != 5) {
            Set<Long> checkedIds = rolePermissionMapper.selectList(
                    new LambdaQueryWrapper<RolePermission>()
                            .eq(RolePermission::getRoleType, roleType)
            ).stream().map(RolePermission::getPermissionId).collect(Collectors.toSet());

            // 向上追溯所有父节点，保证树结构完整
            Set<Long> keep = new HashSet<>(checkedIds);
            Map<Long, Long> idToParent = all.stream()
                    .collect(Collectors.toMap(Permission::getId, p -> p.getParentId() == null ? 0L : p.getParentId()));
            for (Long id : checkedIds) {
                Long pid = idToParent.get(id);
                while (pid != null && pid != 0L) {
                    keep.add(pid);
                    pid = idToParent.get(pid);
                }
            }
            all = all.stream().filter(p -> keep.contains(p.getId())).collect(Collectors.toList());
        }

        return Result.success(buildTree(all, 0L));
    }

    /** 全量菜单树（管理员管理菜单用，带 checked 状态） */
    @GetMapping("/tree/all")
    public Result<List<Permission>> allTree() {
        List<Permission> all = permissionMapper.selectList(null);
        return Result.success(buildTree(all, 0L));
    }

    /** 新增/编辑菜单 */
    @PostMapping("/save")
    public Result<String> save(@RequestBody Permission permission) {
        if (permission.getName() == null || permission.getName().isBlank()) {
            return Result.error("菜单名称不能为空");
        }
        if (permission.getParentId() == null) permission.setParentId(0L);
        if (permission.getSort() == null) permission.setSort(0);
        if (permission.getId() == null) {
            permissionMapper.insert(permission);
        } else {
            permissionMapper.updateById(permission);
        }
        return Result.success("保存成功");
    }

    /** 删除菜单 */
    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Long id) {
        Long childCount = permissionMapper.selectCount(
                new LambdaQueryWrapper<Permission>().eq(Permission::getParentId, id)
        );
        if (childCount > 0) return Result.error("请先删除子菜单");

        rolePermissionMapper.delete(new LambdaQueryWrapper<RolePermission>().eq(RolePermission::getPermissionId, id));
        permissionMapper.deleteById(id);
        return Result.success("删除成功");
    }

    private Integer extractRoleType(HttpServletRequest request) {
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            try {
                Claims claims = jwtUtils.parseToken(token.substring(7));
                Long userId = Long.parseLong(claims.getSubject());
                SysUser user = userMapper.selectById(userId);
                return user != null ? user.getRoleType() : null;
            } catch (Exception ignored) {}
        }
        return null;
    }

    private List<Permission> buildTree(List<Permission> all, Long parentId) {
        return all.stream()
                .filter(p -> Objects.equals(p.getParentId(), parentId))
                .peek(p -> p.setChildren(buildTree(all, p.getId())))
                .sorted(Comparator.comparingInt(p -> p.getSort() == null ? 0 : p.getSort()))
                .collect(Collectors.toList());
    }
}