package com.keeper.subscription;

import com.keeper.api.SubscriptionApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class SubscriptionController implements SubscriptionApi {

  private final SubscriptionService subscriptionService;

  @Override
  public SubscriptionDTO createSubscription(UUID workspaceId, SubscriptionDTO subscriptionDTO) {
    return subscriptionService.createSubscription(workspaceId, subscriptionDTO);
  }

  @Override
  public void deleteSubscription(UUID workspaceId, UUID id) {
    subscriptionService.deleteSubscription(workspaceId, id);
  }

  @Override
  public java.util.List<SubscriptionDTO> getSubscriptions(UUID workspaceId) {
    return subscriptionService.getSubscriptions(workspaceId);
  }

  @Override
  public SubscriptionDTO updateSubscription(
      UUID workspaceId, UUID id, SubscriptionDTO subscriptionDTO) {
    return subscriptionService.updateSubscription(workspaceId, id, subscriptionDTO);
  }
}
