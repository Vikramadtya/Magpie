package com.keeper.forecast;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Function;

/**
 * Forecasts the next value of a short monthly series (spending in a category, say).
 *
 * <p>Several simple models each predict the next point; they are scored by rolling one-step-ahead
 * backtests on the history, and combined with weights proportional to 1 / error. The spread of the
 * ensemble's backtest errors gives an 80% prediction interval. No external service is involved and
 * the result is explainable: {@link Result#method} names the model that carried most weight.
 */
public final class Forecaster {
  private Forecaster() {}

  public record Result(
      double value, double low, double high, String method, int months, String confidence) {}

  private record Model(String name, int minPoints, Function<double[], Double> predict) {}

  private static final double Z80 = 1.2816;

  private static final List<Model> MODELS =
      List.of(
          new Model("recent average", 1, y -> mean(tail(y, 3))),
          new Model("smoothed level", 1, Forecaster::ewma),
          new Model("typical month", 1, y -> median(tail(y, 5))),
          new Model("trend", 3, Forecaster::trend),
          new Model("momentum", 3, Forecaster::holt),
          new Model("same month last year", 13, Forecaster::seasonal));

  public static Result forecast(double[] history) {
    int n = history.length;
    if (n == 0) return new Result(0, 0, 0, "no history", 0, "NONE");
    if (n < 3) {
      double v = mean(history);
      return new Result(v, Math.max(0, v * 0.6), v * 1.4, "average of what's there", n, "LOW");
    }

    // Backtest every model: predict point t from y[0..t-1], for the last few points.
    int first = Math.max(2, n - 8);
    int evalCount = n - first;
    double[][] errors = new double[MODELS.size()][];
    double[] predictionsNow = new double[MODELS.size()];
    double[] weights = new double[MODELS.size()];
    double[][] backtestPreds = new double[MODELS.size()][evalCount];
    boolean[] usable = new boolean[MODELS.size()];

    for (int m = 0; m < MODELS.size(); m++) {
      Model model = MODELS.get(m);
      if (n < model.minPoints) continue;
      List<Double> errs = new ArrayList<>();
      for (int t = first; t < n; t++) {
        double[] past = Arrays.copyOfRange(history, 0, t);
        if (past.length < model.minPoints) {
          backtestPreds[m][t - first] = Double.NaN;
          continue;
        }
        double p = Math.max(0, model.predict.apply(past));
        backtestPreds[m][t - first] = p;
        errs.add(Math.abs(p - history[t]));
      }
      predictionsNow[m] = Math.max(0, model.predict.apply(history));
      usable[m] = true;
      errors[m] = errs.stream().mapToDouble(Double::doubleValue).toArray();
      double mae = errs.isEmpty() ? mean(history) : mean(errors[m]);
      weights[m] = 1.0 / (mae + 1e-6 * Math.max(1, mean(history)) + 1);
    }

    double sumW = 0;
    double value = 0;
    int best = 0;
    for (int m = 0; m < MODELS.size(); m++) {
      if (!usable[m]) continue;
      sumW += weights[m];
      value += weights[m] * predictionsNow[m];
      if (weights[m] > weights[best] || !usable[best]) best = m;
    }
    value /= sumW;

    // Ensemble backtest errors -> sigma
    double sq = 0;
    int count = 0;
    for (int i = 0; i < evalCount; i++) {
      double w = 0;
      double p = 0;
      for (int m = 0; m < MODELS.size(); m++) {
        if (!usable[m] || Double.isNaN(backtestPreds[m][i])) continue;
        w += weights[m];
        p += weights[m] * backtestPreds[m][i];
      }
      if (w == 0) continue;
      double err = history[first + i] - p / w;
      sq += err * err;
      count++;
    }
    double sigma = count > 0 ? Math.sqrt(sq / count) : value * 0.35;
    double low = Math.max(0, value - Z80 * sigma);
    double high = value + Z80 * sigma;
    String confidence = n < 4 ? "LOW" : n < 9 ? "MEDIUM" : "HIGH";
    return new Result(value, low, high, MODELS.get(best).name, n, confidence);
  }

  // ---------- models ----------

  private static double ewma(double[] y) {
    double level = y[0];
    for (int i = 1; i < y.length; i++) level = 0.5 * y[i] + 0.5 * level;
    return level;
  }

  /** Least-squares line over the last 12 points, projected one step. */
  private static double trend(double[] y) {
    double[] w = tail(y, 12);
    int k = w.length;
    double xMean = (k - 1) / 2.0;
    double yMean = mean(w);
    double num = 0;
    double den = 0;
    for (int i = 0; i < k; i++) {
      num += (i - xMean) * (w[i] - yMean);
      den += (i - xMean) * (i - xMean);
    }
    double slope = den == 0 ? 0 : num / den;
    return yMean + slope * (k - xMean);
  }

  /** Holt's linear exponential smoothing. */
  private static double holt(double[] y) {
    double level = y[0];
    double trend = y[1] - y[0];
    for (int i = 1; i < y.length; i++) {
      double prev = level;
      level = 0.5 * y[i] + 0.5 * (level + trend);
      trend = 0.3 * (level - prev) + 0.7 * trend;
    }
    return level + trend;
  }

  /** The same month a year ago, scaled by how the recent level moved since then. */
  private static double seasonal(double[] y) {
    int n = y.length;
    double lastYear = y[n - 12];
    if (n < 15) return lastYear;
    double recent = mean(Arrays.copyOfRange(y, n - 3, n));
    double thenLevel = mean(Arrays.copyOfRange(y, n - 15, n - 12));
    return thenLevel > 0 ? lastYear * (recent / thenLevel) : lastYear;
  }

  // ---------- helpers ----------

  static double[] tail(double[] y, int k) {
    return Arrays.copyOfRange(y, Math.max(0, y.length - k), y.length);
  }

  static double mean(double[] y) {
    if (y.length == 0) return 0;
    double s = 0;
    for (double v : y) s += v;
    return s / y.length;
  }

  static double median(double[] y) {
    double[] s = y.clone();
    Arrays.sort(s);
    int n = s.length;
    return n == 0 ? 0 : n % 2 == 1 ? s[n / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
}
