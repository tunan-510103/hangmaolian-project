package com.trade.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * MVC 扩展配置
 * 认证已迁移到 Spring Security Filter Chain（SecurityConfig）
 * 如需注册其他非认证拦截器、添加资源处理、消息转换器等，放这里
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
}