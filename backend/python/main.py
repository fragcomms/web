import os
import asyncpg
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

# Robustly find .env file relative to this script
current_file = Path(__file__).resolve()
env_path = current_file.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class ReplayRequest(BaseModel):
    audio_id: int
    demo_name: str
    model: str

class DatabaseManager:
    """Handles PostgreSQL connection pool lifecycle and query execution."""
    def __init__(self):
        self.pool = None

    async def connect(self):
        """Initializes the connection pool using env vars."""
        print("🔌 Connecting to Database...")
        try:
            self.pool = await asyncpg.create_pool(
                user=os.getenv('PG_USER'),
                password=os.getenv('PG_PASS'),
                host=os.getenv('PG_HOST'),
                port=os.getenv('PG_PORT'),
                database=os.getenv('PG_DB')
            )
            print("Database Connected.")
        except Exception as e:
            print(f"Failed to connect to DB: {e}")
            raise e

    async def close(self):
        """Closes the connection pool."""
        if self.pool:
            print("Closing Database Connection...")
            await self.pool.close()

    async def fetch_all(self, query: str, *args):
        """Helper to acquire a connection and fetch all rows safely."""
        if not self.pool:
            raise RuntimeError("Database not initialized")
        
        async with self.pool.acquire() as connection:
            rows = await connection.fetch(query, *args)
            return [dict(row) for row in rows]

class APIServer:
    """Main Application Class handling Routes and Middleware."""
    def __init__(self):
        self.db = DatabaseManager()
        # Pass the lifespan method to FastAPI
        self.app = FastAPI(lifespan=self._lifespan)
        self._setup_middleware()
        self._setup_routes()

    @asynccontextmanager
    async def _lifespan(self, app: FastAPI):
        # --- Startup ---
        await self.db.connect()
        yield
        # --- Shutdown ---
        await self.db.close()

    def _setup_middleware(self):
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def _setup_routes(self):
        self.app.get("/api/audio")(self.get_audio_files)
        self.app.get("/api/replays")(self.get_replays)
        self.app.post("/api/replays")(self.create_replay)

    # --- Route Handlers ---

    async def get_audio_files(self):
        try:
            query = "SELECT audio_id, file_ext, creation_time, sampling_rate FROM audios ORDER BY creation_time DESC"
            return await self.db.fetch_all(query)
        except Exception as e:
            print(f"Error fetching audio: {e}")
            raise HTTPException(status_code=500, detail="Database error")

    async def get_replays(self):
        try:
            query = "SELECT replay_id, demo_fetch_time FROM replays ORDER BY demo_fetch_time DESC"
            return await self.db.fetch_all(query)
        except Exception as e:
            print(f"Error fetching replays: {e}")
            raise HTTPException(status_code=500, detail="Database error")
          
    async def create_replay(self, request: ReplayRequest):
        print(f"Creating replay for Audio ID: {request.audio_id}")
        try:
            replay_path = f"/data/replays/{request.demo_name}.dem" # TODO: replace after refactoring

            # We insert into 'replays' and link it to the 'audios' table via 'audio' FK
            query = """
                INSERT INTO replays (path, audio, demo_fetch_time)
                VALUES ($1, $2, NOW())
                RETURNING replay_id
            """ # replays table is still a WIP, cant seem to decide what structure works best
            
            async with self.db.pool.acquire() as connection:
                # Execute the query
                row = await connection.fetchrow(query, replay_path, request.audio_id)
                
            return {"status": "success", "replay_id": row['replay_id']}

        except asyncpg.UniqueViolationError:
            # duplicate handling
            raise HTTPException(status_code=400, detail="A replay already exists for this audio file.")
        except Exception as e:
            print(f"Error creating replay: {e}")
            raise HTTPException(status_code=500, detail="Database insertion failed")

# Uvicorn looks for 'app', so we instantiate the server and expose the internal FastAPI object
server = APIServer()
app = server.app