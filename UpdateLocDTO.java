package com.trade.chain.admin.vo;


import lombok.Data;

@Data
public class UpdateLocDTO {
    /** 方式1：订单ID */
    private Long orderId;
    /** 方式2：单证号 */
    private String docNo;
    /** 方式3：运单号 */
    private String logisticsNo;
    private String location;
}