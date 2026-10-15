"""Employee attendance API.

All instants are normalised to whole UTC seconds at the HTTP boundary.  MongoDB
is deliberately kept behind this module so the same business rules are used by
the write endpoints and the analytics endpoints.
"""
import calendar
import os
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client[os.getenv("MONGO_DB", "attendance_db")]
IST = timezone(timedelta(hours=5, minutes=30))
UTC = timezone.utc
STATUSES = {"PRESENT", "ABSENT", "LEAVE", "WFH", "ON_DUTY"}
PRESENCE = {"PRESENT", "WFH", "ON_DUTY"}
EPOCH_MIN, EPOCH_MAX = 100_000_000_000, 4_102_444_800_000

app = FastAPI(title="Employee Attendance & Analytics API", version="2.0.0")
frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _date(v: str) -> date:
    try:
        return date.fromisoformat(v)
    except (TypeError, ValueError):
        raise ValueError("must be YYYY-MM-DD")


def _month(v: str) -> str:
    if len(v) != 7 or v[4] != "-" or not v[:4].isdigit() or not v[5:].isdigit():
        raise ValueError("must be YYYY-MM")
    if not 1 <= int(v[5:]) <= 12:
        raise ValueError("must be YYYY-MM")
    return v


def _query_date(v: str) -> date:
    try:
        return _date(v)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


def _query_month(v: str) -> str:
    try:
        return _month(v)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


def _clock(v: str) -> str:
    if len(v) != 5 or v[2] != ":":
        raise ValueError("must be HH:MM")
    try:
        h, m = int(v[:2]), int(v[3:])
    except ValueError:
        raise ValueError("must be HH:MM")
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise ValueError("must be HH:MM")
    return v


def _epoch(v: Any) -> int:
    if not isinstance(v, int) or isinstance(v, bool) or not EPOCH_MIN <= v <= EPOCH_MAX:
        raise ValueError("must be epoch milliseconds")
    return v


