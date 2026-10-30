package com.keeper.category;

import java.util.List;
import java.util.UUID;

/** Starter categories seeded into every new workspace. */
@jakarta.inject.Singleton
public class DefaultCategories {

  private record Group(
      String name, String kind, String icon, String color, List<String> children) {}

  private static final List<Group> GROUPS =
      List.of(
          new Group("Housing", "EXPENSE", "🏠", "#ef4444", List.of("Rent", "Utilities")),
          new Group("Food", "EXPENSE", "🍔", "#f97316", List.of("Groceries", "Dining Out")),
          new Group("Transport", "EXPENSE", "🚗", "#eab308", List.of("Fuel", "Public Transit")),
          new Group("Shopping", "EXPENSE", "🛍️", "#8b5cf6", List.of()),
          new Group("Health", "EXPENSE", "💊", "#14b8a6", List.of()),
          new Group("Entertainment", "EXPENSE", "🎬", "#ec4899", List.of("Subscriptions")),
          new Group("Salary", "INCOME", "💵", "#22c55e", List.of()),
          new Group("Other Income", "INCOME", "💰", "#16a34a", List.of()));

  private final CategoryRepository categories;

  public DefaultCategories(CategoryRepository categories) {
    this.categories = categories;
  }

  public void seed(UUID workspaceId) {
    for (Group g : GROUPS) {
      UUID parent = categories.insert(workspaceId, null, g.name, g.kind, g.icon, g.color);
      g.children.forEach(c -> categories.insert(workspaceId, parent, c, g.kind, g.icon, g.color));
    }
  }
}
