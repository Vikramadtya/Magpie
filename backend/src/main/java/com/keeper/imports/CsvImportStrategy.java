package com.keeper.imports;

import java.util.List;
import java.util.Map;

/** One bank-export layout. Add a new implementation to support a new format (Open/Closed). */
public interface CsvImportStrategy {
  String name();

  /** True if this layout can read a file with the given (lower-cased) header names. */
  boolean supports(Map<String, Integer> header);

  /** Converts one data row; returns null for rows to skip (blank, totals, ...). */
  RawRow read(List<String> cells, Map<String, Integer> header);

  /** Strategy-neutral row before date/amount parsing. */
  record RawRow(String date, String amount, String description) {}

  static String cell(List<String> cells, Map<String, Integer> header, String... names) {
    for (String n : names) {
      Integer i = header.get(n);
      if (i != null && i < cells.size()) return cells.get(i);
    }
    return "";
  }
}
