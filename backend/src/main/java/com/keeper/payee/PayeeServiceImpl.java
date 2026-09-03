package com.keeper.payee;

import com.keeper.dto.*;
import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class PayeeServiceImpl implements PayeeService {
  // private final PayeeRepository payeeRepository;

  @Override
  public PagePayeeDTO getPayees(UUID workspaceId, String search, Integer page, Integer size) {
    // TODO: Implement actual business logic
    return null;
  }
}
