package com.keeper.service;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;

@Singleton
public class AnalyticsService {
    
    private final DataSource dataSource;
    
    public AnalyticsService(DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @io.micronaut.serde.annotation.Serdeable
    public record CategorySpending(String categoryName, Long amount, String color) {}

    @io.micronaut.serde.annotation.Serdeable
    public record CashFlow(String month, Long income, Long expense) {}
    
    @io.micronaut.serde.annotation.Serdeable
    public record NetWorth(String month, Long balance) {}

    @io.micronaut.serde.annotation.Serdeable
    public record RecentTransaction(UUID id, String payee, String date, Long amount, String currency, String icon) {}

    @jakarta.transaction.Transactional
    public Map<String, Object> getAnalyticsDashboard(UUID workspaceId, int months) {
        Map<String, Object> dashboard = new HashMap<>();
        
        try (Connection conn = dataSource.getConnection()) {
            List<CashFlow> cashFlows = getCashFlow(conn, workspaceId, months);
            dashboard.put("cashFlow", cashFlows);
            dashboard.put("categorySpending", getCategorySpending(conn, workspaceId));
            dashboard.put("recentTransactions", getRecentTransactions(conn, workspaceId));
            
            Map<String, Object> keyMetrics = getKeyMetrics(conn, workspaceId, cashFlows);
            dashboard.put("keyMetrics", keyMetrics);
            
            long currentBalance = (Long) keyMetrics.get("netWorth");
            dashboard.put("netWorth", getNetWorth(currentBalance, cashFlows));
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch analytics: " + e.getMessage(), e);
        }
        
        return dashboard;
    }
    
    private List<CashFlow> getCashFlow(Connection conn, UUID workspaceId, int months) throws Exception {
        String sql = """
            WITH latest_rates AS (
                SELECT quote_currency, rate FROM exchange_rates 
                WHERE base_currency = 'USD' 
                  AND date = (SELECT MAX(date) FROM exchange_rates WHERE base_currency = 'USD')
            ),
            ledger AS (
                SELECT 
                    DATE_TRUNC('month', t.date) as month,
                    a.type AS acc_type,
                    je.currency,
                    CASE 
                        WHEN a.type = 'EXPENSE' THEN je.amount
                        WHEN a.type = 'INCOME' THEN -je.amount
                        ELSE 0
                    END as amount
                FROM transactions t
                JOIN journal_entries je ON je.transaction_id = t.id
                JOIN accounts a ON a.id = je.account_id
                WHERE a.type IN ('INCOME', 'EXPENSE') 
                  AND t.deleted_at IS NULL
                  AND (t.status IS NULL OR t.status NOT IN ('VOID', 'REVERSAL'))
                  AND t.workspace_id = ?
            ),
            grouped_ledger AS (
                SELECT 
                    l.month,
                    TO_CHAR(l.month, 'Mon YYYY') as month_str,
                    SUM(CASE WHEN l.acc_type::varchar = 'INCOME' THEN (l.amount / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1) ELSE 0 END) as income,
                    SUM(CASE WHEN l.acc_type::varchar = 'EXPENSE' THEN (l.amount / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1) ELSE 0 END) as expense
                FROM ledger l
                JOIN workspaces ws ON ws.id = ?
                LEFT JOIN latest_rates er_tx ON er_tx.quote_currency = l.currency
                LEFT JOIN latest_rates er_ws ON er_ws.quote_currency = ws.base_currency
                GROUP BY l.month
            )
            SELECT * FROM grouped_ledger
            ORDER BY month DESC
            LIMIT ?
        """;
        
        List<CashFlow> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, workspaceId, java.sql.Types.OTHER);
            ps.setObject(2, workspaceId, java.sql.Types.OTHER);
            ps.setInt(3, months);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new CashFlow(
                        rs.getString("month_str"),
                        Math.round(rs.getDouble("income")),
                        Math.round(rs.getDouble("expense"))
                    ));
                }
            }
        }
        Collections.reverse(list); // Reverse to get chronological order (ASC)
        return list;
    }

    private List<CategorySpending> getCategorySpending(Connection conn, UUID workspaceId) throws Exception {
        String sql = """
            WITH latest_rates AS (
                SELECT quote_currency, rate FROM exchange_rates 
                WHERE base_currency = 'USD' 
                  AND date = (SELECT MAX(date) FROM exchange_rates WHERE base_currency = 'USD')
            )
            SELECT a.name, a.color, SUM((je.amount / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1)) as amount
            FROM transactions t
            JOIN journal_entries je ON je.transaction_id = t.id
            JOIN accounts a ON a.id = je.account_id
            JOIN workspaces ws ON ws.id = t.workspace_id
            LEFT JOIN latest_rates er_tx ON er_tx.quote_currency = je.currency
            LEFT JOIN latest_rates er_ws ON er_ws.quote_currency = ws.base_currency
            WHERE t.workspace_id = ? 
              AND a.type = 'EXPENSE' 
              AND t.deleted_at IS NULL
              AND (t.status IS NULL OR t.status NOT IN ('VOID', 'REVERSAL'))
            GROUP BY a.name, a.color
            ORDER BY amount DESC
            LIMIT 10
        """;
        
        List<CategorySpending> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, workspaceId, java.sql.Types.OTHER);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new CategorySpending(
                        rs.getString("name"),
                        Math.round(rs.getDouble("amount")),
                        rs.getString("color")
                    ));
                }
            }
        }
        return list;
    }
    
    private List<RecentTransaction> getRecentTransactions(Connection conn, UUID workspaceId) throws Exception {
        String sql = """
            SELECT 
                t.id, 
                COALESCE(p.name, t.name) as payee_name, 
                TO_CHAR(t.date, 'Mon DD') as date_str, 
                CASE 
                    WHEN a.type = 'INCOME' THEN -je.amount
                    WHEN a.type = 'EXPENSE' THEN -je.amount
                    ELSE 0
                END as signed_amount,
                je.currency,
                a.type as acc_type
            FROM transactions t
            LEFT JOIN payees p ON p.id = t.payee_id
            JOIN journal_entries je ON je.transaction_id = t.id
            JOIN accounts a ON a.id = je.account_id
            WHERE t.workspace_id = ? 
              AND t.deleted_at IS NULL
              AND a.type IN ('INCOME', 'EXPENSE')
              AND (t.status IS NULL OR t.status NOT IN ('VOID', 'REVERSAL'))
            ORDER BY t.date DESC, t.created_at DESC
            LIMIT 10
        """;
        
        List<RecentTransaction> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, workspaceId, java.sql.Types.OTHER);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new RecentTransaction(
                        rs.getObject("id", UUID.class),
                        rs.getString("payee_name"),
                        rs.getString("date_str"),
                        Math.round(rs.getDouble("signed_amount")),
                        rs.getString("currency"),
                        null
                    ));
                }
            }
        }
        return list;
    }
    
    private List<NetWorth> getNetWorth(long currentBalance, List<CashFlow> cashFlows) {
        List<NetWorth> list = new ArrayList<>();
        long runningBalance = currentBalance;
        
        // Walk backwards from current balance
        List<CashFlow> reversedCashFlows = new ArrayList<>(cashFlows);
        Collections.reverse(reversedCashFlows);
        
        for (CashFlow cf : reversedCashFlows) {
            list.add(new NetWorth(cf.month(), runningBalance));
            // To get PREVIOUS month's net worth, subtract THIS month's net cash flow
            long netCashFlow = cf.income() - cf.expense();
            runningBalance -= netCashFlow;
        }
        
        Collections.reverse(list); // Put back in chronological order
        return list;
    }
    
    private Map<String, Object> getKeyMetrics(Connection conn, UUID workspaceId, List<CashFlow> cashFlows) throws Exception {
        Map<String, Object> metrics = new HashMap<>();
        
        // 1. Account Balances & Native Net Worth
        String sqlAccounts = """
            WITH latest_rates AS (
                SELECT quote_currency, rate FROM exchange_rates 
                WHERE base_currency = 'USD' 
                  AND date = (SELECT MAX(date) FROM exchange_rates WHERE base_currency = 'USD')
            )
            SELECT 
                a.currency,
                ws.base_currency,
            SUM(CASE WHEN a.type::varchar = 'CASH' THEN a.current_balance ELSE 0 END) as native_cash,
            SUM(CASE WHEN a.type::varchar = 'SAVINGS' THEN a.current_balance ELSE 0 END) as native_savings,
            SUM(CASE WHEN a.type::varchar = 'CHECKING' THEN a.current_balance ELSE 0 END) as native_checking,
            SUM(CASE WHEN a.type::varchar IN ('CREDIT_CARD', 'LOAN') THEN a.current_balance ELSE 0 END) as native_credit,
            SUM(CASE WHEN a.type::varchar IN ('CASH', 'SAVINGS', 'CHECKING') THEN a.current_balance ELSE 0 END) as native_liquidity,
            SUM(CASE WHEN a.type::varchar = 'CASH' THEN (a.current_balance / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1) ELSE 0 END) as cash_balance,
            SUM(CASE WHEN a.type::varchar = 'SAVINGS' THEN (a.current_balance / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1) ELSE 0 END) as savings_balance,
            SUM(CASE WHEN a.type::varchar = 'CHECKING' THEN (a.current_balance / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1) ELSE 0 END) as checking_balance,
            SUM(CASE WHEN a.type::varchar IN ('CREDIT_CARD', 'LOAN') THEN (a.current_balance / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1) ELSE 0 END) as credit_balance,
            SUM(CASE WHEN a.type::varchar IN ('CASH', 'SAVINGS', 'CHECKING') THEN (a.current_balance / COALESCE(er_tx.rate, 1)) * COALESCE(er_ws.rate, 1) ELSE 0 END) as liquidity_balance
        FROM account_balances a
        JOIN workspaces ws ON ws.id = a.workspace_id
        LEFT JOIN latest_rates er_tx ON er_tx.quote_currency = a.currency
        LEFT JOIN latest_rates er_ws ON er_ws.quote_currency = ws.base_currency
        WHERE a.workspace_id = ? AND a.deleted_at IS NULL
        GROUP BY a.currency, ws.base_currency
        """;
        
        long totalCash = 0;
        long totalSavings = 0;
        long totalChecking = 0;
        long totalCredit = 0;
        long totalLiquidity = 0;
        String baseCurrency = "USD";
        Map<String, Long> nativeCash = new HashMap<>();
        Map<String, Long> nativeSavings = new HashMap<>();
        Map<String, Long> nativeChecking = new HashMap<>();
        Map<String, Long> nativeCredit = new HashMap<>();
        Map<String, Long> nativeNetWorth = new HashMap<>();
        Map<String, Long> nativeLiquidity = new HashMap<>();

        try (PreparedStatement ps = conn.prepareStatement(sqlAccounts)) {
            ps.setObject(1, workspaceId, java.sql.Types.OTHER);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String curr = rs.getString("currency");
                    baseCurrency = rs.getString("base_currency");
                    long c = Math.round(rs.getDouble("native_cash"));
                    long s = Math.round(rs.getDouble("native_savings"));
                    long chk = Math.round(rs.getDouble("native_checking"));
                    long d = Math.round(rs.getDouble("native_credit"));
                    long l = Math.round(rs.getDouble("native_liquidity"));
                    nativeCash.put(curr, c);
                    nativeSavings.put(curr, s);
                    nativeChecking.put(curr, chk);
                    nativeCredit.put(curr, d);
                    nativeNetWorth.put(curr, c + s + chk + d);
                    nativeLiquidity.put(curr, l);
                    
                    totalCash += Math.round(rs.getDouble("cash_balance"));
                    totalSavings += Math.round(rs.getDouble("savings_balance"));
                    totalChecking += Math.round(rs.getDouble("checking_balance"));
                    totalCredit += Math.round(rs.getDouble("credit_balance"));
                    totalLiquidity += Math.round(rs.getDouble("liquidity_balance"));
                }
            }
        }
        
        // 2. Current Month Cash Flow
        String sqlCashFlow = """
            SELECT 
                je.currency,
                SUM(CASE WHEN a.type = 'INCOME' THEN -je.amount ELSE 0 END) as native_income,
                SUM(CASE WHEN a.type = 'EXPENSE' THEN je.amount ELSE 0 END) as native_expense
            FROM transactions t
            JOIN journal_entries je ON je.transaction_id = t.id
            JOIN accounts a ON a.id = je.account_id
            WHERE t.workspace_id = ? 
              AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
              AND a.type IN ('INCOME', 'EXPENSE')
              AND t.deleted_at IS NULL
              AND (t.status IS NULL OR t.status NOT IN ('VOID', 'REVERSAL'))
            GROUP BY je.currency
        """;
        
        Map<String, Long> nativeIncome = new HashMap<>();
        Map<String, Long> nativeExpense = new HashMap<>();
        
        try (PreparedStatement ps = conn.prepareStatement(sqlCashFlow)) {
            ps.setObject(1, workspaceId, java.sql.Types.OTHER);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String curr = rs.getString("currency");
                    nativeIncome.put(curr, Math.round(rs.getDouble("native_income")));
                    nativeExpense.put(curr, Math.round(rs.getDouble("native_expense")));
                }
            }
        }

        long totalMonthlyIncome = nativeIncome.values().stream().mapToLong(Long::longValue).sum();
        long totalMonthlyExpense = nativeExpense.values().stream().mapToLong(Long::longValue).sum();

        long netWorth = totalCash + totalCredit;
        double savingsRate = 0.0;
        if (totalMonthlyIncome > 0) {
            savingsRate = Math.round(((double) (totalMonthlyIncome - totalMonthlyExpense) / totalMonthlyIncome) * 1000.0) / 10.0;
        }

        // Calculate avg daily spend based on past 30 days or current month cash flows
        long totalExpensesLastMonths = cashFlows.stream().mapToLong(CashFlow::expense).sum();
        long days = cashFlows.size() * 30L;
        long avgDailySpend = days > 0 ? (totalExpensesLastMonths / days) : 0;

        metrics.put("savingsRate", savingsRate);
        metrics.put("avgDailySpend", avgDailySpend); 
        metrics.put("netWorth", netWorth);
        metrics.put("cashBalance", totalCash);
        metrics.put("savingsBalance", totalSavings);
        metrics.put("checkingBalance", totalChecking);
        metrics.put("creditBalance", totalCredit);
        metrics.put("totalLiquidity", totalLiquidity);
        metrics.put("nativeCashBalances", nativeCash);
        metrics.put("nativeSavingsBalances", nativeSavings);
        metrics.put("nativeCheckingBalances", nativeChecking);
        metrics.put("nativeCreditBalances", nativeCredit);
        metrics.put("nativeNetWorth", nativeNetWorth);
        metrics.put("nativeLiquidity", nativeLiquidity);
        metrics.put("nativeMonthlyIncome", nativeIncome);
        metrics.put("nativeMonthlyExpense", nativeExpense);
        metrics.put("baseCurrency", baseCurrency);
        return metrics;
    }
}
