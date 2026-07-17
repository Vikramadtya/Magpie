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
public class WorkspaceLedgerLineKey implements Serializable {
    private java.util.UUID workspaceId;
    private java.util.UUID ledgerId;
    private Integer lineNumber;
}
