from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import requests

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (fine for your project)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
LOKI_URL = "http://localhost:3100"


@app.get("/")
def home():
    return {"message": "Dashboard backend running"}


@app.get("/logs")
def get_logs():
    query = '{job="container_logs"}'
    response = requests.get(
        f"{LOKI_URL}/loki/api/v1/query",
        params={"query": query}
    )
    return response.json()


@app.get("/errors")
def get_errors():
    query = '{job="container_logs"} |= "ERROR"'
    response = requests.get(
        f"{LOKI_URL}/loki/api/v1/query",
        params={"query": query}
    )
    return response.json()
