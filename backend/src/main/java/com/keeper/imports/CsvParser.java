package com.keeper.imports;

import java.util.ArrayList;
import java.util.List;

/** Minimal RFC 4180 reader: quoted fields, escaped quotes, CRLF/LF. */
final class CsvParser {
  private CsvParser() {}

  static List<List<String>> parse(String text) {
    List<List<String>> rows = new ArrayList<>();
    List<String> row = new ArrayList<>();
    StringBuilder field = new StringBuilder();
    boolean quoted = false;
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      if (quoted) {
        if (c == '"' && i + 1 < text.length() && text.charAt(i + 1) == '"') {
          field.append('"');
          i++;
        } else if (c == '"') {
          quoted = false;
        } else {
          field.append(c);
        }
      } else if (c == '"') {
        quoted = true;
      } else if (c == ',') {
        row.add(field.toString().trim());
        field.setLength(0);
      } else if (c == '\n' || c == '\r') {
        if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') i++;
        row.add(field.toString().trim());
        field.setLength(0);
        if (!(row.size() == 1 && row.get(0).isEmpty())) rows.add(row);
        row = new ArrayList<>();
      } else {
        field.append(c);
      }
    }
    row.add(field.toString().trim());
    if (!(row.size() == 1 && row.get(0).isEmpty())) rows.add(row);
    return rows;
  }
}
