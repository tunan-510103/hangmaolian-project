package com.trade.chain.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.trade.entity.chain.ChainSyncLog;
import com.trade.mapper.ChainSyncLogMapper;
import com.trade.utils.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChainServiceImpl implements ChainService {

    private final ChainSyncLogMapper syncLogMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ChainSyncLog syncToChain(Integer bizType, Long bizId, String dataHash, String operatorAddress) {
        ChainSyncLog syncLog = new ChainSyncLog();
        syncLog.setBizType(bizType);
        syncLog.setBizId(bizId);
        syncLog.setDataHash(dataHash);
        syncLog.setSyncStatus(0);
        syncLog.setCreateTime(LocalDateTime.now());
        syncLogMapper.insert(syncLog);

        String txHash = HashUtils.genTxHash();
        Long blockHeight = HashUtils.genBlockHeight();

        syncLog.setTxHash(txHash);
        syncLog.setBlockHeight(blockHeight);
        syncLog.setSyncStatus(1);
        syncLog.setUpdateTime(LocalDateTime.now());
        syncLogMapper.updateById(syncLog);

        log.info("[ChainSync] bizType={} bizId={} txHash={}", bizType, bizId, txHash);
        return syncLog;
    }

    @Override
    public Map<String, Object> verify(Integer bizType, Long bizId, Object currentEntity) {
        Map<String, Object> result = new HashMap<>();

        ChainSyncLog chainLog = syncLogMapper.selectOne(
                new LambdaQueryWrapper<ChainSyncLog>()
                        .eq(ChainSyncLog::getBizType, bizType)
                        .eq(ChainSyncLog::getBizId, bizId)
                        .eq(ChainSyncLog::getSyncStatus, 1)
                        .orderByDesc(ChainSyncLog::getCreateTime)
                        .last("limit 1")
        );

        if (chainLog == null) {
            result.put("verified", false);
            result.put("tampered", false);
            result.put("reason", "未上链，无存证记录");
            return result;
        }

        String currentHash = HashUtils.entityHash(currentEntity);
        String originalHash = chainLog.getDataHash();
        boolean tampered = !currentHash.equalsIgnoreCase(originalHash);

        result.put("verified", !tampered);
        result.put("tampered", tampered);
        result.put("originalHash", originalHash);
        result.put("currentHash", currentHash);
        result.put("txHash", chainLog.getTxHash());
        result.put("blockHeight", chainLog.getBlockHeight());
        result.put("createTime", chainLog.getCreateTime());
        result.put("reason", tampered ? "数据已被篡改，与链上存证不一致" : "数据完整，与链上存证一致");
        log.info("[Verify] bizType={} bizId={} tampered={}", bizType, bizId, tampered);
        return result;
    }

    @Override
    public ChainSyncLog getByTxHash(String txHash) {
        return syncLogMapper.selectOne(
                new LambdaQueryWrapper<ChainSyncLog>()
                        .eq(ChainSyncLog::getTxHash, txHash)
        );
    }

    @Override
    public ChainSyncLog getByBiz(Integer bizType, Long bizId) {
        return syncLogMapper.selectOne(
                new LambdaQueryWrapper<ChainSyncLog>()
                        .eq(ChainSyncLog::getBizType, bizType)
                        .eq(ChainSyncLog::getBizId, bizId)
                        .eq(ChainSyncLog::getSyncStatus, 1)
                        .orderByDesc(ChainSyncLog::getCreateTime)
                        .last("limit 1")
        );
    }
}