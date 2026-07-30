import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from database import connect_to_mongo, close_mongo_connection
from routers.accounts import router as accounts_router
from routers.default import router as learner_router
from routers.educator import router as educator_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Qrious API",
    description="Qrious API is Running",
    version="1.0.0",
    lifespan=lifespan,
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(PyMongoError)
async def mongo_error_handler(request: Request, exc: PyMongoError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database service is temporarily unavailable."},
    )


@app.get("/")
async def root():
    return {
        "message": "Qrious LMS API is running",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Authentication and onboarding
app.include_router(accounts_router)

# Learner LMS: catalog, enrollments, lessons, progress, resources
app.include_router(learner_router)

# Educator LMS: create, edit, publish courses/modules/lessons
app.include_router(educator_router)