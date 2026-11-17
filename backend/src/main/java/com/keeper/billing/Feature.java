package com.keeper.billing;

/** Things that are simply on or off: Pro has them, Free does not. */
public enum Feature {
  IMPORT("Importing a bank file"),
  DIGEST("The weekly digest"),
  HOUSEHOLD("Sharing with a household"),
  QUICK_ADD("Quick add keys and Discord"),
  LIVE_INVESTMENTS("Live prices and history for investments"),
  RECEIPTS("Attaching receipts");

  private final String label;

  Feature(String label) {
    this.label = label;
  }

  public String label() {
    return label;
  }
}
