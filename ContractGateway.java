package com.trade.chain.gateway;

import com.trade.chain.contract.AuthContractService;
import com.trade.chain.contract.OrderCoreContractService;
import com.trade.chain.contract.OrderLogisticsContractService;
import com.trade.config.ChainConfig;
import com.trade.utils.HashUtils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "chain", name = "mock-mode", havingValue = "true", matchIfMissing = true)
public class ContractGateway implements AuthContractService, OrderCoreContractService, OrderLogisticsContractService {

    //内存模拟链上状态
    private static final Map<String, Integer> CHAIN_ROLES = new ConcurrentHashMap<>();     // address → role (1=Trader, 2=Warehouse, 3=Logistics,5=Admin)
    private static final Map<Long, Integer> CHAIN_ORDER_STATUS = new ConcurrentHashMap<>();  // orderId → 0=待入库,3=已入库,1=运输中,2=已签收
    private static final Map<Long, Map<String, Object>> CHAIN_ORDER_DETAIL = new ConcurrentHashMap<>(); // orderId → 订单详情
    private static long orderIdSequence = 0;

    private final ChainConfig chainConfig;

    @PostConstruct
    public void init() {
        log.info("[Chain] ContractGateway Mock 模式已就绪, node={}", chainConfig.getNodeUrl());
        log.info("[Chain] 合约: Auth={} | OrderCore={} | Logistics={}",
                chainConfig.getAuthContract(),
                chainConfig.getOrderCoreContract(),
                chainConfig.getOrderLogisticsContract());
    }

    //通用 Mock 工具
    private String mockWrite(String contract, String method, Object... args) {
        String txHash = HashUtils.genTxHash();
        log.info("[Mock-Chain] {} : {}({}) => {}", contract, method, args, txHash);
        return txHash;
    }

    //AuthContractService

    @Override
    public String register(String address, String companyName) {
        CHAIN_ROLES.putIfAbsent(address, 0); // 先占位，等 setRole 设具体角色
        return mockWrite("Auth", "register", address, companyName);
    }

    @Override
    public String setRole(String address, int roleType) {
        CHAIN_ROLES.put(address, roleType);
        return mockWrite("Auth", "setRole", address, roleType);
    }

    @Override
    public String transferAdmin(String newAddress) {
        CHAIN_ROLES.put(newAddress, 5);
        return mockWrite("Auth", "transferAdmin", newAddress);
    }

    @Override
    public boolean isTrader(String address)   { return CHAIN_ROLES.get(address) != null && CHAIN_ROLES.get(address) == 1; }
    @Override
    public boolean isWarehouse(String address) { return CHAIN_ROLES.get(address) != null && CHAIN_ROLES.get(address) == 2; }
    @Override
    public boolean isLogistics(String address) { return CHAIN_ROLES.get(address) != null && CHAIN_ROLES.get(address) == 3; }
    @Override
    public boolean isAdmin(String address)    { return CHAIN_ROLES.get(address) != null && CHAIN_ROLES.get(address) == 5; }

    //OrderCoreContractService

    @Override
    public Map<String, Object> createOrder(String warehouseAddress, String goodsName,
                              BigDecimal goodsNum, BigDecimal tradePrice) {
        long newOrderId = ++orderIdSequence;
        // 初始化订单状态和详情
        CHAIN_ORDER_STATUS.put(newOrderId, 0); // 0=待入库
        Map<String, Object> detail = new ConcurrentHashMap<>();
        detail.put("warehouseAddress", warehouseAddress);
        detail.put("goodsName", goodsName);
        detail.put("goodsNum", goodsNum);
        detail.put("tradePrice", tradePrice);
        detail.put("status", 0);
        CHAIN_ORDER_DETAIL.put(newOrderId, detail);
        String txHash = mockWrite("OrderCore", "createOrder", warehouseAddress, goodsName, goodsNum, tradePrice);
        Map<String, Object> result = new HashMap<>();
        result.put("txHash", txHash);
        result.put("chainOrderId", newOrderId);
        return result;
    }

    @Override
    public String warehousing(long orderId, String dataHash) {
        // 更新订单状态为已入库（3）
        CHAIN_ORDER_STATUS.put(orderId, 3);
        Map<String, Object> detail = CHAIN_ORDER_DETAIL.get(orderId);
        if (detail != null) detail.put("status", 3);
        return mockWrite("OrderCore", "warehousing", orderId, dataHash);
    }

    @Override
    public Map<String, Object> orders(long orderId) {
        Map<String, Object> detail = CHAIN_ORDER_DETAIL.get(orderId);
        if (detail != null) {
            Map<String, Object> copy = new HashMap<>(detail);
            copy.put("orderId", orderId);
            return copy;
        }
        return Collections.emptyMap();
    }

    @Override
    public long count() {
        return CHAIN_ORDER_STATUS.size();
    }

    @Override
    public int getOrderStatus(long orderId) {
        // 从内存模拟的链上状态读取
        Integer status = CHAIN_ORDER_STATUS.get(orderId);
        return status != null ? status : 0;
    }

    @Override
    public String verifyOrder(long orderId) {
        Integer status = CHAIN_ORDER_STATUS.get(orderId);
        if (status == null || status != 2) {
            throw new RuntimeException("订单必须是已签收状态(status=2)才能核验，当前 status=" + status);
        }
        CHAIN_ORDER_STATUS.put(orderId, 4);
        Map<String, Object> detail = CHAIN_ORDER_DETAIL.get(orderId);
        if (detail != null) detail.put("status", 4);
        return mockWrite("OrderCore", "verifyOrder", orderId);
    }

    //OrderLogisticsContractService

    @Override
    public String ship(long orderId, String logisticsCompany, String logisticsAddr) {
        return mockWrite("OrderLogistics", "ship", orderId, logisticsCompany, logisticsAddr);
    }

    @Override
    public String updateLoc(long orderId, String location) {
        return mockWrite("OrderLogistics", "updateLoc", orderId, location);
    }

    @Override
    public String deliver(long orderId) {

        return mockWrite("OrderLogistics", "deliver", orderId);
    }

    @Override
    public String logistics(long orderId) {
        log.info("[Mock-Chain] OrderLogistics : logistics({})", orderId);
        return "{\"orderId\":" + orderId + ",\"currentLocation\":\"已签收\",\"status\":2}";
    }
}