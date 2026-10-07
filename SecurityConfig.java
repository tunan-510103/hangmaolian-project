package com.trade.config;

import com.trade.config.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;

/**
 * Spring Security 主配置 —— 替换自研 PermissionInterceptor
 *
 * 注意：AuthController 的登录/注册走自定义 AesEncryptUtils，
 *       Spring Security 不接管登录流程，只接管请求认证链。
 *       白名单 = PermissionInterceptor.WHITE_LIST + WebMvcConfig.excludePathPatterns
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    /** 所有放行的路径（无需登录） */
    private static final String[] WHITE_LIST = {
            // 认证相关
            "/auth/login", "/auth/register",
            "/auth/isTrader", "/auth/isWarehouse", "/auth/isLogistics", "/auth/isAdmin",
            "/auth/isTrader/**", "/auth/isWarehouse/**", "/auth/isLogistics/**", "/auth/isAdmin/**",
            "/auth/setRole", "/auth/unsetRole", "/auth/admin", "/auth/transferAdmin",
            // 存证溯源（公开查询）
            "/trace/**",
            // 管理首页（公开统计）
            "/dashboard/**",
            // 角色 和 日志（调试接口）
            "/role/**", "/log/**",
            // 静态资源
            "/error", "/static/**", "/*.html", "/*.css", "/*.js"
    };


    @Bean
    public UserDetailsService userDetailsService() {
        return account -> {
            throw new UsernameNotFoundException(
                    "Spring Security UserDetailsService 未启用，请使用 AuthController 自定义登录");
        };
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(c -> {})
                // 授权规则
                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(WHITE_LIST).permitAll()
                        .anyRequest().authenticated()
                )
                // 自定义 JWT 过滤器（放在 Spring Security 标准登录过滤器之前）
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}