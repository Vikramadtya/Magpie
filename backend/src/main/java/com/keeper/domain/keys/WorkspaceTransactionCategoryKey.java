package com.keeper.domain.keys;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceTransactionCategoryKey implements Serializable {
    private java.util.UUID workspaceId;
    private java.util.UUID transactionId;
    private java.util.UUID categoryId;
}
