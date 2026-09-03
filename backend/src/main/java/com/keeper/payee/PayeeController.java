package com.keeper.payee;

import com.keeper.api.PayeeApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class PayeeController implements PayeeApi {

  private final PayeeService payeeService;

  @Override
  public PagePayeeDTO getPayees(UUID workspaceId, String search, Integer page, Integer size) {
    return payeeService.getPayees(workspaceId, search, page, size);
  }
}
