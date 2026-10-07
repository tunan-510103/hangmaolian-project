package com.trade.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "encrypt")
public class EncryptProperties {
    /**
     * AES256加密密钥
     */
    private String aesKey = "yangtze_trade_chain_aes256_secret_2024";
}