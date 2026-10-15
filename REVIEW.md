# REVIEW.md

List every defect you found in the starter `app/main.py` (helpers and endpoints). For each one:

| # | Where (function / line) | What is wrong | How you'd notice it (test, input, or symptom) | How you fixed it |
|---|---|---|---|---|
| 1 | `compute_late_minutes` | Used the server's local timezone, and calculated against an unnormalised instant. | A UTC host and a punch with milliseconds produced a different date/late value. | All instants are validated as epoch milliseconds, truncated to seconds, and converted explicitly through IST. |
| 2 | `compute_work_hours` | Python `round` uses banker's rounding and floating point arithmetic. | A duration ending in an x.xx5 hour rounded down unexpectedly. | Decimal `ROUND_HALF_UP` is used for all reported durations and rates. |
| 3 | `compute_overtime` | Did not handle overnight shift ends and allowed overtime below the 30-minute threshold. | A 22:00–06:00 shift or a 10-minute extension returned the wrong value. | Shift boundaries use the attendance day and overnight adjustment; overtime is floored and gated at 30 minutes. |
| 4 | `create_employee` | Duplicate creation was a check-then-insert race and did not expose epoch milliseconds. | Concurrent requests could both pass the check; responses contained BSON/local datetimes. | A unique index is created at startup and duplicate-key errors become 409; responses use epoch ms. |
| 5 | `list_employees` | Skipped `page * page_size` and counted unfiltered documents. | Page one was empty/short and totals ignored department filters. | Pagination uses `(page - 1) * page_size` and `count_documents` uses the same filter. |
| 6 | `punch_in` | Did not validate the employee, status or timestamp, used local time, and lacked atomic uniqueness. | Unknown employees failed with an exception and overnight punches had the wrong date. | Pydantic validation, explicit IST attendance-date logic, and the natural-key unique index fix these cases. |
| 7 | `list_attendance` | Loaded and sorted the entire collection and leaked `_id`/BSON dates. | Large datasets became slow and response shape violated the contract. | Mongo sort/skip/limit and indexed filters are used; serialization removes internal ids. |
| 8 | Missing endpoints | Punch-out, regularization, all analytics, and explain were absent. | Requests returned 404. | Implemented the documented endpoints and their validation/business rules. |

The supplied OpenAPI and data model were treated as authoritative; the frontend and sample files were not changed.

Also note anything you looked at and decided was **not** a defect, and why.
