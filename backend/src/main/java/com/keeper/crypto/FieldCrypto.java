package com.keeper.crypto;

import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Encrypts free-text fields before they reach the database.
 *
 * <p>Every workspace has its own random data key (AES-256-GCM). The data keys are stored only in
 * wrapped form, encrypted with a master key that lives in the server's environment, never in the
 * database. A stolen database or backup is therefore unreadable. A stored value looks like {@code
 * enc1:<workspace>:<iv+ciphertext>} and is bound to its workspace, so it cannot be moved elsewhere.
 * Values without the prefix (written before encryption was switched on) are returned unchanged.
 */
@Singleton
public class FieldCrypto {
  private static final Logger LOG = LoggerFactory.getLogger(FieldCrypto.class);
  private static final String PREFIX = "enc1:";
  private static final int IV_BYTES = 12;
  private static final int TAG_BITS = 128;
  private static final String LOCKED = "[encrypted: server key missing]";

  private final SecretKey master;
  private final WrappedKeys keys;
  private final SecureRandom random = new SecureRandom();
  private final ConcurrentHashMap<UUID, SecretKey> dataKeys = new ConcurrentHashMap<>();

  public FieldCrypto(@Value("${keeper.crypto.master-key:}") String masterKey, WrappedKeys keys) {
    this.keys = keys;
    if (masterKey == null || masterKey.isBlank()) {
      this.master = null;
      LOG.warn(
          "ENCRYPTION_MASTER_KEY is not set: new data is stored unencrypted. Set a 32-byte base64 key.");
    } else {
      byte[] raw = Base64.getDecoder().decode(masterKey.trim());
      if (raw.length != 32) {
        throw new IllegalStateException("ENCRYPTION_MASTER_KEY must be 32 bytes, base64 encoded");
      }
      this.master = new SecretKeySpec(raw, "AES");
    }
  }

  public boolean enabled() {
    return master != null;
  }

  /** Whether a stored value is already in encrypted form. */
  public static boolean isSealed(String stored) {
    return stored != null && stored.startsWith(PREFIX);
  }

  /** Encrypts for storage. Null and empty values stay as they are. */
  public String seal(UUID workspaceId, String plain) {
    if (master == null || plain == null || plain.isEmpty()) return plain;
    byte[] iv = new byte[IV_BYTES];
    random.nextBytes(iv);
    byte[] ciphertext =
        run(
            Cipher.ENCRYPT_MODE,
            dataKey(workspaceId),
            iv,
            aad(workspaceId),
            plain.getBytes(StandardCharsets.UTF_8));
    byte[] joined = new byte[IV_BYTES + ciphertext.length];
    System.arraycopy(iv, 0, joined, 0, IV_BYTES);
    System.arraycopy(ciphertext, 0, joined, IV_BYTES, ciphertext.length);
    return PREFIX
        + workspaceId
        + ":"
        + Base64.getUrlEncoder().withoutPadding().encodeToString(joined);
  }

  /** Decrypts a stored value; plaintext written before encryption was enabled passes through. */
  public String open(String stored) {
    if (!isSealed(stored)) return stored;
    if (master == null) return LOCKED;
    try {
      String[] parts = stored.substring(PREFIX.length()).split(":", 2);
      UUID ws = UUID.fromString(parts[0]);
      byte[] joined = Base64.getUrlDecoder().decode(parts[1]);
      byte[] iv = java.util.Arrays.copyOfRange(joined, 0, IV_BYTES);
      byte[] body = java.util.Arrays.copyOfRange(joined, IV_BYTES, joined.length);
      return new String(
          run(Cipher.DECRYPT_MODE, dataKey(ws), iv, aad(ws), body), StandardCharsets.UTF_8);
    } catch (RuntimeException e) {
      LOG.warn("Could not decrypt a stored value: {}", e.getMessage());
      return LOCKED;
    }
  }

  private SecretKey dataKey(UUID ws) {
    SecretKey cached = dataKeys.get(ws);
    if (cached == null) {
      cached = loadOrCreate(ws);
      dataKeys.put(ws, cached);
    }
    return cached;
  }

  private SecretKey loadOrCreate(UUID ws) {
    if (keys.find(ws).isEmpty()) {
      byte[] fresh = new byte[32];
      random.nextBytes(fresh);
      keys.saveIfAbsent(ws, wrap(ws, fresh));
    }
    return new SecretKeySpec(unwrap(ws, keys.find(ws).orElseThrow()), "AES");
  }

  private byte[] wrap(UUID ws, byte[] dataKey) {
    byte[] iv = new byte[IV_BYTES];
    random.nextBytes(iv);
    byte[] ct = run(Cipher.ENCRYPT_MODE, master, iv, wrapAad(ws), dataKey);
    byte[] joined = new byte[IV_BYTES + ct.length];
    System.arraycopy(iv, 0, joined, 0, IV_BYTES);
    System.arraycopy(ct, 0, joined, IV_BYTES, ct.length);
    return joined;
  }

  private byte[] unwrap(UUID ws, byte[] wrapped) {
    byte[] iv = java.util.Arrays.copyOfRange(wrapped, 0, IV_BYTES);
    byte[] ct = java.util.Arrays.copyOfRange(wrapped, IV_BYTES, wrapped.length);
    return run(Cipher.DECRYPT_MODE, master, iv, wrapAad(ws), ct);
  }

  private static byte[] aad(UUID ws) {
    return ("keeper-field:" + ws).getBytes(StandardCharsets.UTF_8);
  }

  private static byte[] wrapAad(UUID ws) {
    return ("keeper-dek:" + ws).getBytes(StandardCharsets.UTF_8);
  }

  private static byte[] run(int mode, SecretKey key, byte[] iv, byte[] aad, byte[] input) {
    try {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(mode, key, new GCMParameterSpec(TAG_BITS, iv));
      cipher.updateAAD(aad);
      return cipher.doFinal(input);
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException("Encryption failed", e);
    }
  }
}
