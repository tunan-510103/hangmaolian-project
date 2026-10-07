package com.trade.config;

import lombok.extern.slf4j.Slf4j;
import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.util.ResourceUtils;

/**
 * FISCO BCOS Java SDK 配置类
 *
 * 仅当 chain.mock-mode=false 时才加载（真实链模式）。
 * mock-mode=true 时由 ContractGateway（Mock）接管链调用。
 */
@Slf4j
@Configuration
@ConditionalOnProperty(prefix = "chain", name = "mock-mode", havingValue = "false")
public class FiscoClientConfig {

    private final ChainConfig chainConfig;

    public FiscoClientConfig(ChainConfig chainConfig) {
        this.chainConfig = chainConfig;
        log.info("[FISCO] 真实链模式已激活 — configPath={} groupId={} abiDir={} binDir={}",
                chainConfig.getConfigPath(), chainConfig.getGroupId(),
                chainConfig.getAbiDir(), chainConfig.getBinDir());
    }

    @Bean
    public BcosSDK bcosSDK() {
        String configPath = chainConfig.getConfigPath();
        log.info("[FISCO] 加载 config.toml: {}", configPath);
        try {
            return BcosSDK.build(configPath);
        } catch (Exception e) {
            log.error("[FISCO] 加载 config.toml 失败", e);
            throw new RuntimeException("FISCO BCOS SDK 初始化失败: " + e.getMessage(), e);
        }
    }

    @Bean
    public Client client(BcosSDK sdk) {
        log.info("[FISCO] 获取 Client: group={}", chainConfig.getGroupId());
        try {
            Client c = sdk.getClient(chainConfig.getGroupId());
            Object blockNumResp = c.getBlockNumber();
            String blockStr = blockNumResp.toString();
            log.info("[FISCO] Client 连接节点成功，getBlockNumber 返回={}", blockStr);
            return c;
        } catch (Exception e) {
            log.error("[FISCO] Client 连接节点失败 —— config.toml peers={}",
                    chainConfig.getNodeUrl());
            log.error("[FISCO] 报错信息: {}", e.getMessage());
            throw new RuntimeException("FISCO BCOS 节点不可达: " + e.getMessage(), e);
        }
    }
}