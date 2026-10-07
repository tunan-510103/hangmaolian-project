package com.trade.config.security;

import com.trade.entity.system.SysUser;
import com.trade.mapper.SysUserMapper;
import com.trade.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * 自定义 JWT 过滤器 —— 解析 token → 构建 Authentication → 放进 SecurityContext
 *
 * 替换 PermissionInterceptor + Controller 里的 resolveUserId()
 * 注意：只做认证注入，不做白名单/路径匹配（白名单由 SecurityConfig 处理）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final SysUserMapper userMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            Long userId = null;
            Integer roleType = null;

            String token = extractBearerToken(request);
            if (token != null) {
                Claims claims = jwtUtils.parseToken(token);
                userId = Long.parseLong(claims.getSubject());
                roleType = claims.get("roleType", Integer.class);

            if (userId == null) {
                String xuid = request.getHeader("X-User-Id");
                if (xuid != null && !xuid.isBlank()) {
                    userId = Long.parseLong(xuid);
                }
            }

            // 有 userId 就查库验证
            if (userId != null) {
                SysUser user = userMapper.selectById(userId);
                if (user != null && user.getIsEnable() != null && user.getIsEnable() == 1) {
                    // 如果 JWT 里没带 roleType，查库补一下（兼容旧 token）
                    if (roleType == null) {
                        roleType = user.getRoleType();
                    }
                    buildAndSetAuthentication(userId, roleType);
                } else if (user == null) {
                    log.debug("[JWT] userId={} 对应的用户不存在，跳过认证", userId);
                } else {
                    log.debug("[JWT] userId={} 已禁用，跳过认证", userId);
                }
            }
            }
        } catch (Exception e) {
            log.debug("[JWT] 解析失败（白名单路径可能无 token）: {}", e.getMessage());
            // 不拦截请求，让 Spring Security 判断该不该放行
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) {
            return auth.substring(7);
        }
        return null;
    }

    private void buildAndSetAuthentication(Long userId, Integer roleType) {
        String role = "ROLE_" + (roleType != null ? roleType : "UNKNOWN");
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        userId,           // principal = userId（Controller 里直接 @AuthenticationPrincipal Long userId）
                        null,             // credentials = null（JWT 不需要密码）
                        List.of(new SimpleGrantedAuthority(role))  // authorities = 角色
                );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}