"""Database engine adapters for the DBaaS layer.

Replaces the original project's ``docker exec`` + shell-script-and-status-code
parsing with native admin connections (pymysql / pymongo). Identifiers are
strictly validated (so they can be safely interpolated where SQL/Mongo can't
parameterize them) and secrets are passed as bound parameters.

Adapter functions are synchronous; the async service calls them via
``asyncio.to_thread``.
"""

from __future__ import annotations

import contextlib
import re
from dataclasses import dataclass
from enum import StrEnum

import pymongo
import pymysql

from app.core.config import settings
from app.core.exceptions import AppError, ValidationError

# db/user identifiers: must double as a MySQL username (<=32 chars), so keep tight.
IDENTIFIER_RE = re.compile(r"^[a-z][a-z0-9_]{0,31}$")


class DatabaseEngine(StrEnum):
    MYSQL = "mysql"
    MARIADB = "mariadb"
    MONGODB = "mongodb"


class EngineError(AppError):
    status_code = 502
    message = "Database engine error"


@dataclass(frozen=True)
class EngineSpec:
    engine: DatabaseEngine
    kind: str  # "mysql" | "mongo"
    internal_host: str  # how the API/worker reaches it (management)
    internal_port: int
    public_host: str  # what users put in their connection string
    public_port: int
    admin_user: str
    admin_password: str


def _registry() -> dict[DatabaseEngine, EngineSpec]:
    pub = settings.dbaas_public_host
    return {
        DatabaseEngine.MYSQL: EngineSpec(
            DatabaseEngine.MYSQL,
            "mysql",
            "mysql",
            3306,
            pub,
            3306,
            settings.dbaas_sql_admin_user,
            settings.dbaas_sql_admin_password,
        ),
        DatabaseEngine.MARIADB: EngineSpec(
            DatabaseEngine.MARIADB,
            "mysql",
            "mariadb",
            3306,
            pub,
            3307,
            settings.dbaas_sql_admin_user,
            settings.dbaas_sql_admin_password,
        ),
        DatabaseEngine.MONGODB: EngineSpec(
            DatabaseEngine.MONGODB,
            "mongo",
            "mongodb-dbaas",
            27017,
            pub,
            27018,
            settings.mongo_dbaas_root_user,
            settings.mongo_dbaas_root_password,
        ),
    }


def enabled_engines() -> list[DatabaseEngine]:
    reg = _registry()
    return [e for e in reg if e.value in settings.dbaas_engines_enabled]


def get_spec(engine: DatabaseEngine) -> EngineSpec:
    if engine.value not in settings.dbaas_engines_enabled:
        raise ValidationError(f"Engine '{engine.value}' is not enabled")
    return _registry()[engine]


def validate_identifier(name: str) -> None:
    if not IDENTIFIER_RE.match(name):
        raise ValidationError(
            "Name must start with a letter and contain only lowercase letters, "
            "digits and underscores (max 32 chars)"
        )


# --- MySQL / MariaDB (pymysql) ---
def _mysql_conn(spec: EngineSpec) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=spec.internal_host,
        port=spec.internal_port,
        user=spec.admin_user,
        password=spec.admin_password,
        autocommit=True,
        connect_timeout=10,
    )


def _mysql_create(spec: EngineSpec, db_name: str, username: str, password: str) -> None:
    # db_name/username are validated identifiers; password is a bound parameter.
    conn = _mysql_conn(spec)
    try:
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
            cur.execute(
                f"CREATE USER IF NOT EXISTS '{username}'@'%%' IDENTIFIED BY %s", (password,)
            )
            cur.execute(f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{username}'@'%'")
            cur.execute("FLUSH PRIVILEGES")
    finally:
        conn.close()


def _mysql_drop(spec: EngineSpec, db_name: str, username: str) -> None:
    conn = _mysql_conn(spec)
    try:
        with conn.cursor() as cur:
            cur.execute(f"DROP DATABASE IF EXISTS `{db_name}`")
            cur.execute(f"DROP USER IF EXISTS '{username}'@'%'")
            cur.execute("FLUSH PRIVILEGES")
    finally:
        conn.close()


# --- MongoDB (pymongo) ---
def _mongo_client(spec: EngineSpec) -> pymongo.MongoClient:
    return pymongo.MongoClient(
        host=spec.internal_host,
        port=spec.internal_port,
        username=spec.admin_user,
        password=spec.admin_password,
        authSource="admin",
        serverSelectionTimeoutMS=10000,
    )


def _mongo_create(spec: EngineSpec, db_name: str, username: str, password: str) -> None:
    client = _mongo_client(spec)
    try:
        db = client[db_name]
        db.command(
            "createUser", username, pwd=password, roles=[{"role": "readWrite", "db": db_name}]
        )
        db.create_collection("_init")  # materialize the database
    finally:
        client.close()


def _mongo_drop(spec: EngineSpec, db_name: str, username: str) -> None:
    client = _mongo_client(spec)
    try:
        with contextlib.suppress(pymongo.errors.OperationFailure):
            client[db_name].command("dropUser", username)  # user may already be gone
        client.drop_database(db_name)
    finally:
        client.close()


# --- dispatch ---
def create_database(spec: EngineSpec, db_name: str, username: str, password: str) -> None:
    try:
        if spec.kind == "mysql":
            _mysql_create(spec, db_name, username, password)
        else:
            _mongo_create(spec, db_name, username, password)
    except (pymysql.MySQLError, pymongo.errors.PyMongoError) as exc:
        raise EngineError(f"Failed to create database: {exc}") from exc


def drop_database(spec: EngineSpec, db_name: str, username: str) -> None:
    try:
        if spec.kind == "mysql":
            _mysql_drop(spec, db_name, username)
        else:
            _mongo_drop(spec, db_name, username)
    except (pymysql.MySQLError, pymongo.errors.PyMongoError) as exc:
        raise EngineError(f"Failed to drop database: {exc}") from exc
