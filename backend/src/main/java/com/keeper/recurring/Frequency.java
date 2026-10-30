package com.keeper.recurring;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * How a rule repeats (Strategy). Month-based frequencies re-anchor to the original day so a bill on
 * the 31st goes 31 -> 28 -> 31 instead of drifting to the 28th forever.
 */
public enum Frequency {
  DAILY {
    @Override
    public LocalDate next(LocalDate from, int interval, int anchorDay) {
      return from.plusDays(interval);
    }
  },
  WEEKLY {
    @Override
    public LocalDate next(LocalDate from, int interval, int anchorDay) {
      return from.plusWeeks(interval);
    }
  },
  MONTHLY {
    @Override
    public LocalDate next(LocalDate from, int interval, int anchorDay) {
      return addMonths(from, interval, anchorDay);
    }
  },
  QUARTERLY {
    @Override
    public LocalDate next(LocalDate from, int interval, int anchorDay) {
      return addMonths(from, 3L * interval, anchorDay);
    }
  },
  YEARLY {
    @Override
    public LocalDate next(LocalDate from, int interval, int anchorDay) {
      return addMonths(from, 12L * interval, anchorDay);
    }
  };

  public abstract LocalDate next(LocalDate from, int interval, int anchorDay);

  private static LocalDate addMonths(LocalDate from, long months, int anchorDay) {
    YearMonth target = YearMonth.from(from).plusMonths(months);
    return target.atDay(Math.min(anchorDay, target.lengthOfMonth()));
  }
}
