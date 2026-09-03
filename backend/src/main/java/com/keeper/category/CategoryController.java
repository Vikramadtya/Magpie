package com.keeper.category;

import com.keeper.api.CategoryApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class CategoryController implements CategoryApi {

  private final CategoryService categoryService;

  @Override
  public java.util.List<CategoryNodeDTO> getCategoryTree(UUID workspaceId, String type) {
    return categoryService.getCategoryTree(workspaceId, type);
  }
}
