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
public class SpaceIdKey implements Serializable {
    private java.util.UUID spaceId;
    private java.util.UUID id;
}
