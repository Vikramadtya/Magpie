package com.keeper.category;

import com.keeper.dto.*;
import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {
  // private final CategoryRepository categoryRepository;

  @Override
  public java.util.List<CategoryNodeDTO> getCategoryTree(UUID workspaceId, String type) {
    // TODO: Implement actual business logic
    return java.util.List.of(
        new CategoryNodeDTO()
            .id(java.util.UUID.randomUUID())
            .name("Mock Category")
            .children(java.util.List.of()));
  }
}
