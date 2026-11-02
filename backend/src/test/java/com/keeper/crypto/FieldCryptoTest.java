package com.keeper.crypto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FieldCryptoTest {
  private static final String KEY = "dGVzdC1tYXN0ZXIta2V5LTMyLWJ5dGVzLWxvbmctISE=";

  private static class MemoryKeys implements WrappedKeys {
    final Map<UUID, byte[]> stored = new HashMap<>();

    public Optional<byte[]> find(UUID ws) {
      return Optional.ofNullable(stored.get(ws));
    }

    public void saveIfAbsent(UUID ws, byte[] wrapped) {
      stored.putIfAbsent(ws, wrapped);
    }
  }

  @Test
  void roundTripsAndHidesThePlainText() {
    var crypto = new FieldCrypto(KEY, new MemoryKeys());
    UUID ws = UUID.randomUUID();
    String sealed = crypto.seal(ws, "Paid rent to Mr Sharma");
    assertTrue(FieldCrypto.isSealed(sealed));
    assertFalse(sealed.contains("Sharma"));
    assertEquals("Paid rent to Mr Sharma", crypto.open(sealed));
    assertNotEquals(sealed, crypto.seal(ws, "Paid rent to Mr Sharma"));
  }

  @Test
  void aFreshInstanceReadsWhatAnotherWrote() {
    var keys = new MemoryKeys();
    UUID ws = UUID.randomUUID();
    String sealed = new FieldCrypto(KEY, keys).seal(ws, "hello");
    assertEquals("hello", new FieldCrypto(KEY, keys).open(sealed));
  }

  @Test
  void plainTextAndEmptyValuesPassThrough() {
    var crypto = new FieldCrypto(KEY, new MemoryKeys());
    assertEquals("old note", crypto.open("old note"));
    assertEquals(null, crypto.seal(UUID.randomUUID(), null));
    assertEquals("", crypto.seal(UUID.randomUUID(), ""));
  }

  @Test
  void aValueCannotBeMovedToAnotherWorkspace() {
    var crypto = new FieldCrypto(KEY, new MemoryKeys());
    UUID a = UUID.randomUUID();
    UUID b = UUID.randomUUID();
    String sealed = crypto.seal(a, "secret");
    String moved = sealed.replace(a.toString(), b.toString());
    assertNotEquals("secret", crypto.open(moved));
  }

  @Test
  void aWrongMasterKeyCannotRead() {
    var keys = new MemoryKeys();
    UUID ws = UUID.randomUUID();
    String sealed = new FieldCrypto(KEY, keys).seal(ws, "secret");
    String other = java.util.Base64.getEncoder().encodeToString(new byte[32]);
    assertNotEquals("secret", new FieldCrypto(other, keys).open(sealed));
  }

  @Test
  void withoutAMasterKeyNothingIsSealed() {
    var crypto = new FieldCrypto("", new MemoryKeys());
    assertEquals("note", crypto.seal(UUID.randomUUID(), "note"));
  }
}
