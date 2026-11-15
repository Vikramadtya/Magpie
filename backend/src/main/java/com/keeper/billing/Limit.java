package com.keeper.billing;

/** Things that are counted; the Free plan allows only so many of each. */
public enum Limit {
  ACCOUNTS("accounts"),
  BUDGETS("budgets in a month"),
  GOALS("goals"),
  HOLDINGS("investments"),
  TRANSACTIONS_PER_MONTH("transactions a month");

  private final String label;

  Limit(String label) {
    this.label = label;
  }

  public String label() {
    return label;
  }
}
