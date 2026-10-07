package com.trade.config;

import com.trade.entity.log.OperationLog;
import com.trade.mapper.OperationLogMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationLogService {

    private final OperationLogMapper operationLogMapper;

    public void log(String operateType, String content) {
        try {
            OperationLog opLog = new OperationLog();
            opLog.setOperateType(operateType);
            opLog.setOperateContent(content);
            opLog.setIpAddress(getClientIp());
            opLog.setCreateTime(LocalDateTime.now());
            operationLogMapper.insert(opLog);
        } catch (Exception e) {
            log.warn("写操作日志失败: {}", e.getMessage());
        }
    }

    public void log(Long operateUserId, String operateType, String content) {
        try {
            OperationLog opLog = new OperationLog();
            opLog.setOperateUserId(operateUserId);
            opLog.setOperateType(operateType);
            opLog.setOperateContent(content);
            opLog.setIpAddress(getClientIp());
            opLog.setCreateTime(LocalDateTime.now());
            operationLogMapper.insert(opLog);
        } catch (Exception e) {
            log.warn("写操作日志失败: {}", e.getMessage());
        }
    }

    private String getClientIp() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return "unknown";
        HttpServletRequest request = attrs.getRequest();
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}