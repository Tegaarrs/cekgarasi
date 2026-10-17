import re
import csv
import io
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect

from ..db import get_db, engine
from .. import models, auth

router = APIRouter(prefix="/api/database", tags=["Web Database Explorer"])


class SQLQueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 100


ALLOWED_TABLES = [
    "segments",
    "brands",
    "car_models",
    "features",
    "users",
    "cars",
    "car_features",
    "favorites",
    "view_history",
    "test_drives",
    "ml_evaluasi_k",
    "ml_metrik"
]


@router.get("/info")
def get_database_info(db: Session = Depends(get_db)):
    dialect_name = engine.dialect.name
    inspector = inspect(engine)
    all_table_names = [t for t in inspector.get_table_names() if not t.startswith("alembic_")]

    total_records = 0
    for tbl in all_table_names:
        try:
            cnt = db.execute(text(f"SELECT COUNT(*) FROM `{tbl}`")).scalar() or 0
            total_records += cnt
        except Exception:
            pass

    return {
        "status": "connected",
        "dialect": dialect_name.upper(),
        "database_name": engine.url.database or "cekgarasi",
        "total_tables": len(all_table_names),
        "total_records": total_records,
        "is_production": False,
        "engine_url": str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url)
    }


@router.get("/tables")
def list_tables(db: Session = Depends(get_db)):
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    tables = []
    for tbl in table_names:
        if tbl.startswith("alembic_"):
            continue

        try:
            count = db.execute(text(f"SELECT COUNT(*) FROM `{tbl}`")).scalar() or 0
        except Exception:
            count = 0

        columns = []
        for col in inspector.get_columns(tbl):
            columns.append({
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
                "primary_key": bool(col.get("primary_key", False))
            })

        tables.append({
            "table_name": tbl,
            "row_count": count,
            "column_count": len(columns),
            "columns": columns
        })

    return sorted(tables, key=lambda x: x["table_name"])


@router.get("/tables/{table_name}")
def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    clean_table = re.sub(r"[^a-zA-Z0-9_]", "", table_name)
    inspector = inspect(engine)
    if clean_table not in inspector.get_table_names():
        raise HTTPException(status_code=404, detail=f"Tabel '{clean_table}' tidak ditemukan di database.")

    columns = [col["name"] for col in inspector.get_columns(clean_table)]

    # Count total rows
    count_sql = f"SELECT COUNT(*) FROM `{clean_table}`"
    params: Dict[str, Any] = {}

    where_clauses = []
    if q and q.strip():
        # Search text/varchar columns
        search_terms = []
        for col_name in columns:
            search_terms.append(f"CAST(`{col_name}` AS TEXT) LIKE :search_query")
        if search_terms:
            where_clauses.append(f"({' OR '.join(search_terms)})")
            params["search_query"] = f"%{q.strip()}%"

    where_sql = f" WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    total_count = db.execute(text(f"{count_sql}{where_sql}"), params).scalar() or 0

    # Build select query
    order_sql = ""
    if sort_by and sort_by in columns:
        direction = "DESC" if str(sort_dir).lower() == "desc" else "ASC"
        order_sql = f" ORDER BY `{sort_by}` {direction}"
    elif "id" in columns:
        order_sql = " ORDER BY `id` ASC"

    offset = (page - 1) * limit
    select_sql = f"SELECT * FROM `{clean_table}`{where_sql}{order_sql} LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset

    result = db.execute(text(select_sql), params)
    rows = []
    for r in result.mappings():
        row_dict = {}
        for k, v in r.items():
            if isinstance(v, (time.struct_time,)):
                row_dict[k] = str(v)
            else:
                row_dict[k] = v
        rows.append(row_dict)

    import math
    return {
        "table_name": clean_table,
        "columns": columns,
        "rows": rows,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total_count / limit) if total_count > 0 else 1
    }


@router.post("/query")
def execute_sql_query(
    payload: SQLQueryRequest,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    query_str = payload.query.strip()

    # Safety check: only allow SELECT queries for the web database viewer
    clean_check = query_str.lstrip(" \t\n\r;(").upper()
    if not clean_check.startswith("SELECT") and not clean_check.startswith("SHOW") and not clean_check.startswith("EXPLAIN") and not clean_check.startswith("PRAGMA"):
        raise HTTPException(
            status_code=400,
            detail="Demi keamanan data, hanya query baca (SELECT / SHOW / EXPLAIN / PRAGMA) yang diizinkan melalui Web SQL Console."
        )

    # Disallow destructive statements inside query
    forbidden = ["DROP", "DELETE", "TRUNCATE", "UPDATE", "INSERT", "ALTER", "REPLACE"]
    for word in forbidden:
        if re.search(r"\b" + word + r"\b", query_str, re.IGNORECASE):
            raise HTTPException(
                status_code=400,
                detail=f"Operasi manipulasi data '{word}' tidak diizinkan di Web SQL Console."
            )

    start_time = time.time()
    try:
        result = db.execute(text(query_str))
        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        if result.returns_rows:
            columns = list(result.keys())
            rows = [dict(r) for r in result.mappings().fetchmany(payload.limit or 100)]
            return {
                "status": "success",
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
                "elapsed_ms": elapsed_ms
            }
        else:
            return {
                "status": "success",
                "message": "Query berhasil dieksekusi.",
                "elapsed_ms": elapsed_ms
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error saat mengeksekusi SQL: {str(e)}")


@router.get("/export/{table_name}")
def export_table(
    table_name: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db)
):
    clean_table = re.sub(r"[^a-zA-Z0-9_]", "", table_name)
    inspector = inspect(engine)
    if clean_table not in inspector.get_table_names():
        raise HTTPException(status_code=404, detail="Tabel tidak ditemukan.")

    result = db.execute(text(f"SELECT * FROM `{clean_table}`"))
    rows = [dict(r) for r in result.mappings().fetchall()]

    if format == "csv":
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={clean_table}.csv"}
        )

    return rows