def from_ms(ms: int) -> datetime:
    return datetime.fromtimestamp(ms // 1000, UTC)


def to_ms(v: Optional[datetime]) -> Optional[int]:
    if v is None:
        return None
    if v.tzinfo is None:
        v = v.replace(tzinfo=UTC)
    return int(v.timestamp() * 1000)


def now_utc() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def clock_minutes(v: str) -> int:
    h, m = map(int, v.split(":"))
    return h * 60 + m


def attendance_date(instant: datetime, start: str, end: str) -> str:
    local = instant.astimezone(IST)
    d = local.date()
    if clock_minutes(end) <= clock_minutes(start) and local.hour * 60 + local.minute < clock_minutes(end):
        d -= timedelta(days=1)
    return d.isoformat()


def shift_boundary(day: str, value: str, overnight: bool = False) -> datetime:
    d = _date(day)
    if overnight:
        d += timedelta(days=1)
    h, m = map(int, value.split(":"))
    return datetime.combine(d, time(h, m), IST).astimezone(UTC).replace(tzinfo=None)


def late_minutes(punch: datetime, start: str, day: str) -> int:
    boundary = shift_boundary(day, start)
    seconds = (punch - boundary).total_seconds()
    return int(seconds // 60) if seconds > 600 else 0


def rounded_hours(start: datetime, end: datetime) -> float:
    return float((Decimal(str((end - start).total_seconds())) / Decimal(3600)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def derived(doc: dict, emp: dict) -> dict:
    pi, po = doc.get("punch_in"), doc.get("punch_out")
    if doc.get("status") not in PRESENCE or pi is None:
        return {"work_hours": None, "late_minutes": 0, "overtime_minutes": 0, "half_day": False}
    day = doc["date"]
    overnight = clock_minutes(emp["shift_end"]) <= clock_minutes(emp["shift_start"])
    late = late_minutes(pi, emp["shift_start"], day)
    if po is None:
        return {"work_hours": None, "late_minutes": late, "overtime_minutes": 0, "half_day": False}
    end = shift_boundary(day, emp["shift_end"], overnight)
    overtime = int((po - end).total_seconds() // 60) if po >= end else 0
    overtime = overtime if overtime >= 30 else 0
    hours = rounded_hours(pi, po)
    return {"work_hours": hours, "late_minutes": late, "overtime_minutes": overtime, "half_day": hours < 4.50}


def output(doc: dict) -> dict:
    result = {k: doc.get(k) for k in ("emp_code", "date", "status", "work_hours", "late_minutes", "overtime_minutes", "half_day")}
    result["punch_in"] = to_ms(doc.get("punch_in"))
    result["punch_out"] = to_ms(doc.get("punch_out"))
    result["history"] = []
    for entry in doc.get("history", []):
        e = dict(entry)
        e["at"] = to_ms(e.get("at"))
        e["changes"] = {k: {"from": (to_ms(v.get("from")) if k in ("punch_in", "punch_out") else v.get("from")),
                             "to": (to_ms(v.get("to")) if k in ("punch_in", "punch_out") else v.get("to"))}
                        for k, v in e.get("changes", {}).items()}
        result["history"].append(e)
    return result


class EmployeeIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    emp_code: str = Field(pattern=r"^EMP\d{4,6}$")
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=120, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    department: str = Field(min_length=1, max_length=50)
    shift_start: str = "09:30"
    shift_end: str = "18:30"
    joined_on: str

    @field_validator("shift_start", "shift_end")
    @classmethod
    def valid_clock(cls, v: str) -> str: return _clock(v)

    @field_validator("joined_on")
    @classmethod
    def valid_date(cls, v: str) -> str: _date(v); return v

    @model_validator(mode="after")
    def different_shifts(self):
        if self.shift_start == self.shift_end:
            raise ValueError("shift_start and shift_end must differ")
        return self


class PunchInIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    emp_code: str
    punched_at: Optional[int] = None
    status: str = "PRESENT"

    @field_validator("punched_at")
    @classmethod
    def valid_epoch(cls, v): return _epoch(v)

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        if v not in PRESENCE: raise ValueError("invalid presence status")
        return v


class PunchOutIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    emp_code: str
    punched_at: Optional[int] = None

    @field_validator("punched_at")
    @classmethod
    def valid_epoch(cls, v): return _epoch(v)


class RegularizeIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    status: Optional[str] = None
    punch_in: Optional[int] = None
    punch_out: Optional[int] = None
    reason: str = Field(min_length=5, max_length=200)
    regularized_by: str = Field(min_length=1, max_length=50)

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        if v is not None and v not in STATUSES: raise ValueError("invalid status")
        return v

    @field_validator("punch_in", "punch_out")
    @classmethod
    def valid_epoch(cls, v):
        return None if v is None else _epoch(v)


def page_args(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    return page, page_size


@app.on_event("startup")
def indexes():
    db.employees.create_index([("emp_code", ASCENDING)], unique=True, name="emp_code_unique")
    db.employees.create_index([("department", ASCENDING), ("joined_on", ASCENDING)], name="department_joined")
    db.attendance_logs.create_index([("emp_code", ASCENDING), ("date", DESCENDING)], unique=True, name="attendance_natural_key")
    db.attendance_logs.create_index([("date", DESCENDING), ("emp_code", ASCENDING)], name="attendance_date_emp")
    db.attendance_logs.create_index([("status", ASCENDING), ("date", ASCENDING)], name="attendance_status_date")


@app.get("/health")
def health():
    try:
        client.admin.command("ping")
        return {"status": "ok"}
    except PyMongoError:
        raise HTTPException(503, "MongoDB unavailable")


@app.post("/employees", status_code=201)
def create_employee(body: EmployeeIn):
    doc = body.model_dump()
    doc["created_at"] = now_utc().replace(tzinfo=None)
    try:
        db.employees.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, "emp_code already exists")
    doc.pop("_id", None)
    doc["created_at"] = to_ms(doc["created_at"])
    return doc


@app.get("/employees")
def list_employees(department: Optional[str] = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    q = {"department": department} if department is not None else {}
    total = db.employees.count_documents(q)
    docs = db.employees.find(q, {"_id": 0}).sort("emp_code", ASCENDING).skip((page - 1) * page_size).limit(page_size)
    items = list(docs)
    for d in items: d["created_at"] = to_ms(d.get("created_at"))
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@app.post("/attendance/punch-in", status_code=201)
def punch_in(body: PunchInIn):
    emp = db.employees.find_one({"emp_code": body.emp_code})
    if not emp: raise HTTPException(404, "employee not found")
    instant = from_ms(body.punched_at) if body.punched_at is not None else now_utc()
    instant_naive = instant.replace(tzinfo=None)
    day = attendance_date(instant, emp["shift_start"], emp["shift_end"])
    doc = {"emp_code": body.emp_code, "date": day, "status": body.status, "punch_in": instant_naive,
           "punch_out": None, "work_hours": None, "late_minutes": 0, "overtime_minutes": 0,
           "half_day": False, "history": []}
    doc.update(derived(doc, emp))
    try: db.attendance_logs.insert_one(doc)
    except DuplicateKeyError: raise HTTPException(409, "already punched in for this date")
    return output(doc)


@app.post("/attendance/punch-out")
def punch_out(body: PunchOutIn):
    emp = db.employees.find_one({"emp_code": body.emp_code})
    if not emp: raise HTTPException(404, "employee not found")
    instant = from_ms(body.punched_at) if body.punched_at is not None else now_utc()
    now = instant.replace(tzinfo=None)
    doc = db.attendance_logs.find_one(
        {"emp_code": body.emp_code, "punch_in": {"$lte": now}, "punch_out": None},
        sort=[("punch_in", DESCENDING)],
    )
    if not doc:
        closed = db.attendance_logs.find_one(
            {"emp_code": body.emp_code, "punch_in": {"$lte": now}},
            sort=[("punch_in", DESCENDING)],
        )
        if closed and closed.get("punch_out") is not None:
            raise HTTPException(409, "already punched out")
        raise HTTPException(404, "no punch-in found")
    if now <= doc["punch_in"] or now > doc["punch_in"] + timedelta(hours=24): raise HTTPException(422, "invalid punch-out time")
    values = derived({**doc, "punch_out": now}, emp)
    updated = db.attendance_logs.find_one_and_update({"_id": doc["_id"], "punch_out": None},
        {"$set": {"punch_out": now, **values}}, return_document=ReturnDocument.AFTER)
    if not updated: raise HTTPException(409, "already punched out")
    return output(updated)


@app.get("/attendance")
def list_attendance(emp_code: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None,
                     status: Optional[str] = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    if date_from: _query_date(date_from)
    if date_to: _query_date(date_to)
    if date_from and date_to and date_from > date_to: raise HTTPException(422, "date_from must not exceed date_to")
    if status and status not in STATUSES: raise HTTPException(422, "invalid status")
    q = {}
    if emp_code: q["emp_code"] = emp_code
    if status: q["status"] = status
    if date_from or date_to:
        q["date"] = {}
        if date_from: q["date"]["$gte"] = date_from
        if date_to: q["date"]["$lte"] = date_to
    total = db.attendance_logs.count_documents(q)
    cur = db.attendance_logs.find(q).sort([("date", DESCENDING), ("emp_code", ASCENDING)]).skip((page - 1) * page_size).limit(page_size)
    return {"items": [output(d) for d in cur], "total": total, "page": page, "page_size": page_size}


@app.patch("/attendance/{emp_code}/{date}")
def regularize(emp_code: str, date: str, body: RegularizeIn):
    _query_date(date)
    emp = db.employees.find_one({"emp_code": emp_code})
    doc = db.attendance_logs.find_one({"emp_code": emp_code, "date": date})
    if not emp or not doc: raise HTTPException(404, "employee or attendance record not found")
    if body.status in {"ABSENT", "LEAVE"} and (body.punch_in is not None or body.punch_out is not None):
        raise HTTPException(422, "non-presence status cannot have punch times")
    final = {k: doc.get(k) for k in ("status", "punch_in", "punch_out")}
    if body.status is not None: final["status"] = body.status
    if body.punch_in is not None: final["punch_in"] = from_ms(body.punch_in).replace(tzinfo=None)
    if body.punch_out is not None: final["punch_out"] = from_ms(body.punch_out).replace(tzinfo=None)
    if final["status"] in {"ABSENT", "LEAVE"}: final["punch_in"] = final["punch_out"] = None
    if final["status"] in PRESENCE and final["punch_in"] is None: raise HTTPException(422, "presence requires punch_in")
    if final["punch_in"] is not None:
        if attendance_date(final["punch_in"].replace(tzinfo=UTC), emp["shift_start"], emp["shift_end"]) != date: raise HTTPException(422, "punch_in is not on attendance date")
    if final["punch_out"] is not None and (final["punch_in"] is None or final["punch_out"] <= final["punch_in"] or final["punch_out"] > final["punch_in"] + timedelta(hours=24)):
        raise HTTPException(422, "invalid punch_out")
    values = derived({**doc, **final, "date": date}, emp)
    changes = {}
    for key in ("status", "punch_in", "punch_out", "work_hours", "late_minutes", "overtime_minutes", "half_day"):
        old, new = doc.get(key), values.get(key) if key in values else final.get(key)
        if old != new: changes[key] = {"from": old, "to": new}
    if not changes: raise HTTPException(422, "request changes nothing")
    entry = {"at": now_utc().replace(tzinfo=None), "by": body.regularized_by, "reason": body.reason, "changes": changes}
    update = {**final, **values}
    updated = db.attendance_logs.find_one_and_update({"_id": doc["_id"]}, {"$set": update, "$push": {"history": entry}}, return_document=ReturnDocument.AFTER)
    return output(updated)


def month_bounds(month: str) -> tuple[date, date]:
    _query_month(month)
    y, m = map(int, month.split("-"))
    return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1])


def round_num(v: Optional[float], places: int = 2) -> Optional[float]:
    if v is None: return None
    return float(Decimal(str(v)).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP))


def mongo_half_up(expr: Any, places: int) -> dict:
    scale = 10 ** places
    return {"$divide": [{"$floor": {"$add": [{"$multiply": [expr, scale]}, 0.5]}}, scale]}


def month_logs(emp_code: str, month: str) -> list[dict]:
    first, last = month_bounds(month)
    return list(db.attendance_logs.find({"emp_code": emp_code, "date": {"$gte": first.isoformat(), "$lte": last.isoformat()}}))


@app.get("/analytics/employees/{emp_code}/monthly")
def employee_monthly(emp_code: str, month: str):
    _query_month(month)
    emp = db.employees.find_one({"emp_code": emp_code})
    if not emp: raise HTTPException(404, "employee not found")
    first, last = month_bounds(month)
    start = max(first, _date(emp["joined_on"]))
    working = sum(1 for i in range((last - start).days + 1) if (start + timedelta(i)).weekday() < 5) if start <= last else 0
    logs = list(db.attendance_logs.aggregate([
        {"$match": {"emp_code": emp_code, "date": {"$gte": first.isoformat(), "$lte": last.isoformat()}}},
        {"$group": {"_id": None, "present_days": {"$sum": {"$cond": [
            {"$and": [{"$in": ["$status", list(PRESENCE)]},
                      {"$in": [{"$dayOfWeek": {"$dateFromString": {"dateString": "$date"}}}, [2, 3, 4, 5, 6]]}]},
            {"$cond": ["$half_day", 0.5, 1]}, 0]}},
            "leave_days": {"$sum": {"$cond": [{"$eq": ["$status", "LEAVE"]}, 1, 0]}},
            "late_count": {"$sum": {"$cond": [{"$gt": ["$late_minutes", 0]}, 1, 0]}},
            "total_late_minutes": {"$sum": {"$cond": [{"$gt": ["$late_minutes", 0]}, "$late_minutes", 0]}},
            "total_overtime_minutes": {"$sum": "$overtime_minutes"}}}
    ]))
    totals = logs[0] if logs else {"present_days": 0, "leave_days": 0, "late_count": 0,
                                   "total_late_minutes": 0, "total_overtime_minutes": 0}
    present = totals["present_days"]
    return {"emp_code": emp_code, "month": month, "working_days": working, "present_days": present,
            "leave_days": totals["leave_days"], "late_count": totals["late_count"],
            "total_late_minutes": totals["total_late_minutes"],
            "total_overtime_minutes": totals["total_overtime_minutes"],
            "attendance_pct": round_num(present / working * 100, 2) if working else None}


@app.get("/analytics/departments/summary")
def department_summary(month: str, department: Optional[str] = None):
    first, last = month_bounds(month)
    rows = list(db.employees.aggregate(department_summary_pipeline(first, last, department)))
    return {"month": month, "items": rows}


def department_summary_pipeline(first: date, last: date, department: Optional[str] = None) -> list[dict]:
    match = {"joined_on": {"$lte": last.isoformat()}}
    if department is not None:
        match["department"] = department
    return [
        {"$match": match},
        {"$lookup": {"from": "attendance_logs", "let": {"code": "$emp_code"},
            "pipeline": [{"$match": {"$expr": {"$and": [
                {"$eq": ["$emp_code", "$$code"]},
                {"$gte": ["$date", first.isoformat()]},
                {"$lte": ["$date", last.isoformat()]}]}}},
                {"$project": {"date": 1, "status": 1, "half_day": 1, "work_hours": 1, "late_minutes": 1}}],
            "as": "logs"}},
        {"$unwind": {"path": "$logs", "preserveNullAndEmptyArrays": True}},
        {"$set": {"present": {"$cond": [{"$and": [
            {"$in": ["$logs.status", list(PRESENCE)]},
            {"$in": [{"$dayOfWeek": {"$dateFromString": {"dateString": "$logs.date"}}}, [2, 3, 4, 5, 6]]}]},
            {"$cond": ["$logs.half_day", 0.5, 1]}, 0]}}},
        {"$group": {"_id": "$department", "headcount": {"$sum": 1},
            "present_days": {"$sum": "$present"},
            "hours": {"$push": {"$cond": [{"$and": [
                {"$in": ["$logs.status", list(PRESENCE)]}, {"$ne": ["$logs.work_hours", None]}]},
                "$logs.work_hours", None]}},
            "late_count": {"$sum": {"$cond": [{"$gt": ["$logs.late_minutes", 0]}, 1, 0]}},
            "total_late_minutes": {"$sum": {"$cond": [{"$gt": ["$logs.late_minutes", 0]}, "$logs.late_minutes", 0]}},
            "leave_count": {"$sum": {"$cond": [{"$eq": ["$logs.status", "LEAVE"]}, 1, 0]}},
            "on_duty_count": {"$sum": {"$cond": [{"$eq": ["$logs.status", "ON_DUTY"]}, 1, 0]}}}},
        {"$set": {"hours": {"$filter": {"input": "$hours", "as": "h", "cond": {"$ne": ["$$h", None]}}}}},
        {"$set": {"avg_work_hours": {"$cond": [{"$gt": [{"$size": "$hours"}, 0]},
            mongo_half_up({"$avg": "$hours"}, 2), None]}}},
        {"$project": {"_id": 0, "department": "$_id", "headcount": 1, "present_days": 1,
            "avg_work_hours": 1, "late_count": 1, "total_late_minutes": 1, "leave_count": 1, "on_duty_count": 1}},
        {"$sort": {"department": 1}},
    ]


@app.get("/analytics/leaderboard/late")
def late_leaderboard(month: str, limit: int = Query(10, ge=1, le=50), department: Optional[str] = None):
    first, last = month_bounds(month)
    rows = list(db.attendance_logs.aggregate(late_leaderboard_pipeline(first, last, department, limit)))
    return {"month": month, "items": rows}


def late_leaderboard_pipeline(first: date, last: date, department: Optional[str], limit: int) -> list[dict]:
    return [
        {"$match": {"date": {"$gte": first.isoformat(), "$lte": last.isoformat()}, "late_minutes": {"$gt": 0}}},
        {"$lookup": {"from": "employees", "localField": "emp_code", "foreignField": "emp_code", "as": "employee"}},
        {"$unwind": "$employee"},
        {"$match": {"employee.department": department} if department is not None else {}},
        {"$group": {"_id": "$emp_code", "name": {"$first": "$employee.name"},
            "department": {"$first": "$employee.department"}, "total_late_minutes": {"$sum": "$late_minutes"},
            "late_count": {"$sum": 1}}},
        {"$sort": {"total_late_minutes": -1, "_id": 1}},
        {"$setWindowFields": {"sortBy": {"total_late_minutes": -1},
            "output": {"rank": {"$rank": {}}}}},
        {"$match": {"rank": {"$lte": limit}}},
        {"$sort": {"rank": 1, "_id": 1}},
        {"$project": {"_id": 0, "rank": 1, "emp_code": "$_id", "name": 1, "department": 1,
            "total_late_minutes": 1, "late_count": 1}},
    ]


@app.get("/analytics/departments/{department}/trend")
def department_trend(department: str, from_: str = Query(..., alias="from"), to: str = Query(...)):
    start, end = _query_date(from_), _query_date(to)
    if end < start: raise HTTPException(422, "to must not precede from")
    if (end - start).days + 1 > 92: raise HTTPException(422, "range exceeds 92 days")
    pipeline = trend_pipeline(department, start, end)
    result = list(db.employees.aggregate(pipeline))
    if not result:
        raise HTTPException(404, "department not found")
    rows = result[0].get("items", [])
    return {"department": department, "items": rows}


def trend_pipeline(department: str, start: date, end: date) -> list[dict]:
    """Build the trend query entirely in MongoDB.

    Calendar dates are strings in the model, so the pipeline generates a date
    series with `$range`/`$dateAdd`, then formats it back to YYYY-MM-DD.  This
    is the aggregation equivalent of densify and preserves empty weekends and
    empty workdays without a Python loop.
    """
    days = (end - start).days + 1
    start_dt = datetime.combine(start, time.min)
    return [
        {"$match": {"department": department}},
        {"$group": {"_id": None, "employees": {"$push": {"code": "$emp_code", "joined_on": "$joined_on"}}}},
        {"$project": {"employees": 1, "dates": {"$map": {"input": {"$range": [0, days]}, "as": "n",
            "in": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateAdd": {"startDate": start_dt, "unit": "day", "amount": "$$n"}}}}}}}},
        {"$unwind": "$dates"},
        {"$lookup": {"from": "attendance_logs", "let": {"day": "$dates", "codes": "$employees"},
            "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$date", "$$day"]},
                {"$in": ["$emp_code", {"$map": {"input": "$$codes", "as": "e", "in": "$$e.code"}}]}]}}},
                {"$project": {"_id": 0, "status": 1, "half_day": 1, "late_minutes": 1}}],
            "as": "logs"}},
        {"$set": {"is_working_day": {"$in": [{"$dayOfWeek": {"$dateFromString": {"dateString": "$dates"}}}, [2, 3, 4, 5, 6]]},
            "headcount": {"$size": {"$filter": {"input": "$employees", "as": "e",
                "cond": {"$lte": ["$$e.joined_on", "$dates"]}}}},
            "present_count": {"$reduce": {"input": "$logs", "initialValue": 0, "in": {"$add": ["$$value",
                {"$cond": [{"$in": ["$$this.status", list(PRESENCE)]}, {"$cond": ["$$this.half_day", 0.5, 1]}, 0]}]}}},
            "late_count": {"$size": {"$filter": {"input": "$logs", "as": "l", "cond": {"$gt": ["$$l.late_minutes", 0]}}}}}},
        {"$set": {"attendance_rate": {"$cond": [{"$and": ["$is_working_day", {"$gt": ["$headcount", 0]}]},
            mongo_half_up({"$multiply": [{"$divide": ["$present_count", "$headcount"]}, 100]}, 4), None]}}},
        {"$setWindowFields": {"partitionBy": None, "sortBy": {"dates": 1},
            "output": {"moving_avg_7d": {"$avg": "$attendance_rate", "window": {"documents": [-6, 0]}}}}},
        {"$project": {"_id": 0, "date": "$dates", "is_working_day": 1, "headcount": 1, "present_count": 1,
            "late_count": 1, "attendance_rate": 1, "moving_avg_7d": mongo_half_up("$moving_avg_7d", 4)}},
        {"$group": {"_id": None, "items": {"$push": "$$ROOT"}}},
        {"$project": {"_id": 0, "items": 1}},
    ]


@app.get("/admin/explain/{endpoint}")
def explain(endpoint: str, emp_code: Optional[str] = None, month: Optional[str] = None, department: Optional[str] = None,
            limit: int = Query(10, ge=1, le=50), date_from: Optional[str] = None, date_to: Optional[str] = None,
            status: Optional[str] = None, from_: Optional[str] = Query(None, alias="from"), to: Optional[str] = None,
            page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    allowed = {"attendance_list", "employee_monthly", "department_summary", "late_leaderboard", "department_trend"}
    if endpoint not in allowed: raise HTTPException(422, "unknown endpoint")
    if endpoint == "attendance_list":
        q = {}; 
        if emp_code: q["emp_code"] = emp_code
        if status: q["status"] = status
        if date_from or date_to: q["date"] = {k: v for k, v in (("$gte", date_from), ("$lte", date_to)) if v}
        raw = db.command(
            "explain",
            {
                "find": "attendance_logs",
                "filter": q,
                "sort": {"date": DESCENDING, "emp_code": ASCENDING},
                "skip": (page - 1) * page_size,
                "limit": page_size,
            },
            verbosity="executionStats",
        )
        return {"endpoint": endpoint, "collection": "attendance_logs", "explain": raw}
    first, last = month_bounds(month) if month else (None, None)
    if endpoint == "department_trend":
        if not department or not from_ or not to:
            raise HTTPException(422, "department, from and to required")
        trend_start, trend_end = _query_date(from_), _query_date(to)
        if trend_end < trend_start or (trend_end - trend_start).days + 1 > 92:
            raise HTTPException(422, "invalid trend range")
        pipeline = trend_pipeline(department, trend_start, trend_end)
        raw = db.command("explain", {"aggregate": "employees", "pipeline": pipeline, "cursor": {}},
                         verbosity="executionStats")
        return {"endpoint": endpoint, "collection": "employees", "explain": raw}
    if endpoint in {"employee_monthly", "department_summary", "late_leaderboard"} and not month:
        raise HTTPException(422, "month required")
    if month:
        _query_month(month)
    if endpoint == "employee_monthly" and not emp_code: raise HTTPException(422, "emp_code required")
    if endpoint == "employee_monthly":
        pipeline = [{"$match": {"emp_code": emp_code, "date": {"$gte": first.isoformat(), "$lte": last.isoformat()}}},
                    {"$group": {"_id": "$emp_code", "late_count": {"$sum": {"$cond": [{"$gt": ["$late_minutes", 0]}, 1, 0]}}}}]
    elif endpoint == "late_leaderboard":
        pipeline = late_leaderboard_pipeline(first, last, department, limit)
    else:
        pipeline = department_summary_pipeline(first, last, department)
    collection = "attendance_logs" if endpoint in {"employee_monthly", "late_leaderboard"} else "employees"
    raw = db.command("explain", {"aggregate": collection, "pipeline": pipeline, "cursor": {}},
                     verbosity="executionStats")
    return {"endpoint": endpoint, "collection": collection, "explain": raw}
