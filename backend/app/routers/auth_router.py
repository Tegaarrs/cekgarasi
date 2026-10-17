from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["Autentikasi"])


@router.post("/daftar", response_model=schemas.Token)
@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar. Silakan masuk menggunakan email tersebut."
        )

    # Password strength check
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kata sandi harus minimal 6 karakter."
        )

    phone = (user_in.no_hp or user_in.no_telepon or "").strip() or None
    new_user = models.User(
        nama=user_in.nama.strip(),
        email=user_in.email.strip().lower(),
        no_hp=phone,
        password_hash=auth.hash_password(user_in.password),
        role="pembeli",
        hp_terverifikasi=0,
        is_active=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = auth.create_access_token({"sub": str(new_user.id), "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post("/masuk", response_model=schemas.Token)
@router.post("/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    clean_email = (login_in.email or "").strip().lower()
    user = db.query(models.User).filter(models.User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi tidak cocok."
        )

    # Check password with hash or fallback for default demo accounts
    is_valid = auth.verify_password(login_in.password, user.password_hash or "")
    if not is_valid:
        if clean_email in ("admin@cekgarasi.test", "buyer@cekgarasi.test") and login_in.password in ("password123", "adminsecretpassword123", "buyersecretpassword123"):
            is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi tidak cocok."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun ini telah dinonaktifkan."
        )

    token = auth.create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/verifikasi-otp")
@router.post("/verify-otp")
def verify_otp(otp_in: schemas.VerifyOtp, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Accepts demo OTP "123456" as specified
    if otp_in.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP tidak valid. Gunakan kode: 123456"
        )

    phone = (otp_in.no_hp or otp_in.no_telepon or "").strip()
    if phone:
        current_user.no_hp = phone
    current_user.hp_terverifikasi = 1
    db.commit()
    return {"status": "success", "message": "Nomor HP berhasil diverifikasi."}


@router.post("/google", response_model=schemas.Token)
def google_login(login_in: schemas.GoogleLogin, db: Session = Depends(get_db)):
    # Demo Google OAuth handler
    demo_email = "google_user@cekgarasi.test"
    user = db.query(models.User).filter(models.User.email == demo_email).first()
    if not user:
        user = models.User(
            nama="Pengguna Google Demo",
            email=demo_email,
            role="pembeli",
            hp_terverifikasi=1,
            firebase_uid=f"g_{login_in.id_token[:10]}",
            is_active=1
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/saya", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
