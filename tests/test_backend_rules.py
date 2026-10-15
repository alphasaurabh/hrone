from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.main import _query_date, _query_month, attendance_date, late_minutes, rounded_hours


def test_overnight_attendance_date_uses_shift_start_day():
    # 05:40 IST on 7 July belongs to the 22:00 shift started on 6 July.
    instant = datetime(2026, 7, 7, 0, 10, tzinfo=timezone.utc)
    assert attendance_date(instant, "22:00", "06:00") == "2026-07-06"


def test_late_grace_is_strict_and_floored():
    # Mongo stores these naive datetimes as UTC (09:40 IST = 04:10 UTC).
    assert late_minutes(datetime(2026, 7, 6, 4, 10), "09:30", "2026-07-06") == 0
    assert late_minutes(datetime(2026, 7, 6, 4, 10, 1), "09:30", "2026-07-06") == 10


def test_work_hours_are_half_up_to_two_decimals():
    start = datetime(2026, 1, 1)
    end = datetime(2026, 1, 1, 4, 30, 0, 500000)
    assert rounded_hours(start, end) == 4.5


@pytest.mark.parametrize("value", ["2026-02-30", "not-a-date"])
def test_query_dates_return_http_422_for_invalid_values(value):
    with pytest.raises(HTTPException) as error:
        _query_date(value)
    assert error.value.status_code == 422


def test_query_month_returns_http_422_for_invalid_values():
    with pytest.raises(HTTPException) as error:
        _query_month("2026-13")
    assert error.value.status_code == 422
