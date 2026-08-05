from fastapi import FastAPI

app = FastAPI(title="Query Sentinel AI", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "query-sentinel-ai"}


@app.get("/")
def root():
    return {
        "message": "Query Sentinel AI backend is running",
        "features": [
            "natural language to query",
            "transparent query preview",
            "SIEM investigation summaries",
        ],
    }
