package com.keeper.domain.keys;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionTagKey implements Serializable {
    private UUID workspaceId; private UUID transactionId; private UUID tagId;
}
