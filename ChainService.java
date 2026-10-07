package com.trade.chain.admin.service;

import com.trade.entity.chain.ChainSyncLog;
import java.util.Map;

public interface ChainService {
    /**
     * 业务数据上链存证
     * @param dataHash 调用方用 HashUtils.entityHash(entity)
     */
    ChainSyncLog syncToChain(Integer bizType, Long bizId, String dataHash, String operatorAddress);

    /**
     * 存证验真
     * 返回: {verified, tampered, originalHash, currentHash, txHash, blockHeight, reason}
     */
    Map<String, Object> verify(Integer bizType, Long bizId, Object currentEntity);

    ChainSyncLog getByTxHash(String txHash);

    ChainSyncLog getByBiz(Integer bizType, Long bizId);
}