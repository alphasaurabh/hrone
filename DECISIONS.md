# DECISIONS.md  (about 150-200 words in total - plain language, your own words)

1. **Indexes.** `employees.emp_code` is unique for the customer key; department/joined-on supports headcount
queries. `attendance_logs.(emp_code,date)` is unique and prevents duplicate punches; date/employee supports the
listing sort and status/date supports filtered analytics. I considered an index on every derived metric, but rejected
it because the analytics filter by employee/date and the metric indexes would add write cost without serving a contract
query.
2. **Punch-in race.** Both requests calculate the same natural key. MongoDB's unique
`(emp_code,date)` index serializes the inserts: one gets 201, and the other receives
`DuplicateKeyError`, which the API maps to 409. There is no check-then-insert decision.
3. **Ties.** Rows are sorted by minutes then code, but rank is competition rank. Filtering happens after ranking, so
all employees tied at a rank at or below `limit` are returned, including rows beyond the nominal limit.
4. **Headcount.** The summary starts from employees joined by the end of the month and creates a group for each
department before reading logs. Thus a person with no attendance document still increments headcount.
5. **One thing you would change** if this had to serve 100x the data.
I would move the trend and department calculations to MongoDB aggregation (including densification) and cache monthly
rollups, while retaining the same indexed read paths and response rounding.
