package com.trade.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.trade.entity.system.SysUser;
import com.trade.mapper.SysUserMapper;
import com.trade.utils.AesEncryptUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.CryptoType;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import org.fisco.bcos.sdk.v3.client.Client;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 用户链上交易处理器缓存 —— 实现「谁操作谁签名」
 *
 * 每个注册用户都有自己的 FISCO 钱包（privateKey 存 DB 加密），
 * 调合约业务方法时用用户自己的私钥签名，而非 admin 一把梭。
 *
 * 仅当 chain.mock-mode=false 时才加载（真实链模式）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "chain", name = "mock-mode", havingValue = "false")
public class UserTxProcessorCache {

    private final SysUserMapper userMapper;
    private final AesEncryptUtils encryptUtils;
    private final ChainConfig chainConfig;
    private final Client client;

    /** 缓存: userId → 专属 AssembleTransactionProcessor（用该用户私钥签名） */
    private final Map<Long, AssembleTransactionProcessor> cache = new ConcurrentHashMap<>();

    /** 默认 admin processor（用于 register/setRole 等 Only Admin 方法） */
    private AssembleTransactionProcessor adminProcessor;

    /**
     * 获取指定用户的交易处理器（用该用户私钥签名）
     * 如果用户没有存私钥（老数据/初始化用户），fallback 到 admin processor
     */
    public AssembleTransactionProcessor getOrCreate(Long userId) {
        if (userId == null) {
            log.warn("[TxProcessor] userId 为空，返回 admin processor");
            return getAdminProcessor();
        }

        // 先从缓存拿
        AssembleTransactionProcessor cached = cache.get(userId);
        if (cached != null) return cached;

        // 查 DB 拿私钥
        SysUser user = userMapper.selectById(userId);
        if (user == null || user.getPrivateKey() == null || user.getPrivateKey().isBlank()) {
            log.warn("[TxProcessor] userId={} 无私钥记录，fallback admin processor", userId);
            return getAdminProcessor();
        }

        try {
            // AES 解密私钥
            String rawPrivateKey = encryptUtils.decryptAes(user.getPrivateKey());
            if (rawPrivateKey == null || rawPrivateKey.isBlank()) {
                log.warn("[TxProcessor] userId={} 私钥解密为空，fallback admin", userId);
                return getAdminProcessor();
            }

            // 用该用户私钥构造 CryptoKeyPair
            // CryptoKeyPair.createKeyPair(String hexPrivateKey) 是实例方法
            // 先生成一个临时的，再用它恢复我们的私钥
            CryptoSuite suite = new CryptoSuite(CryptoType.ECDSA_TYPE);
            CryptoKeyPair temp = suite.getCryptoKeyPair();  // 临时的，只为调用 createKeyPair 方法
            CryptoKeyPair userKeyPair = temp.createKeyPair(rawPrivateKey);  // 用我们的私钥恢复
            log.info("[TxProcessor] 为 userId={} 构造 processor address={}",
                    userId, userKeyPair.getAddress());

            // 创建专属 processor 并缓存
            String abiDir = resolveDir(chainConfig.getAbiDir());
            String binDir = resolveDir(chainConfig.getBinDir());
            AssembleTransactionProcessor processor = TransactionProcessorFactory
                    .createAssembleTransactionProcessor(client, userKeyPair, abiDir, binDir);

            cache.put(userId, processor);
            return processor;

        } catch (Exception e) {
            log.error("[TxProcessor] userId={} 构造 processor 失败: {}", userId, e.getMessage(), e);
            return getAdminProcessor();
        }
    }

    /** 获取默认 admin processor（register/setRole 等 Only Admin 方法用） */
    public AssembleTransactionProcessor getAdminProcessor() {
        if (adminProcessor == null) {
            synchronized (this) {
                if (adminProcessor == null) {
                    adminProcessor = buildAdminProcessor();
                }
            }
        }
        return adminProcessor;
    }

    private AssembleTransactionProcessor buildAdminProcessor() {
        // admin 的私钥从 config.toml 加载（和原来一样）
        CryptoKeyPair adminPair = client.getCryptoSuite().getCryptoKeyPair();
        String abiDir = resolveDir(chainConfig.getAbiDir());
        String binDir = resolveDir(chainConfig.getBinDir());
        log.info("[TxProcessor] 构造 admin processor address={}", adminPair.getAddress());
        try {
            return TransactionProcessorFactory.createAssembleTransactionProcessor(
                    client, adminPair, abiDir, binDir);
        } catch (IOException e) {
            throw new RuntimeException("构造 admin processor 失败: " + e.getMessage(), e);
        }
    }

    private String resolveDir(String dir) {
        // 复用 FiscoClientConfig 的逻辑：先 classpath 后文件系统
        if (dir == null) return dir;
        try {
            String cp = dir.startsWith("classpath:") ? dir : "classpath:" + dir;
            return ResourceUtils.getFile(cp).getAbsolutePath();
        } catch (Exception ignored) {}
        return new File(dir).getAbsolutePath();
    }
}