package com.trade.chain.gateway;

import com.trade.chain.contract.AuthContractService;
import com.trade.chain.contract.OrderCoreContractService;
import com.trade.chain.contract.OrderLogisticsContractService;
import com.trade.config.ChainConfig;
import com.trade.config.UserTxProcessorCache;
import lombok.extern.slf4j.Slf4j;
import org.fisco.bcos.sdk.v3.codec.ContractCodecException;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.model.dto.CallResponse;
import org.fisco.bcos.sdk.v3.transaction.model.dto.TransactionResponse;
import org.fisco.bcos.sdk.v3.transaction.model.exception.TransactionBaseException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Slf4j
@Component
@ConditionalOnProperty(prefix = "chain", name = "mock-mode", havingValue = "false")
public class ContractGatewayReal
        implements AuthContractService, OrderCoreContractService, OrderLogisticsContractService {

    private final UserTxProcessorCache processorCache;
    private final ChainConfig chainConfig;

    private static final String AUTH       = "Auth";
    private static final String ORDER_CORE = "OrderCore";
    private static final String LOGISTICS  = "OrderLogistics";

    public ContractGatewayReal(UserTxProcessorCache processorCache, ChainConfig chainConfig) {
        this.processorCache = processorCache;
        this.chainConfig = chainConfig;
        log.info("[Chain] ContractGatewayReal  已就绪（按用户私钥签名模式）");
    }


    private Long resolveCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                Object principal = auth.getPrincipal();
                if (principal instanceof Long) return (Long) principal;
                if (principal instanceof Number) return ((Number) principal).longValue();
                if (principal instanceof String) {
                    try { return Long.parseLong((String) principal); } catch (Exception ignored) {}
                }
                // 也可能是 SysUser 对象（看 JwtAuthenticationFilter 里怎么放的）
                if (principal instanceof Map) {
                    Object id = ((Map<?, ?>) principal).get("userId");
                    if (id instanceof Long) return (Long) id;
                }
            }
        } catch (Exception e) {
            log.debug("[Chain] resolveCurrentUserId 失败（可能无 SecurityContext）: {}", e.getMessage());
        }
        return null;
    }

    /**
     * 获取当前交易签名所用的 processor
     * - 业务方法（createOrder/warehousing/ship/updateLoc/deliver）：用当前登录用户私钥
     * - register/setRole（Only Admin）：返回 null，调用方用 admin
     */
    private AssembleTransactionProcessor resolveTxProcessor(boolean requireUserSigner) {
        Long userId = resolveCurrentUserId();
        if (userId != null) {
            return processorCache.getOrCreate(userId);
        }
        // 无登录用户 → admin processor（register/setRole 场景）
        return processorCache.getAdminProcessor();
    }

    // ==================================================================
    // 辅助：发送交易 + 检查返回码 + 返回完整 TransactionResponse
    // requireUserSigner = true → 用当前登录用户私钥签名（业务方法）
    // requireUserSigner = false → 用 admin 私钥签名（register/setRole Only Admin 方法）
    // ==================================================================
    private TransactionResponse sendTxRaw(String contractName, String addr, String funcName,
                                           List<Object> params, boolean requireUserSigner) {
        AssembleTransactionProcessor processor = resolveTxProcessor(requireUserSigner);
        if (processor == null) {
            throw new RuntimeException("链处理器未初始化 —— 无法调用 " + contractName + "." + funcName);
        }
        TransactionResponse resp;
        try {
            resp = processor.sendTransactionAndGetResponseByContractLoader(
                    contractName, addr, funcName, params);
        } catch (ContractCodecException | TransactionBaseException e) {
            log.error("[Chain] 调用异常 {}::{} → {}", contractName, funcName, e.getMessage());
            throw new RuntimeException("链上调用异常: " + e.getMessage(), e);
        }
        if (resp == null || resp.getReturnCode() != 0) {
            String msg = getMsg(resp);
            log.error("[Chain] 交易失败 {}::{} → {}", contractName, funcName, msg);
            throw new RuntimeException("链上交易失败: " + msg);
        }
        String txHash = getTxHash(resp);
        log.info("[Chain] ✅ {}.{} txHash={}", contractName, funcName, txHash);
        return resp;
    }

    private String sendTx(String contractName, String addr, String funcName,
                          List<Object> params, boolean requireUserSigner) {
        return getTxHash(sendTxRaw(contractName, addr, funcName, params, requireUserSigner));
    }

    private static Object getTxReturnObject(TransactionResponse resp) {
        if (resp == null) return null;
        try {
            return resp.getClass().getMethod("getReturnObject").invoke(resp);
        } catch (Exception ignored) {}
        return null;
    }

    private static Long parseChainOrderId(Object returnObj) {
        if (returnObj == null) return null;
        if (returnObj instanceof BigInteger bi) return bi.longValue();
        if (returnObj instanceof Number n) return n.longValue();
        if (returnObj instanceof String s) return Long.parseLong(s);
        if (returnObj instanceof List<?> list && !list.isEmpty()) {
            return parseChainOrderId(list.get(0)); // 递归取第一个元素
        }
        return null;
    }
    private CallResponse sendCall(String contractName, String addr, String funcName, List<Object> params) {
        AssembleTransactionProcessor processor = processorCache.getAdminProcessor();
        if (processor == null) {
            throw new RuntimeException("链节点未连接 —— 无法查询 " + contractName + "." + funcName
                    + "（mock-mode=false 但远程 " + chainConfig.getNodeUrl() + " 不可达）");
        }
        CallResponse resp;
        try {
            resp = processor.sendCallByContractLoader(contractName, addr, funcName, params);
        } catch (ContractCodecException | TransactionBaseException e) {
            log.error("[Chain] 查询异常 {}::{} → {}", contractName, funcName, e.getMessage());
            throw new RuntimeException("链上查询异常: " + e.getMessage(), e);
        }
        if (resp == null || resp.getReturnCode() != 0) {
            String msg = getMsg(resp);
            log.error("[Chain] 查询失败 {}::{} → {}", contractName, funcName, msg);
            throw new RuntimeException("链上查询失败: " + msg);
        }
        return resp;
    }
    private static String ensureAddress(String addr) {
        if (addr == null) throw new IllegalArgumentException("地址不能为 null");
        String trimmed = addr.trim();
        if (!trimmed.startsWith("0x") && !trimmed.startsWith("0X")) {
            trimmed = "0x" + trimmed;
        }
        return trimmed.toLowerCase();
    }

    @Override
    public String register(String address, String companyName) {
        String addr = ensureAddress(address);
        log.info("[DIAG] register → address='{}' len={} company='{}'", addr, addr.length(), companyName);
        List<Object> params = new ArrayList<>();
        params.add(addr);
        params.add(companyName);
        return sendTx(AUTH, chainConfig.getAuthContract(), "register", params, false);
    }

    @Override
    public String setRole(String address, int roleType) {
        String addr = ensureAddress(address);
        byte roleByte = (byte) roleType;
        log.info("[DIAG] setRole → address='{}' roleType={}(byte={})", addr, roleType, roleByte);
        List<Object> params = new ArrayList<>();
        params.add(addr);
        // ABI: setRole(address, uint8) —— byte=8位精确匹配uint8
        params.add(roleByte);
        return sendTx(AUTH, chainConfig.getAuthContract(), "setRole", params, false);
    }

    @Override
    public String transferAdmin(String newAddress) {
        String addr = ensureAddress(newAddress);
        List<Object> params = new ArrayList<>();
        params.add(addr);
        return sendTx(AUTH, chainConfig.getAuthContract(), "transferAdmin", params, false);
    }
    private static Object firstOf(CallResponse resp) {
        Object obj = resp.getReturnObject();
        if (obj instanceof List<?> list && !list.isEmpty()) return list.get(0);
        return obj;
    }

    @Override
    public boolean isTrader(String address) {
        CallResponse resp = sendCall(AUTH, chainConfig.getAuthContract(), "isTrader", List.of(address));
        Object v = firstOf(resp);
        return v instanceof Boolean b ? b : Boolean.parseBoolean(v.toString());
    }

    @Override
    public boolean isWarehouse(String address) {
        CallResponse resp = sendCall(AUTH, chainConfig.getAuthContract(), "isWarehouse", List.of(address));
        Object v = firstOf(resp);
        return v instanceof Boolean b ? b : Boolean.parseBoolean(v.toString());
    }

    @Override
    public boolean isLogistics(String address) {
        CallResponse resp = sendCall(AUTH, chainConfig.getAuthContract(), "isLogistics", List.of(address));
        Object v = firstOf(resp);
        return v instanceof Boolean b ? b : Boolean.parseBoolean(v.toString());
    }

    @Override
    public boolean isAdmin(String address) {
        CallResponse resp = sendCall(AUTH, chainConfig.getAuthContract(), "isAdmin", List.of(address));
        Object v = firstOf(resp);
        return v instanceof Boolean b ? b : Boolean.parseBoolean(v.toString());
    }
    @Override
    public Map<String, Object> createOrder(String warehouseAddress, String goodsName,
                              BigDecimal goodsNum, BigDecimal tradePrice) {
        List<Object> params = new ArrayList<>();
        params.add(warehouseAddress);
        params.add(goodsName);
        params.add(BigInteger.valueOf(goodsNum.longValue()));
        params.add(BigInteger.valueOf(tradePrice.longValue()));
        params.add("");
        TransactionResponse resp = sendTxRaw(ORDER_CORE, chainConfig.getOrderCoreContract(),
                "createOrder", params, true);  // 用当前登录用户私钥签名
        String txHash = getTxHash(resp);
        Long chainOrderId = parseChainOrderId(getTxReturnObject(resp));
        Map<String, Object> result = new HashMap<>();
        result.put("txHash", txHash);
        result.put("chainOrderId", chainOrderId);
        if (chainOrderId != null) {
            log.info("[Chain] ✅ createOrder 链上 orderId={} txHash={}", chainOrderId, txHash);
        } else {
            log.warn("[Chain] ⚠️ createOrder 合约未返回 orderId，将通过 count() 补查");
            try {
                result.put("chainOrderId", count());
            } catch (Exception ignored) {}
        }
        return result;
    }

    @Override
    public String warehousing(long orderId, String dataHash) {
        List<Object> params = new ArrayList<>();
        params.add(BigInteger.valueOf(orderId));
        params.add(dataHash);
        return sendTx(ORDER_CORE, chainConfig.getOrderCoreContract(),
                "warehousing", params, true);  // 用当前登录用户（仓储方）私钥签名
    }

    @Override
    public Map<String, Object> orders(long orderId) {
        CallResponse resp = sendCall(ORDER_CORE, chainConfig.getOrderCoreContract(),
                "orders", List.of(BigInteger.valueOf(orderId)));
        Object tuple = resp.getReturnObject();
        Map<String, Object> m = new HashMap<>();
        m.put("orderId",          getTupleVal(tuple, 1));
        m.put("traderAddress",    getTupleVal(tuple, 2));
        m.put("warehouseAddress", getTupleVal(tuple, 3));
        m.put("logisticsAddress", getTupleVal(tuple, 4));
        m.put("status",           getTupleVal(tuple, 5));
        m.put("goodsName",        getTupleVal(tuple, 6));
        m.put("goodsNum",         getTupleVal(tuple, 7));
        m.put("tradePrice",       getTupleVal(tuple, 8));
        m.put("dataHash",         getTupleVal(tuple, 9));
        m.put("createTime",       getTupleVal(tuple, 10));
        return m;
    }

    @Override
    public long count() {
        CallResponse resp = sendCall(ORDER_CORE, chainConfig.getOrderCoreContract(),
                "orderCount", List.of());
        Object val = firstOf(resp);
        if (val instanceof BigInteger bi) return bi.longValue();
        return ((Number) val).longValue();
    }

    @Override
    public int getOrderStatus(long orderId) {
        CallResponse resp = sendCall(ORDER_CORE, chainConfig.getOrderCoreContract(),
                "getOrderStatus", List.of(BigInteger.valueOf(orderId)));
        Object val = firstOf(resp);
        if (val instanceof BigInteger bi) return bi.intValue();
        return ((Number) val).intValue();
    }

    @Override
    public String verifyOrder(long orderId) {
        List<Object> params = new ArrayList<>();
        params.add(BigInteger.valueOf(orderId));
        // verifyOrder = Only Admin → false = 用 admin 签名
        return sendTx(ORDER_CORE, chainConfig.getOrderCoreContract(),
                "verifyOrder", params, false);
    }

    @Override
    public String ship(long orderId, String logisticsCompany, String logisticsAddr) {
        List<Object> params = new ArrayList<>();
        params.add(BigInteger.valueOf(orderId));
        params.add(logisticsCompany);
        params.add(logisticsAddr);
        return sendTx(LOGISTICS, chainConfig.getOrderLogisticsContract(),
                "ship", params, true);  // 用当前登录用户（物流方）私钥签名
    }

    @Override
    public String updateLoc(long orderId, String location) {
        List<Object> params = new ArrayList<>();
        params.add(BigInteger.valueOf(orderId));
        params.add(location);
        return sendTx(LOGISTICS, chainConfig.getOrderLogisticsContract(),
                "updateLoc", params, true);  // 用当前登录用户（物流方）私钥签名
    }

    @Override
    public String deliver(long orderId) {
        return sendTx(LOGISTICS, chainConfig.getOrderLogisticsContract(),
                "deliver", List.of(BigInteger.valueOf(orderId)), true);  // 用当前登录用户私钥签名
    }

    @Override
    public String logistics(long orderId) {
        CallResponse resp = sendCall(LOGISTICS, chainConfig.getOrderLogisticsContract(),
                "logistics", List.of(BigInteger.valueOf(orderId)));
        Object tuple = resp.getReturnObject();
        return String.format(
                "{\"logistics\":\"%s\",\"company\":\"%s\",\"location\":\"%s\",\"shipTime\":%s,\"deliveryTime\":%s}",
                getTupleVal(tuple, 1), getTupleVal(tuple, 2), getTupleVal(tuple, 3),
                getTupleVal(tuple, 4), getTupleVal(tuple, 5));
    }


    @SuppressWarnings("unchecked")
    private static Object getTupleVal(Object tuple, int index) {
        if (tuple instanceof List<?> list && list.size() >= index) {
            return list.get(index - 1); // 前端用 1-based，List 是 0-based
        }
        return null;
    }


    private static String getMsg(Object resp) {
        if (resp == null) return "响应为空";
        try {
            String msg = (String) resp.getClass().getMethod("getReturnMessages").invoke(resp);
            return msg != null ? msg : resp.toString();
        } catch (Exception e) {
            try {
                String msg = (String) resp.getClass().getMethod("getReturnMessage").invoke(resp);
                return msg != null ? msg : resp.toString();
            } catch (Exception e2) {
                return resp.toString();
            }
        }
    }

    private static String getTxHash(TransactionResponse resp) {
        if (resp == null) return null;
        try {
            Object receipt = resp.getClass().getMethod("getTransactionReceipt").invoke(resp);
            if (receipt != null) {
                return (String) receipt.getClass().getMethod("getTransactionHash").invoke(receipt);
            }
        } catch (Exception ignored) {}
        try {
            return (String) resp.getClass().getMethod("getTransactionHash").invoke(resp);
        } catch (Exception ignored) {}
        return null;
    }
}