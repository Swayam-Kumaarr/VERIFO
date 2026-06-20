from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import analyze, portfolio, result, submission, auth as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nexora — Proof of Build API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(submission.router)
app.include_router(analyze.router)
app.include_router(result.router)
app.include_router(portfolio.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "nexora-api"}
