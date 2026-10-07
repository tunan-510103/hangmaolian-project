package com.trade.chain_trade_abc;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.trade")
@MapperScan("com.trade.mapper")
public class ChainTradeAbcApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChainTradeAbcApplication.class, args);

    }
}