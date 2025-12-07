import os
import asyncpg
import asyncssh # type: ignore # not sure why this says it cant find it even though its in here
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi.responses import FileResponse

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
        print("Connecting to Database...")
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
        self.app.get("/api/replays/{replay_id}")(self.get_replay_details)
        self.app.get("/api/audio/{audio_id}/stream")(self.stream_audio)

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
            query = "SELECT replay_id, audio, demo_fetch_time FROM replays ORDER BY demo_fetch_time DESC"
            return await self.db.fetch_all(query)
        except Exception as e:
            print(f"Error fetching replays: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    async def get_replay_details(self, replay_id: int):
        print(f"Fetching details for Replay ID: {replay_id}") # DEBUG 1
        try:
            # 'audio' column in replays links to 'audio_id' in audios
            query = """
                SELECT r.replay_id, r.demo_fetch_time, r.path as demo_path, 
                       a.audio_id, a.path as audio_path, a.file_ext
                FROM replays r
                JOIN audios a ON r.audio = a.audio_id
                WHERE r.replay_id = $1
            """
            row = await self.db.pool.fetchrow(query, replay_id)
            
            if not row:
                print(f"Replay ID {replay_id} not found or has no linked Audio!") # DEBUG 2
                raise HTTPException(status_code=404, detail="Replay not found")
            
            print(f"Found Replay. Linked Audio ID: {row['audio_id']}") # DEBUG 3
            return dict(row)
        except Exception as e:
            print(f"Error fetching replay details: {e}")
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
          
    async def stream_audio(self, audio_id: int):
        print(f"Requesting Audio ID: {audio_id}")
        try:
            query = "SELECT path FROM audios WHERE audio_id = $1"
            row = await self.db.pool.fetchrow(query, audio_id)
            
            if not row:
                raise HTTPException(status_code=404, detail="Audio record not found")
            
            # The path stored in DB (e.g. /home/aaron/scpfiles/...)
            original_path = row['path']
            filename = os.path.basename(original_path)
            
            # dump it in a 'cache' folder
            local_cache_dir = Path(__file__).parent / "audio_cache"
            local_cache_dir.mkdir(exist_ok=True) # Ensure folder exists
            
            local_file_path = local_cache_dir / filename

            if os.path.exists(local_file_path):
                print(f"Cache Hit: Serving local copy from {local_file_path}")
                return FileResponse(local_file_path, media_type="audio/mpeg")

            print(f"Cache Miss: Fetching from remote machine...")
            
            try:
                async with asyncssh.connect(
                    os.getenv("REMOTE_AUDIO_HOST"), 
                    username=os.getenv("REMOTE_AUDIO_USER"),
                    password=os.getenv("REMOTE_AUDIO_PASS"),
                    known_hosts=None # TODO: replace
                ) as conn:
                    async with conn.start_sftp_client() as sftp:
                        await sftp.get(original_path, local_file_path)
                        print("Download complete.")

            except Exception as e:
                print(f"SFTP Failed: {e}")
                raise HTTPException(status_code=502, detail="Failed to fetch file from remote server")

            return FileResponse(local_file_path, media_type="audio/mpeg")
            
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error streaming audio: {e}")
            raise HTTPException(status_code=500, detail="Server error")

# Uvicorn looks for 'app', so we instantiate the server and expose the internal FastAPI object
server = APIServer()
app = server.app