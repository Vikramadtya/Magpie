package com.keeper.subscription;

import com.keeper.dto.*;
import java.util.*;

public interface SubscriptionService {
  SubscriptionDTO createSubscription(UUID workspaceId, SubscriptionDTO subscriptionDTO);

  void deleteSubscription(UUID workspaceId, UUID id);

  java.util.List<SubscriptionDTO> getSubscriptions(UUID workspaceId);

  SubscriptionDTO updateSubscription(UUID workspaceId, UUID id, SubscriptionDTO subscriptionDTO);
}
