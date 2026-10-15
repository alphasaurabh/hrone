# Candidate kit

Read in this order:

1. `PROBLEM_STATEMENT.docx`: what you are asked to do, how it is evaluated.
2. `openapi.yaml`: the API contract and the business rules (R1 - R10).
3. `DATA_MODEL.md`: what is stored in MongoDB, with nine sample documents.
4. `app/main.py`: the starter. Put **all** your code in this one file. It must start with `uvicorn app.main:app --port 8000`.
5. `REVIEW.md`, `DECISIONS.md`: templates to fill in.

`sample_data/` holds the nine sample documents as MongoDB Extended JSON; `sample_seed.py` loads them. The grader's dataset is
much larger and contains cases they do not show.

## Local setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set MONGO_URI / MONGO_DB (local docker: docker run -p 27017:27017 mongo:7)
python sample_seed.py
uvicorn app.main:app --port 8000 --reload
```

## Backend implementation

`app/main.py` implements every path in `openapi.yaml` using FastAPI and PyMongo. Set
`MONGO_URI` and `MONGO_DB` in the environment (real environment variables take
precedence over `.env`). Startup creates the unique employee and attendance natural-key
indexes plus the indexed list/analytics access paths. Epoch milliseconds are converted
to UTC BSON dates, attendance dates and shift boundaries use IST, and derived values
use Decimal half-up rounding. The punch-in natural-key index makes concurrent duplicate
requests deterministic. Analytics include monthly summaries, department summaries,
competition-ranked late leaderboard, gap-filled trends, and the explain route.
For browser integration, `FRONTEND_ORIGINS` may contain a comma-separated list of
allowed origins; it defaults to the localhost and loopback Vite dev/preview origins
on ports 5173 and 4173.

The backend tests should be run against a disposable MongoDB or a test double; this
repository does not claim that a live MongoDB test has been run.
MongoDB **6.0 or newer** is required (the grader uses 7.0). MongoDB Atlas free tier (M0) works.

## Submit
A public Git repository with `app/main.py`, `requirements.txt`, `REVIEW.md`, `DECISIONS.md` and a short `README.md`.
No `.env`, no secrets, no Dockerfile.
