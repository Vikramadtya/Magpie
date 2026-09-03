package com.keeper.payee;

import com.keeper.dto.*;
import java.util.*;

public interface PayeeService {
  PagePayeeDTO getPayees(UUID workspaceId, String search, Integer page, Integer size);
}
