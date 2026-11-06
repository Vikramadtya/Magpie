package com.keeper.digest;

import com.keeper.analytics.BreakdownService;
import com.keeper.budget.BudgetService;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.crypto.FieldCrypto;
import com.keeper.fx.CurrencyUnits;
import com.keeper.recurring.RecurringService;
import com.keeper.refund.RefundService;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Currency;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A short Sunday note posted to the user's own Discord channel: spending, bills, refunds, budgets.
 */
@Singleton
public class DigestService {
  private static final Logger LOG = LoggerFactory.getLogger(DigestService.class);
  private static final List<String> HOSTS =
      List.of("https://discord.com/api/webhooks/", "https://discordapp.com/api/webhooks/");

  @Serdeable
  public record Settings(boolean configured, boolean enabled, Instant lastSentAt) {}

  private final Db db;
  private final FieldCrypto crypto;
  private final BreakdownService breakdown;
  private final RecurringService recurring;
  private final RefundService refunds;
  private final BudgetService budgets;
  private final HttpClient http;

  public DigestService(
      Db db,
      FieldCrypto crypto,
      BreakdownService breakdown,
      RecurringService recurring,
      RefundService refunds,
      BudgetService budgets,
      @Client("https://discord.com") HttpClient http) {
    this.db = db;
    this.crypto = crypto;
    this.breakdown = breakdown;
    this.recurring = recurring;
    this.refunds = refunds;
    this.budgets = budgets;
    this.http = http;
  }

  public Settings settings(UUID ws) {
    return db.one(
            "SELECT webhook_enc IS NOT NULL, enabled, last_sent_at FROM digest_settings WHERE workspace_id = ?",
            rs ->
                new Settings(
                    rs.getBoolean(1),
                    rs.getBoolean(2),
                    rs.getTimestamp(3) == null ? null : rs.getTimestamp(3).toInstant()),
            ws)
        .orElse(new Settings(false, false, null));
  }

  /** A null webhook keeps the saved one; an empty one removes it. */
  public Settings save(UUID ws, String webhookUrl, boolean enabled) {
    String sealed = null;
    boolean replace = webhookUrl != null;
    if (replace && !webhookUrl.isBlank()) {
      String url = webhookUrl.trim();
      if (HOSTS.stream().noneMatch(url::startsWith) || url.length() > 300)
        throw new BadRequestException("That is not a Discord webhook link");
      sealed = crypto.seal(ws, url);
    }
    db.update(
        "INSERT INTO digest_settings(workspace_id, webhook_enc, enabled) VALUES (?,?,?) "
            + "ON CONFLICT (workspace_id) DO UPDATE SET enabled = EXCLUDED.enabled"
            + (replace ? ", webhook_enc = EXCLUDED.webhook_enc" : ""),
        ws,
        sealed,
        enabled && (!replace || sealed != null));
    return settings(ws);
  }

  /** Sends the digest now. Returns false when there is nowhere to send it. */
  public boolean send(UUID ws) {
    String url =
        db.one(
                "SELECT webhook_enc FROM digest_settings WHERE workspace_id = ? AND webhook_enc IS NOT NULL",
                rs -> crypto.open(rs.getString(1)),
                ws)
            .orElse(null);
    if (url == null) return false;
    try {
      http.toBlocking()
          .exchange(
              HttpRequest.POST(
                  url,
                  Map.of("content", compose(ws), "allowed_mentions", Map.of("parse", List.of()))));
    } catch (RuntimeException e) {
      throw new BusinessRuleException(
          "Discord did not accept the message. Check the webhook link.");
    }
    db.update("UPDATE digest_settings SET last_sent_at = NOW() WHERE workspace_id = ?", ws);
    return true;
  }

