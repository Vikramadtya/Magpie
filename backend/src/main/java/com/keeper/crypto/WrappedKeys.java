package com.keeper.crypto;

import java.util.Optional;
import java.util.UUID;

/** Where each workspace's data key is kept, wrapped (encrypted) by the master key. */
public interface WrappedKeys {

  Optional<byte[]> find(UUID workspaceId);

  /** Stores the key unless another request got there first. */
  void saveIfAbsent(UUID workspaceId, byte[] wrapped);
}
