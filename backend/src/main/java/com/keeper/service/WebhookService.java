package com.keeper.service;

import jakarta.inject.Singleton;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
public class WebhookService {
    private static final Logger LOG = LoggerFactory.getLogger(WebhookService.class);
    
    public void fireWebhook(String url, String secretKey, String payload) {
        try {
            String signature = generateHmacSignature(payload, secretKey);
            
            // In a real implementation, we would use HttpClient here to POST the payload
            // with header: X-Keeper-Signature: signature
            LOG.info("Firing webhook to {} with signature {}", url, signature);
            LOG.debug("Payload: {}", payload);
            
        } catch (Exception e) {
            LOG.error("Failed to fire webhook to {}", url, e);
        }
    }
    
    private String generateHmacSignature(String payload, String secret) throws Exception {
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secret_key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256_HMAC.init(secret_key);
        
        byte[] hash = sha256_HMAC.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hash);
    }
}
