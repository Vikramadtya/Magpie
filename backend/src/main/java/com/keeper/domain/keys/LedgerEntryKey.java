package com.keeper.domain.keys;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LedgerEntryKey implements Serializable {
    private UUID workspaceId; private UUID ledgerId; private Integer lineNumber;
}
