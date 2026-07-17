package com.keeper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;

@Singleton
public class DataExportService {

    private final DataSource dataSource;
    private final ObjectMapper objectMapper;

    public DataExportService(DataSource dataSource, ObjectMapper objectMapper) {
        this.dataSource = dataSource;
        this.objectMapper = objectMapper;
    }

    public String exportWorkspaceAsJson(UUID workspaceId) {
        Map<String, Object> export = new HashMap<>();
        
        try (Connection conn = dataSource.getConnection()) {
            export.put("accounts", fetchTableData(conn, "accounts", workspaceId));
            export.put("transactions", fetchTableData(conn, "transactions", workspaceId));
            export.put("categories", fetchTableData(conn, "categories", workspaceId));
            
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(export);
        } catch (Exception e) {
            throw new RuntimeException("Failed to export workspace data", e);
        }
    }
    
    public String exportWorkspaceAsCsv(UUID workspaceId) {
        // Simplified CSV export just for transactions
        StringBuilder csv = new StringBuilder();
        csv.append("id,date,amount,currency,payee,notes\n");
        
        String sql = "SELECT id, date, amount, currency, payee, notes FROM transactions WHERE workspace_id = ? ORDER BY date DESC";
        
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
             
            ps.setObject(1, workspaceId);
            
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    csv.append(rs.getString("id")).append(",");
                    csv.append(rs.getDate("date")).append(",");
                    csv.append(rs.getLong("amount")).append(",");
                    csv.append(rs.getString("currency")).append(",");
                    csv.append("\"").append(rs.getString("payee") != null ? rs.getString("payee") : "").append("\",");
                    csv.append("\"").append(rs.getString("notes") != null ? rs.getString("notes") : "").append("\"\n");
                }
            }
            return csv.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export CSV", e);
        }
    }

    private List<Map<String, Object>> fetchTableData(Connection conn, String tableName, UUID workspaceId) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        String sql = "SELECT * FROM " + tableName + " WHERE workspace_id = ?";
        
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, workspaceId);
            try (ResultSet rs = ps.executeQuery()) {
                java.sql.ResultSetMetaData meta = rs.getMetaData();
                int numCols = meta.getColumnCount();
                
                while (rs.next()) {
                    Map<String, Object> row = new HashMap<>();
                    for (int i = 1; i <= numCols; i++) {
                        row.put(meta.getColumnName(i), rs.getObject(i));
                    }
                    rows.add(row);
                }
            }
        }
        return rows;
    }
}
