package com.keeper.category;

import com.keeper.dto.*;
import java.util.*;

public interface CategoryService {
  java.util.List<CategoryNodeDTO> getCategoryTree(UUID workspaceId, String type);
}
