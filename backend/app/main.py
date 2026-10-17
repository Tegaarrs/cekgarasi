import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .routers import auth_router, buyer_router, admin_router, database_router

app = FastAPI(
    title="CekGarasi API",
    description="Platform Pasar Mobil Bekas Khusus Pembeli dengan Segmentasi Pasar K-Means Nyata",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth_router.router)
app.include_router(buyer_router.router)
app.include_router(admin_router.router)
app.include_router(database_router.router)


@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["Sistem"])
def health_check():
    return {
        "status": "healthy",
        "service": "CekGarasi Backend API",
        "version": "1.0.0"
    }


# Static files & SPA Routing
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
FRONTEND_DIST = os.path.join(FRONTEND_DIR, "dist")
STATIC_ROOT = FRONTEND_DIST if os.path.isdir(FRONTEND_DIST) else FRONTEND_DIR

# Mount explicit asset directories if available
assets_dir = os.path.join(FRONTEND_DIST, "assets")
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

images_dir = os.path.join(FRONTEND_DIR, "images")
if os.path.isdir(images_dir):
    app.mount("/images", StaticFiles(directory=images_dir), name="images")

# File extensions that MUST return 404 if not found (never fallback to index.html)
STATIC_EXTENSIONS = (
    ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
    ".ico", ".webp", ".woff", ".woff2", ".ttf", ".eot",
    ".map", ".json", ".txt"
)

NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
}

if os.path.isdir(STATIC_ROOT):
    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_spa(full_path: str):
        # Exclude backend internal routes
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")

        # Normalize path
        normalized_path = full_path.strip("/")
        target_file = os.path.join(STATIC_ROOT, normalized_path)

        # If it matches an actual file on disk, serve it
        if normalized_path and os.path.isfile(target_file):
            return FileResponse(target_file)

        # If it was an asset/image request that wasn't found, NEVER return index.html (return 404)
        lower_path = normalized_path.lower()
        if lower_path.startswith("assets/") or lower_path.startswith("images/") or lower_path.endswith(STATIC_EXTENSIONS):
            raise HTTPException(status_code=404, detail=f"Asset '{full_path}' not found")

        # HTML navigation fallback for SPA
        index_file = os.path.join(STATIC_ROOT, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file, headers=NO_CACHE_HEADERS)

        return {"message": "CekGarasi API berjalan. Buka /docs untuk dokumentasi API."}


