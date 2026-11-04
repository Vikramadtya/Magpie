# Charts

Where each chart lives. The data comes from a few endpoints under `/api/v1/workspaces/{ws}/analytics`
(see `AnalyticsController`); `breakdown` is the general one: money grouped by one thing
(`by=category|subcategory|payee|account|tag|trip|person|currency|weekday|daypart|kind|none`) and optionally
by `bucket=day|month`, with filters and `type=EXPENSE|INCOME`. Rows beyond `limit` are folded into
"Everything else". Everything is in the base currency and covers your own money only (other people's
spending shows only under `by=person`).

| Page / tab | Charts |
| --- | --- |
| Dashboard | spending pace (this month against last), net worth over time, budgets planned and spent |
| Analytics, Spending | by category (bars or share), sub-categories of one category, treemap (category, sub-category, payee), top payees, one payee month by month, by account, by tag, by trip, a trip by category, spent by other people, by currency |
| Analytics, Over time | spending per month, earned and spent, saved per month with savings rate, spending smoothed (3-month average), category mix by month, each category over time, this year against last, income sources, number of purchases, recurring against everyday, spending pace, day by day |
| Analytics, Habits | weekday, part of the month, spending calendar, purchase-size histogram, biggest purchases dot plot |
| Analytics, Budgets & goals | budget against spent (this month and over months), overspend heatmap, goal progress with a projected finish |
| Analytics, Wealth | net worth, assets against debts, composition, balance per account, debt over time, paid in against worth, gain or loss per holding, allocation, purchases timeline, gold/land value history |
| Analytics, People | loans owed to you and by you over time, lent and paid back per person, what others spent, household shares (also on the Household page) |
| Analytics, Next month | forecast per category with likely range, net worth projection (an estimate), regular bills and income |

## Things to know

- Spending by tag counts a purchase under each of its tags.
- Net worth over time counts investments at what you paid in past months, and at today's value this month.
- Value history for investments and gold/land only exists from the day migration V20 was deployed
  (`holding_values`, filled by a trigger whenever a holding's price or quantity changes).
- Purchase notes are encrypted, so nothing is charted by note text.
