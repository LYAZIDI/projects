package com.platform.workflow.kernel.security.jwt;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.security.jwt")
@Data
public class JwtProperties {
    private String secret;
    private long accessTokenExpiryMs = 3_600_000L;
    private long refreshTokenExpiryMs = 604_800_000L;
}
