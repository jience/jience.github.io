# Improving Latency of Database Calls in FastAPI with Asyncio, Lifespan Events, and Connection Pooling

FastAPI is renowned for its speed and efficiency, but improper database connection management can lead to performance bottlenecks. In this article, we will explore how to optimize FastAPI applications using **asyncio**, **lifespan events**, and **connection pooling** to enhance response times and scalability.

![FastAPI Performance Optimization Flow Diagram](/assets/fastapi-performance-ptimization-flow.png)

Many FastAPI applications interact with a database. Without proper connection management, each request may create a new database connection, leading to:

- **High latency** due to frequent connections.
- **Connection exhaustion** when handling multiple requests.
- **Blocking operations** reducing FastAPI’s async advantages.

## Solution: Async Database Calls & Connection Pooling

To optimize performance, we will:

- Use **asyncio** to handle asynchronous database queries.
- Implement a **connection pool** to efficiently reuse database connections.
- Utilize **lifespan events** to manage the connection pool lifecycle.

## Step 1: Async Database Connection Using `asyncpg` and Connection Pool

FastAPI supports asynchronous endpoints, but database interactions must also be async. Let’s configure an async database connection using `asyncpg` (for PostgreSQL)

```python
import os
import asyncpg
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

# Database Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'postgres'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 'DB_PORT'))
}

# Create connection pool
connection_pool = SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    **DB_CONFIG
)

# Custom Exceptions
class DatabaseConnectionError(Exception):
    """Raised when database connection fails"""
    pass

class DatabaseQueryError(Exception):
    """Raised when query execution fails"""
    pass

class DatabaseOperationError(Exception):
    """Raised for general database operations failures"""
    pass

# Global connection pool
connection_pool: Optional[asyncpg.pool.Pool] = None

# Initialize connection pool on startup
async def init_pool():
    """
    Initializes the global connection pool on application startup.

    This function creates a connection pool that allows the application to interact 
    with the database. It should be called once during the application's startup.
    """
    global connection_pool
    if connection_pool is None:
        try:
            logger.info("Initializing database connection pool...")
            connection_pool = await asyncpg.create_pool(
                min_size=0,  # Start with one connection
                max_size=10,  # Limit max connections to avoid resource exhaustion
                **DB_CONFIG
            )
            logger.info("Database connection pool initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing connection pool: {e}")
            raise DatabaseConnectionError("Failed to initialize the database connection pool.") from e
        
async def close_pool():
    """
    Closes the global connection pool on application shutdown.

    This function gracefully shuts down the connection pool and should be called
    during the application's shutdown process.
    """
    global connection_pool
    if connection_pool:
        try:
            logger.info("Closing database connection pool...")
            await connection_pool.close()
            connection_pool = None
            logger.info("Database connection pool closed successfully.")
        except Exception as e:
            logger.error(f"Error closing connection pool: {e}")
            raise DatabaseOperationError("Failed to close the database connection pool.") from e

@asynccontextmanager
async def get_db_connection():
    """
    Provides a database connection from the pool.

    This function yields a connection from the pool for database operations, ensuring
    that the connection is returned to the pool after use.

    Yields:
        asyncpg.Connection: A connection from the pool.
    """
    if connection_pool is None:
        logger.error("Connection pool is not initialized!")
        raise DatabaseConnectionError("Connection pool is not initialized.")
    
    logger.info("Acquiring database connection...")
    connection = await connection_pool.acquire()
    try:
        logger.debug("Database connection acquired.")
        yield connection
    except Exception as e:
        logger.error(f"Error during database operation: {e}")
        raise DatabaseQueryError("An error occurred during a database operation.") from e
    finally:
        await connection_pool.release(connection)
        logger.debug("Database connection released back to the pool.")
```

## Step 2: Utilizing Lifespan Events

Using FastAPI’s lifespan events ensures that:

- The **database connection pool is initialized** only once during startup.
- The **connection pool remains available** throughout the app’s lifecycle.
- All **connections are cleanly closed** when the app shuts down.

## Implementation:

Modify your `main.py` file:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    try:
        logger.info("Initializing the database connection pool.")
        await init_pool()
    except Exception as e:
        logger.error(f"Error initializing database connection pool: {str(e)}")
        raise e

    yield  # The application runs while this generator is suspended

    try:
        logger.info("Closing the database connection pool.")
        await close_pool()
    except Exception as e:
        logger.error(f"Error closing database connection pool: {str(e)}")
        raise e

# Initialize the FastAPI application
app = FastAPI(lifespan=lifespan)
```

## Step 3: Leveraging `asyncio` for Parallel Execution

To further reduce latency, we can execute independent asynchronous tasks concurrently using `asyncio.gather`.

```python
import asyncio
from fastapi import FastAPI

app = FastAPI()

async def fetch_data():
    """Simulates an asynchronous database call."""
    await asyncio.sleep(2)  # Simulating delay
    return {"data": "Fetched from DB"}

async def call_external_api():
    """Simulates an asynchronous API request."""
    await asyncio.sleep(3)  # Simulating delay
    return {"response": "External API response"}

@app.get("/parallel-tasks")
async def parallel_tasks():
    """Runs independent tasks concurrently."""
    db_task = fetch_data()
    api_task = call_external_api()
    
    # Run both tasks concurrently
    db_result, api_result = await asyncio.gather(db_task, api_task)

    return {"db_result": db_result, "api_result": api_result}
```

## Explanation:

- `fetch_data()` and `call_external_api()` simulate independent async functions.
- `asyncio.gather(db_task, api_task)` runs both functions **in parallel** instead of sequentially.
- The response contains results from both functions, but they execute concurrently, **reducing overall latency**.

## Conclusion

By implementing **async database queries, connection pooling, and FastAPI lifespan events**, we can significantly improve database interaction efficiency in FastAPI applications. These optimizations:

- Reduce **connection overhead** by reusing existing connections.
- Minimize **latency** by handling tasks asynchronously.
- Ensure **proper connection management** throughout the app’s lifecycle.

These strategies make FastAPI applications more **scalable, efficient, and performant**, ensuring they handle increased workloads with minimal resource consumption