package com.trade.chain.contract;

/**
 * Auth 合约接口（对应 Auth.sol）
 * 职责：地址注册 + 角色分配
 * 权限：register = 仅管理员；setRole = 仅管理员；其他查询 = 公开
 *
 * 角色值 (uint8): 1=贸易商  2=仓库  3=物流  5=管理员
 */
public interface AuthContractService {

    /**
     * 链上注册新地址，绑定公司名
     * @param address     链地址 0x...
     * @param companyName 公司/商户名
     * @return 交易哈希 txHash
     */
    String register(String address, String companyName);

    /**
     * 链上给指定地址设置角色
     * @param address  链地址
     * @param roleType 角色值：1=贸易商 2=仓库 3=物流 5=管理员
     */
    String setRole(String address, int roleType);

    /** 移交管理员角色（仅当前管理员可调用） */
    String transferAdmin(String newAddress);

    /** ============ 链上查询（view/pure，不消耗 gas） ============ */
    boolean isTrader(String address);
    boolean isWarehouse(String address);
    boolean isLogistics(String address);
    boolean isAdmin(String address);
}
