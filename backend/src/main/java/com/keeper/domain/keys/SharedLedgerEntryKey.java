package com.keeper.domain.keys;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SharedLedgerEntryKey implements Serializable {
    private UUID spaceId; private UUID ledgerId; private UUID personaId;
}
