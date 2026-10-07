package com.trade.chain.admin;

import lombok.AllArgsConstructor;
import lombok.Data;

// LoginVO
@Data
@AllArgsConstructor
public class LoginVO {
    private String token;
    private String username;
    private String realName;
}
