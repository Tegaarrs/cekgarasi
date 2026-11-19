import os
import socket
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
SQLITE_PATH = os.path.join(DATA_DIR, "cekgarasi.db").replace("\\", "/")

DEFAULT_MYSQL_URL = f"sqlite:///{SQLITE_PATH}"
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip() or DEFAULT_MYSQL_URL


def is_mysql_available(host="127.0.0.1", port=3306) -> bool:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        res = sock.connect_ex((host, port))
        sock.close()
        return res == 0
    except Exception:
        return False


# If MySQL configured but not accessible, fallback gracefully to SQLite
if DATABASE_URL.startswith("mysql"):
    if not is_mysql_available():
        DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_user_identity_columns():
    from sqlalchemy import text as sa_text
    columns_to_add = [
        ("nama_depan", "VARCHAR(60)"),
        ("nama_belakang", "VARCHAR(60)"),
        ("nik", "VARCHAR(20)"),
        ("jenis_kelamin", "VARCHAR(20)"),
        ("tanggal_lahir", "VARCHAR(20)"),
        ("pekerjaan", "VARCHAR(80)"),
        ("kota_domisili", "VARCHAR(80)"),
        ("alamat_lengkap", "VARCHAR(255)"),
        ("slip_gaji_nominal", "BIGINT"),
        ("slip_gaji_url", "TEXT"),
        ("slip_gaji_filename", "VARCHAR(190)"),
        ("auth_provider", "VARCHAR(30)"),
        ("otp_terakhir", "VARCHAR(10)"),
        ("otp_expires_at", "DATETIME"),
        ("terakhir_login_at", "DATETIME"),
        ("terakhir_reset_at", "DATETIME"),
        ("password_terdaftar", "VARCHAR(120)"),
    ]
    try:
        with engine.begin() as conn:
            for col_name, col_type in columns_to_add:
                try:
                    conn.execute(sa_text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass
    except Exception:
        pass


ensure_user_identity_columns()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_auth_users_synced():
    """Ensure demo accounts exist and sync any mock/missing password hashes on startup."""
    from . import auth, models
    try:
        models.Base.metadata.create_all(bind=engine)
    except Exception:
        pass
    db = SessionLocal()
    try:
        # 1. Ensure admin demo & buyer demo users exist
        demo_accounts = [
            {
                "email": "admin@cekgarasi.test",
                "nama": "Admin Dealer CekGarasi",
                "role": "admin",
                "password": "adminsecretpassword123",
            },
            {
                "email": "buyer@cekgarasi.test",
                "nama": "Pembeli Demo CekGarasi",
                "role": "pembeli",
                "password": "buyersecretpassword123",
            },
        ]
        changed = False
        for acc in demo_accounts:
            existing = db.query(models.User).filter(models.User.email == acc["email"]).first()
            if not existing:
                db.add(models.User(
                    nama=acc["nama"],
                    email=acc["email"],
                    role=acc["role"],
                    hp_terverifikasi=1,
                    is_active=1,
                    password_terdaftar=acc["password"],
                    password_hash=auth.hash_password(acc["password"]),
                ))
                changed = True

        # 2. Repair mock/empty hashes for seeded or migrated buyer rows
        users = db.query(models.User).all()
        for u in users:
            pw_plain = (u.password_terdaftar or "").strip()
            pwh = (u.password_hash or "").strip()
            is_real_bcrypt = pwh.startswith(("$2a$", "$2b$", "$2y$"))
            if not is_real_bcrypt:
                target_pw = pw_plain or "password123"
                u.password_terdaftar = target_pw
                u.password_hash = auth.hash_password(target_pw)
                changed = True

        if changed:
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

