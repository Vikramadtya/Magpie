package com.keeper.receipt;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.crypto.FieldCrypto;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/** Receipts: a photo or PDF per transaction, a few at most, stored sealed in the database. */
@Singleton
public class ReceiptService {
  static final int MAX_BYTES = 1_500_000;
  static final int MAX_PER_TRANSACTION = 5;

  @Serdeable
  public record Receipt(
      UUID id,
      UUID transactionId,
      String filename,
      String contentType,
      int sizeBytes,
      Instant createdAt) {}

  @Serdeable
  public record Count(UUID transactionId, int count) {}

  public record File(String contentType, String filename, byte[] bytes) {}

  private final Db db;
  private final FieldCrypto crypto;

  public ReceiptService(Db db, FieldCrypto crypto) {
    this.db = db;
    this.crypto = crypto;
  }

  /** The type of file, judged by its first bytes rather than by what the sender claims. */
  static String sniff(byte[] b) {
    if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF)
      return "image/jpeg";
    if (b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G')
      return "image/png";
    if (b.length > 12
        && b[0] == 'R'
        && b[1] == 'I'
        && b[2] == 'F'
        && b[3] == 'F'
        && b[8] == 'W'
        && b[9] == 'E'
        && b[10] == 'B'
        && b[11] == 'P') return "image/webp";
    if (b.length > 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F')
      return "application/pdf";
    return null;
  }

  private static String cleanName(String name) {
    String n = name == null ? "receipt" : name.replaceAll("[\\\\/\\r\\n\"]", "_").trim();
    return n.isEmpty() ? "receipt" : n.length() > 160 ? n.substring(0, 160) : n;
  }

  private void requireTransaction(UUID ws, UUID transactionId) {
    if (db.count(
            "SELECT count(*) FROM transactions WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL",
            transactionId,
            ws)
        == 0) throw new ResourceNotFoundException("Transaction", transactionId.toString());
  }

  public Receipt add(UUID ws, UUID actor, UUID transactionId, String filename, byte[] bytes) {
    requireTransaction(ws, transactionId);
    if (bytes.length == 0) throw new BadRequestException("That file is empty");
    if (bytes.length > MAX_BYTES)
      throw new BadRequestException(
          "That file is too large. The limit is 1.5 MB; photos are shrunk automatically in the app.");
    String type = sniff(bytes);
    if (type == null) throw new BadRequestException("Attach a photo (JPEG, PNG or WebP) or a PDF");
    if (db.count("SELECT count(*) FROM receipts WHERE transaction_id = ?", transactionId)
        >= MAX_PER_TRANSACTION)
      throw new BusinessRuleException(
          "A transaction can have up to " + MAX_PER_TRANSACTION + " receipts");
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO receipts(id, workspace_id, transaction_id, filename, content_type, size_bytes, data_enc, created_by) VALUES (?,?,?,?,?,?,?,?)",
        id,
        ws,
        transactionId,
        cleanName(filename),
        type,
        bytes.length,
        crypto.seal(ws, Base64.getEncoder().encodeToString(bytes)),
        actor);
    return get(ws, id);
  }

  private static final String META =
      "SELECT id, transaction_id, filename, content_type, size_bytes, created_at FROM receipts";

  private static Receipt map(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new Receipt(
        rs.getObject(1, UUID.class),
        rs.getObject(2, UUID.class),
        rs.getString(3),
        rs.getString(4),
        rs.getInt(5),
        rs.getTimestamp(6).toInstant());
  }

  private Receipt get(UUID ws, UUID id) {
    return db.one(META + " WHERE id = ? AND workspace_id = ?", ReceiptService::map, id, ws)
        .orElseThrow(() -> new ResourceNotFoundException("Receipt", id.toString()));
  }

  public List<Receipt> forTransaction(UUID ws, UUID transactionId) {
    return db.list(
        META + " WHERE transaction_id = ? AND workspace_id = ? ORDER BY created_at",
        ReceiptService::map,
        transactionId,
        ws);
  }

  /** How many receipts each transaction has, so lists can show a paperclip. */
  public List<Count> counts(UUID ws) {
    return db.list(
        "SELECT r.transaction_id, count(*) FROM receipts r JOIN transactions t ON t.id = r.transaction_id "
            + "WHERE r.workspace_id = ? AND t.deleted_at IS NULL GROUP BY r.transaction_id",
        rs -> new Count(rs.getObject(1, UUID.class), rs.getInt(2)),
        ws);
  }

  public File download(UUID ws, UUID id) {
    Receipt r = get(ws, id);
    String sealed =
        db.one("SELECT data_enc FROM receipts WHERE id = ?", rs -> rs.getString(1), id)
            .orElseThrow();
    return new File(r.contentType(), r.filename(), Base64.getDecoder().decode(crypto.open(sealed)));
  }

  public void delete(UUID ws, UUID id) {
    get(ws, id);
    db.update("DELETE FROM receipts WHERE id = ? AND workspace_id = ?", id, ws);
  }
}
