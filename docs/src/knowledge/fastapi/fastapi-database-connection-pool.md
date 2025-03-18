# Fastapi Database Connection Pool

Learn how to efficiently manage database connections in Fastapi using connection pools for optimal performance.

## Setting Up FastAPI with SQLAlchemy Connection Pool


To set up a FastAPI application with SQLAlchemy and utilize a database connection pool effectively, follow these steps:

## Install Required Packages

Ensure you have the necessary packages installed. You can do this using pip:

```bash
pip install fastapi[all] sqlalchemy
```

## Create Database Models

Define your database models using SQLAlchemy. Here’s an example of a simple User model:

```python
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
```

## Configure the Database Connection

Set up the database connection using SQLAlchemy’s `create_engine` function. Here’s how to configure a connection pool:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
```

## Dependency Injection

Utilize FastAPI’s dependency injection system to manage database sessions. This ensures that each request gets its own session:

```python
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Create API Endpoints

Now, you can create API endpoints that interact with the database. Here’s an example of a simple endpoint to create a user:

```python
@app.post("/users/")
def create_user(user: User, db: Session = Depends(get_db)):
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

## Connection Pooling

SQLAlchemy handles connection pooling automatically. You can configure the pool size and other parameters in the `create_engine` function. For example:

```python
engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)
```

This configuration allows for efficient management of database connections, ensuring that your FastAPI application can handle multiple requests without overwhelming the database.

## Conclusion

By following these steps, you can set up a FastAPI application with SQLAlchemy and a connection pool, allowing for efficient database interactions. For more detailed information, refer to the official SQLAlchemy documentation at [SQLAlchemy Documentation](https://www.sqlalchemy.org/).

## Creating Database Models with SQLAlchemy


To create database models using SQLAlchemy in a FastAPI application, you start by defining your models based on the `Base` class. This class serves as a foundation for your SQLAlchemy models, allowing you to create structured representations of your database tables.

## Defining the Base Class

First, ensure you have imported the `Base` class from your `database.py` file. This class is essential as it provides the necessary functionality for your models to interact with the database.

```python
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()
```

## Creating SQLAlchemy Models

Next, you will create classes that inherit from the `Base` class. Each class corresponds to a table in your database. The `__tablename__` attribute specifies the name of the table associated with the model. For example:

```python
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
```

## Defining Model Attributes

Each attribute in your model class represents a column in the corresponding database table. You will use the `Column` class from SQLAlchemy to define these attributes, specifying the type of data each column will hold. Common types include `Integer`, `String`, and `Boolean`.

```python
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
```

## Database Migrations

For managing changes to your database schema, you can use Alembic, a lightweight database migration tool for use with SQLAlchemy. This allows you to apply migrations without needing to install FastAPI or Pydantic. You can create migration scripts that automatically update your database schema to reflect changes in your models.

To set up Alembic, you would typically run:

```bash
alembic init alembic
```

This command creates a directory structure for your migrations. You can then generate migration scripts using:

```bash
alembic revision --autogenerate -m "Initial migration"
```

## FastAPI Database Connection Pool

When integrating SQLAlchemy with FastAPI, it's important to manage your database connections efficiently. FastAPI supports a database connection pool, which allows you to reuse connections and improve performance. You can configure the connection pool in your database setup, ensuring that your application can handle multiple requests without exhausting database resources.

For example, you can set up a connection pool using SQLAlchemy's `create_engine` function:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

This setup allows you to create a new session for each request, ensuring that your application can handle concurrent database operations efficiently.


## Handling Database Sessions in FastAPI

To effectively manage database sessions in FastAPI, it is crucial to create a new database session for each request. This ensures that each request operates independently, preventing potential conflicts and ensuring data integrity. The following sections will detail how to implement this using SQLAlchemy's `SessionLocal` class.

## Creating a Dependency for Database Sessions

Using FastAPI's dependency injection system, we can create a dependency that establishes a new database session for each request. This is done using the `yield` statement, which allows us to manage the lifecycle of the session effectively.

### Example Implementation

Here’s how you can set up a dependency for your FastAPI application:

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency
async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

In this code snippet, we define a `get_db` function that creates a new session and yields it. The session is closed automatically after the request is completed, ensuring that resources are properly released.

## Using the Dependency in Path Operations

To utilize the database session in your path operations, you can simply add the `get_db` dependency to your route handlers. Here’s an example:

```python
from fastapi import FastAPI, Depends

app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id: int, db: Session = Depends(get_db)):
    # Your logic to retrieve the item from the database
    pass
```

In this example, the `db` parameter in the `read_item` function will automatically receive a new database session for each request.

## Handling Background Tasks

When working with background tasks, it’s important to create a new session within the task itself. This prevents issues that may arise from using a session that is tied to the request lifecycle. Instead of passing the database object to the background task, pass the ID of the object and retrieve it within the task:

```python
from fastapi import BackgroundTasks

async def background_task(item_id: int, db: Session):
    # Logic to process the item using the database session
    pass

@app.post("/items/{item_id}/process")
async def process_item(item_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    background_tasks.add_task(background_task, item_id, db)
    return {"message": "Item is being processed"}
```

In this setup, the `background_task` function receives a new session, ensuring that it operates independently of the request's session.

## Conclusion

By following these practices, you can effectively manage database sessions in FastAPI, ensuring that each request has its own session and that background tasks operate without interference. This approach not only enhances performance but also maintains the integrity of your application’s data.