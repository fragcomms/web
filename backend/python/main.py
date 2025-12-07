import os
import asyncpg
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

current_file = Path(__file__).resolve()
env_path = current_file.parent.parent.parent / ".env"

load_dotenv(dotenv_path=env_path)

@asynccontextmanager
async def lifespan(app: FastAPI):
  print("connecting to db")
  app.state.pool = await asyncpg.create_pool(
    user=os.getenv('PG_USER'),
    password=os.getenv('PG_PASS'),
    host=os.getenv('PG_HOST'),
    port=os.getenv('PG_PORT'),
    database=os.getenv('PG_DB')
  )
  
  yield
  
  print("closing db conn")
  await app.state.pool.close()
  
app = FastAPI(lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173"], # Your frontend URL
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.get("/api/audio")
async def get_audio_files():
  try:
    query = "SELECT audio_id, file_ext, creation_time, sampling_rate FROM audios ORDER BY creation_time DESC"
    async with app.state.pool.acquire() as connection:
      rows = await connection.fetch(query)
    return [dict(row) for row in rows]
  except Exception as e:
    print(f"Error: {e}")
    raise HTTPException(status_code=500, detail="Database error")
  
@app.get("/api/replays")
async def get_replays():
  try:
    query = "SELECT replay_id, demo_fetch_timestamp FROM replays ORDER BY demo_fetch_timestamp DESC"
    async with app.state.pool.acquire() as connection:
      rows = await connection.fetch(query)
    return [dict(row) for row in rows]
  except Exception as e:
    print(f"Error: {e}")
    raise HTTPException(status_code=500, detail="Database error")