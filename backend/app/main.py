from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import recommendations, assistant, assistant_enhanced, auth, payments, admin, public_products, virtual_tryon, training
from .database import Base, engine
from .config import get_logger
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize logger
logger = get_logger(__name__)

app = FastAPI(
    title="E-commerce API",
    description="Backend API for e-commerce application",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Create database tables
Base.metadata.create_all(bind=engine)
logger.info("Database tables created successfully")

# Configure CORS to allow requests from the frontend
# Include common localhost variants and the dev host shown by Next.js (192.168.56.1)
default_origins = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://192.168.56.1:3000"
allowed_origins = os.getenv("ALLOWED_ORIGINS", default_origins).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info(f"CORS configured for origins: {allowed_origins}")

# Include routers
app.include_router(recommendations.router, prefix="/api", tags=["recommendations"])
app.include_router(assistant.router, prefix="/api", tags=["assistant"])
app.include_router(assistant_enhanced.router, prefix="/api/assistant", tags=["assistant-enhanced"])
app.include_router(auth.router, tags=["auth"])
app.include_router(payments.router, tags=["payments"])
app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(public_products.router, tags=["products"])
app.include_router(virtual_tryon.router, prefix="/api", tags=["virtual-tryon"])
app.include_router(training.router, prefix="/api", tags=["training"])


@app.get("/")
async def root():
    return {"message": "E-commerce API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