  /** Workspaces whose Sunday digest is due: it is past Sunday 08:00 UTC and not yet sent for it. */
  public List<UUID> due(Instant now) {
    ZonedDateTime z = now.atZone(ZoneOffset.UTC);
    ZonedDateTime sunday =
        z.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY))
            .withHour(8)
            .withMinute(0)
            .withSecond(0)
            .withNano(0);
    if (sunday.isAfter(z)) sunday = sunday.minusWeeks(1);
    return db.list(
        "SELECT workspace_id FROM digest_settings WHERE enabled AND webhook_enc IS NOT NULL "
            + "AND (last_sent_at IS NULL OR last_sent_at < ?)",
        rs -> rs.getObject(1, UUID.class),
        java.sql.Timestamp.from(sunday.toInstant()));
  }

  String compose(UUID ws) {
    LocalDate today = LocalDate.now();
    LocalDate weekStart = today.minusDays(6);
    var week = breakdown.run(ws, query("category", weekStart, today));
    var before = breakdown.run(ws, query("none", weekStart.minusDays(7), weekStart.minusDays(1)));
    String cur = week.currency();
    long spent = week.rows().stream().mapToLong(BreakdownService.Row::totalMinor).sum();
    long previous = before.rows().stream().mapToLong(BreakdownService.Row::totalMinor).sum();

    List<String> lines = new ArrayList<>();
    lines.add("**Your Keeper week**");
    String change =
        previous == 0
            ? ""
            : (spent >= previous ? " (up " : " (down ")
                + Math.abs(Math.round((spent - previous) * 100.0 / previous))
                + "% on the week before)";
    lines.add("Spent " + money(spent, cur) + " in the last 7 days" + change + ".");
    week.rows().stream()
        .findFirst()
        .ifPresent(
            r -> lines.add("Biggest: " + r.label() + ", " + money(r.totalMinor(), cur) + "."));

    var bills = recurring.upcoming(ws, 7).stream().filter(u -> "EXPENSE".equals(u.type())).toList();
    if (!bills.isEmpty()) {
      lines.add("");
      lines.add("**Bills due this week**");
      bills.stream()
          .limit(6)
          .forEach(
              b ->
                  lines.add(
                      "• "
                          + b.name()
                          + " "
                          + money(b.amountMinor(), b.currency())
                          + " on "
                          + b.date()));
    }
    var refundOverview = refunds.overview(ws);
    if (refundOverview.pendingCount() > 0)
      lines.add(
          "\nRefunds waiting: "
              + refundOverview.pendingCount()
              + " ("
              + money(refundOverview.pendingMinor(), refundOverview.currency())
              + ").");
    var risk =
        budgets.summary(ws, YearMonth.now()).lines().stream()
            .filter(
                l ->
                    l.amountMinor() + l.rolloverMinor() > 0
                        && l.spentMinor() * 100 >= (l.amountMinor() + l.rolloverMinor()) * 85)
            .limit(4)
            .toList();
    if (!risk.isEmpty()) {
      lines.add("");
      lines.add("**Budgets close to the limit**");
      risk.forEach(
          l ->
              lines.add(
                  "• "
                      + l.categoryName()
                      + ": "
                      + Math.round(l.spentMinor() * 100.0 / (l.amountMinor() + l.rolloverMinor()))
                      + "% used"));
    }
    return String.join("\n", lines);
  }

  private static BreakdownService.Query query(String by, LocalDate from, LocalDate to) {
    return new BreakdownService.Query(
        by, "none", from, to, "EXPENSE", null, null, null, null, null, null, 5);
  }

  static String money(long minor, String currency) {
    try {
      NumberFormat f =
          NumberFormat.getCurrencyInstance(
              "INR".equals(currency) ? Locale.forLanguageTag("en-IN") : Locale.US);
      f.setCurrency(Currency.getInstance(currency));
      return f.format(BigDecimal.valueOf(minor).movePointLeft(CurrencyUnits.exponent(currency)));
    } catch (IllegalArgumentException e) {
      LOG.debug("No currency format for {}", currency);
      return currency
          + " "
          + BigDecimal.valueOf(minor).movePointLeft(CurrencyUnits.exponent(currency));
    }
  }
}
