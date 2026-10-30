package com.keeper.common.db;

import java.util.ArrayList;
import java.util.List;

/**
 * Composable WHERE clause: each condition is added with its bound arguments (Specification-style).
 */
public class SqlWhere {
  private final List<String> conditions = new ArrayList<>();
  private final List<Object> args = new ArrayList<>();

  public SqlWhere and(String condition, Object... values) {
    conditions.add(condition);
    args.addAll(List.of(values));
    return this;
  }

  /** Adds the condition only when the value is present. */
  public SqlWhere andIf(Object value, String condition) {
    if (value != null && !(value instanceof String s && s.isBlank())) {
      and(condition, value);
    }
    return this;
  }

  public String sql() {
    return conditions.isEmpty() ? "TRUE" : String.join(" AND ", conditions);
  }

  public List<Object> args() {
    return args;
  }

  public Object[] argsWith(Object... extra) {
    List<Object> all = new ArrayList<>(args);
    all.addAll(List.of(extra));
    return all.toArray();
  }
}
