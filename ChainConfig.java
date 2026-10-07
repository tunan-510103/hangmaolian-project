package com.trade.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "chain")
public class ChainConfig {
    private String nodeUrl = "127.0.0.1:20200";
    private String groupId = "group0";
    private String chainId = "chain0";
    private String certPath = "src/main/conf";
    private String configPath = "./config.toml";
    private String authContract;
    private String orderCoreContract;
    private String orderLogisticsContract;
    private Boolean mockMode = true;
    /** 管理员私钥
    @org.springframework.boot.context.properties.bind.Name("private-key")
    private String privateKey;
    /** ABI 文件目录，AssembleTransactionProcessor 自动扫描 */
    private String abiDir = "src/main/resources/abi/";
    /** BIN 文件目录，部署合约时需要 */
    private String binDir = "src/main/resources/bin/";
}