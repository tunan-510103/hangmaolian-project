package com.trade.chain.admin.vo;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

/**
 * POST /logistics/create 请求体
 */
@Data
public class CreateLogisticsDTO {

    @JsonAlias({"order_id", "orderId"})
    private Long orderId;

    @JsonAlias({"doc_no", "docNo"})
    private String docNo;

    @JsonAlias({"logistics_no", "logisticsNo"})
    private String logisticsNo;

    @JsonAlias({"goods_name", "goodsName"})
    private String goodsName;

    @JsonAlias({"from_location", "fromLocation"})
    private String fromLocation;

    @JsonAlias({"to_location", "toLocation"})
    private String toLocation;

    @JsonAlias({"current_location", "currentLocation"})
    private String currentLocation;

    @JsonAlias({"transport_info", "transportInfo"})
    private String transportInfo;

    @JsonAlias({"logistics_company", "logisticsCompany"})
    private String logisticsCompany;

    @JsonAlias({"logistics_status", "logisticsStatus"})
    private Integer logisticsStatus;

    @JsonAlias({"remark"})
    private String remark;
}