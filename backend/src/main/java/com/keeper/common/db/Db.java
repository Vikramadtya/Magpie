package com.keeper.common.db;

import com.keeper.common.exception.ConflictException;
import io.micronaut.data.connection.ConnectionOperations;
import io.micronaut.transaction.TransactionOperations;
import jakarta.inject.Singleton;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Thin JDBC helper. Repositories write plain SQL; this class owns connection handling, parameter
 * binding and error translation. Calls made inside {@link #tx} share one connection.
 */
@Singleton
public class Db {

  private final ConnectionOperations<Connection> connections;
  private final TransactionOperations<Connection> transactions;

  public Db(ConnectionOperations<Connection> connections, TransactionOperations<Connection> tx) {
    this.connections = connections;
    this.transactions = tx;
  }

  /** Runs the block in one database transaction (joins an existing one). */
  public <T> T tx(Supplier<T> work) {
    return transactions.executeWrite(status -> work.get());
  }

  public void tx(Runnable work) {
    transactions.executeWrite(
        status -> {
          work.run();
          return null;
        });
  }

  public <T> List<T> list(String sql, RowMapper<T> mapper, Object... args) {
    return connections.executeRead(
        status -> {
          try (PreparedStatement ps = prepare(status.getConnection(), sql, args);
              var rs = ps.executeQuery()) {
            List<T> rows = new ArrayList<>();
            while (rs.next()) {
              rows.add(mapper.map(rs));
            }
            return rows;
          } catch (SQLException e) {
            throw translate(e);
          }
        });
  }

  /** For INSERT/UPDATE ... RETURNING statements: runs on a writable connection. */
  public <T> Optional<T> returning(String sql, RowMapper<T> mapper, Object... args) {
    return connections.executeWrite(
        status -> {
          try (PreparedStatement ps = prepare(status.getConnection(), sql, args);
              var rs = ps.executeQuery()) {
            return rs.next() ? Optional.of(mapper.map(rs)) : Optional.<T>empty();
          } catch (SQLException e) {
            throw translate(e);
          }
        });
  }

  public <T> Optional<T> one(String sql, RowMapper<T> mapper, Object... args) {
    List<T> rows = list(sql, mapper, args);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public long count(String sql, Object... args) {
    return one(sql, rs -> rs.getLong(1), args).orElse(0L);
  }

  public int update(String sql, Object... args) {
    return connections.executeWrite(
        status -> {
          try (PreparedStatement ps = prepare(status.getConnection(), sql, args)) {
            return ps.executeUpdate();
          } catch (SQLException e) {
            throw translate(e);
          }
        });
  }

  private static PreparedStatement prepare(Connection c, String sql, Object[] args)
      throws SQLException {
    PreparedStatement ps = c.prepareStatement(sql);
    for (int i = 0; i < args.length; i++) {
      ps.setObject(i + 1, bind(c, args[i]));
    }
    return ps;
  }

  private static Object bind(Connection c, Object v) throws SQLException {
    if (v instanceof Instant i) return OffsetDateTime.ofInstant(i, ZoneOffset.UTC);
    if (v instanceof Enum<?> e) return e.name();
    if (v instanceof UUID[] ids) return c.createArrayOf("uuid", ids);
    if (v instanceof String[] s) return c.createArrayOf("text", s);
    if (v instanceof Collection<?> col) {
      boolean uuids = col.stream().allMatch(UUID.class::isInstance);
      return c.createArrayOf(uuids ? "uuid" : "text", col.toArray());
    }
    return v;
  }

  private static RuntimeException translate(SQLException e) {
    String state = e.getSQLState();
    if ("23505".equals(state)) return new ConflictException("Already exists");
    if ("23503".equals(state))
      return new ConflictException("Referenced record is in use or missing");
    if ("23514".equals(state)) return new ConflictException("Value violates a constraint");
    return new IllegalStateException("Database error: " + e.getMessage(), e);
  }
}
