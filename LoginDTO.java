package com.trade.chain.admin;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginDTO {
    @NotBlank(message = "账号不能为空")
    @JsonAlias({"account", "user_account", "userAccount", "login_account"})
    private String account;

    @JsonAlias({"email", "login_email"})
    private String email;

    @NotBlank(message = "密码不能为空")
    @JsonAlias({"password", "user_password", "userPassword"})
    private String password;

    public String getAccount() {
        return (account != null && !account.isBlank()) ? account : email;
    }
}