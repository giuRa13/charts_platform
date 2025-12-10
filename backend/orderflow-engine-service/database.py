import os 
import psycopg2
from psycopg2 import pool 

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "orderflow_db")

db_pool = None

def init_db_pool():
    global db_pool
    if db_pool:
        return # Already initialized
    # Create a Threaded Connection Pool (Better for high concurrency)
    try:
        db_pool = psycopg2.pool.ThreadedConnectionPool(
            1, 20,
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
        print("DB Pool Created")
    except Exception as e:
        print(f"DB Connection Error: {e}")
        db_pool = None

# Gets a connection from the pool. 
# If pool is not ready, it tries to initialize it.
def get_db_connection():
    global db_pool
    
    # 1. Lazy Load: If pool doesn't exist, try to create it now
    if db_pool is None:
        init_db_pool()
    # 2. Check again
    if db_pool:
        return db_pool.getconn()
    else:
        # If it still fails, raise error so the caller knows to retry later
        raise Exception("DB Pool is not initialized (Database might be down)")

def release_db_connection(conn):
    if db_pool and conn:
        try:
            db_pool.putconn(conn) # put away or return a connection to the pool
        except Exception as e:
            print(f"⚠️ Error releasing connection: {e}")
        