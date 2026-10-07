package com.trade.chain.admin.vo;


import lombok.Data;

@Data
public class ShipDTO {
    private Long orderId;
    private String logisticsCompany;
    private String logisticsAddr;
}
