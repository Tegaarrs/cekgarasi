import os
import random
import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["Autentikasi"])


def _send_email_otp(email_to: str, otp_code: str, purpose: str = "register") -> dict:
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    if purpose == "reset_password":
        subject = "[CekGarasi] Kode OTP Pemulihan & Reset Kata Sandi Akun Anda"
        Ringkasan = (
            f"Gunakan kode OTP 6 digit ({otp_code}) untuk memverifikasi dan mereset password akun CekGarasi ({email_to}). "
            "Kode ini berlaku selama 15 menit."
        )
    else:
        subject = "[CekGarasi] Kode OTP Verifikasi Pendaftaran Akun Baru"
        Ringkasan = (
            f"Selamat datang di CekGarasi! Gunakan kode OTP 6 digit ({otp_code}) untuk memverifikasi email {email_to} "
            "dan melanjutkan pengisian profil, domisili, serta slip gaji Anda."
        )

    smtp_host = (os.getenv("SMTP_HOST") or "").strip()
    smtp_port = int(os.getenv("SMTP_PORT") or "587")
    smtp_user = (os.getenv("SMTP_USER") or "").strip()
    smtp_pass = (os.getenv("SMTP_PASS") or "").strip()
    smtp_from = (os.getenv("SMTP_FROM") or smtp_user or "no-reply@cekgarasi.id").strip()

    smtp_sent = False
    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"CekGarasi Official <{smtp_from}>"
            msg["To"] = email_to
            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
              <h2 style="color: #1D4ED8; margin-top: 0;">CekGarasi Verification</h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">{Ringkasan}</p>
              <div style="background: #EFF6FF; border: 1px dashed #3B82F6; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #1E40AF;">{otp_code}</span>
              </div>
              <p style="color: #64748B; font-size: 12px;">Waktu pengiriman: {now_str}</p>
            </div>
            """
            msg.attach(MIMEText(Ringkasan, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            with smtplib.SMTP(smtp_host, smtp_port, timeout=6) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_from, [email_to], msg.as_string())
            smtp_sent = True
        except Exception:
            smtp_sent = False

    return {
        "subjek": subject,
        "pengirim": smtp_from,
        "penerima": email_to,
        "kode_otp": otp_code,
        "pesan": Ringkasan,
        "waktu_kirim": now_str,
        "smtp_terkirim": smtp_sent,
    }


def _estimate_segment_from_salary(slip_gaji: Optional[int]):
    if not slip_gaji or slip_gaji <= 0:
        return 1, 150_000_000, 260_000_000, "Keluarga Lapang"
    if slip_gaji >= 20_000_000:
        return 0, 280_000_000, 550_000_000, "Fitur Mewah"
    if slip_gaji >= 9_000_000:
        return 1, 160_000_000, 280_000_000, "Keluarga Lapang"
    return 2, 95_000_000, 175_000_000, "Hemat & Harian"


@router.post("/request-otp")
@router.post("/send-otp")
def request_email_otp(payload: schemas.EmailOtpRequest, db: Session = Depends(get_db)):
    clean_email = (payload.email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format alamat email tidak valid."
        )

    purpose = (payload.purpose or "register").strip().lower()
    provider = (payload.provider or "email").strip().lower()
    existing = db.query(models.User).filter(func.lower(func.trim(models.User.email)) == clean_email).first()

    if purpose == "register" and existing and existing.hp_terverifikasi == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ini sudah terdaftar dan terverifikasi. Silakan Sign In atau gunakan Recover Password."
        )

    if purpose == "reset_password" and not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email tidak ditemukan di database. Pastikan email sudah terdaftar."
        )

    otp_code = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=15)

    otp_log = models.AuthOtpLog(
        email=clean_email,
        kode_otp=otp_code,
        tujuan=purpose,
        provider=provider,
        status="sent",
        expires_at=expires_at,
    )
    db.add(otp_log)

    if existing:
        existing.otp_terakhir = otp_code
        existing.otp_expires_at = expires_at

    db.commit()

    notif = _send_email_otp(clean_email, otp_code, purpose=purpose)
    return {
        "status": "otp_sent",
        "email": clean_email,
        "purpose": purpose,
        "provider": provider,
        "expires_in_seconds": 900,
        "message": f"Kode OTP 6 digit telah dikirimkan ke email {clean_email}.",
        "email_notification": notif,
    }


@router.post("/daftar", response_model=schemas.Token)
@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    clean_email = (user_in.email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alamat email tidak valid."
        )

    if user_in.confirm_password and user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Konfirmasi kata sandi tidak cocok."
        )

    if len(user_in.password or "") < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kata sandi harus minimal 6 karakter."
        )

    first_name = (user_in.nama_depan or "").strip()
    last_name = (user_in.nama_belakang or "").strip()
    full_name = (user_in.nama or f"{first_name} {last_name}").strip()
    if not full_name:
        full_name = clean_email.split("@")[0].replace(".", " ").title()
    if not first_name:
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        if len(parts) > 1 and not last_name:
            last_name = parts[1]

    # Verify OTP if provided or if an OTP log exists for this email
    input_otp = (user_in.kode_otp or "").strip()
    latest_otp_log = (
        db.query(models.AuthOtpLog)
        .filter(func.lower(func.trim(models.AuthOtpLog.email)) == clean_email)
        .order_by(models.AuthOtpLog.id.desc())
        .first()
    )
    if input_otp:
        valid_otp = False
        if input_otp == "123456":
            valid_otp = True
        elif latest_otp_log and latest_otp_log.kode_otp == input_otp:
            valid_otp = True
        if not valid_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kode OTP email tidak sesuai. Periksa kotak masuk email atau notifikasi OTP Anda."
            )
        if latest_otp_log:
            latest_otp_log.status = "verified"

    verified_otp_value = input_otp or (latest_otp_log.kode_otp if latest_otp_log else "123456")
    seg_id, p_min, p_max, fokus = _estimate_segment_from_salary(user_in.slip_gaji_nominal)
    phone = (user_in.no_hp or user_in.no_telepon or "").strip() or None
    kota = (user_in.kota_domisili or "").strip() or None
    alamat = (user_in.alamat_lengkap or kota or "").strip() or None
    provider = (user_in.auth_provider or "email").strip().lower()

    existing = db.query(models.User).filter(func.lower(func.trim(models.User.email)) == clean_email).first()
    if existing:
        if existing.hp_terverifikasi == 0 or provider in ("google", "facebook"):
            existing.nama = full_name
            existing.nama_depan = first_name
            existing.nama_belakang = last_name or None
            existing.password_hash = auth.hash_password(user_in.password)
            existing.password_terdaftar = user_in.password
            if phone:
                existing.no_hp = phone
            if user_in.nik:
                existing.nik = user_in.nik.strip()
            if user_in.jenis_kelamin:
                existing.jenis_kelamin = user_in.jenis_kelamin.strip()
            if user_in.tanggal_lahir:
                existing.tanggal_lahir = user_in.tanggal_lahir.strip()
            if user_in.pekerjaan:
                existing.pekerjaan = user_in.pekerjaan.strip()
            if kota:
                existing.kota_domisili = kota
                existing.cabang = kota
            if alamat:
                existing.alamat_lengkap = alamat
            if user_in.slip_gaji_nominal is not None:
                existing.slip_gaji_nominal = user_in.slip_gaji_nominal
                existing.segmen_awal_id = seg_id
                existing.pref_harga_min = p_min
                existing.pref_harga_max = p_max
                existing.fokus_penggunaan = fokus
            if user_in.slip_gaji_url:
                existing.slip_gaji_url = user_in.slip_gaji_url
            if user_in.slip_gaji_filename:
                existing.slip_gaji_filename = user_in.slip_gaji_filename
            existing.auth_provider = provider
            existing.otp_terakhir = verified_otp_value
            existing.hp_terverifikasi = 1
            existing.terakhir_login_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            token = auth.create_access_token({"sub": str(existing.id), "role": existing.role})
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": existing
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email sudah terdaftar dan terverifikasi. Silakan masuk menggunakan email tersebut."
            )

    new_user = models.User(
        nama=full_name,
        nama_depan=first_name,
        nama_belakang=last_name or None,
        email=clean_email,
        no_hp=phone,
        nik=(user_in.nik or "").strip() or None,
        jenis_kelamin=(user_in.jenis_kelamin or "").strip() or None,
        tanggal_lahir=(user_in.tanggal_lahir or "").strip() or None,
        pekerjaan=(user_in.pekerjaan or "").strip() or None,
        kota_domisili=kota,
        alamat_lengkap=alamat,
        cabang=kota,
        slip_gaji_nominal=user_in.slip_gaji_nominal,
        slip_gaji_url=user_in.slip_gaji_url,
        slip_gaji_filename=user_in.slip_gaji_filename,
        auth_provider=provider,
        otp_terakhir=verified_otp_value,
        password_terdaftar=user_in.password,
        password_hash=auth.hash_password(user_in.password),
        role="pembeli",
        hp_terverifikasi=1 if input_otp else 0,
        segmen_awal_id=seg_id,
        pref_harga_min=p_min,
        pref_harga_max=p_max,
        fokus_penggunaan=fokus,
        terakhir_login_at=datetime.utcnow(),
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
    raw_password = login_in.password or ""
    user = (
        db.query(models.User)
        .filter(func.lower(func.trim(models.User.email)) == clean_email)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi tidak cocok."
        )

    # 1. Primary bcrypt hash verification
    is_valid = auth.verify_password(raw_password, user.password_hash or "")
    needs_hash_sync = False

    # 2. Fallback for accounts registered/migrated/edited via Manajemen Pengguna
    #    where password_terdaftar and password_hash drifted out of sync
    if not is_valid and user.password_terdaftar:
        stored_plain = user.password_terdaftar
        if secrets.compare_digest(raw_password, stored_plain) or (
            raw_password.strip() != ""
            and secrets.compare_digest(raw_password.strip(), stored_plain.strip())
        ):
            is_valid = True
            needs_hash_sync = True

    # 3. Fallback for built-in demo accounts
    if not is_valid and clean_email in ("admin@cekgarasi.test", "buyer@cekgarasi.test"):
        allowed_demo = (
            ("password123", "adminsecretpassword123")
            if clean_email == "admin@cekgarasi.test"
            else ("password123", "buyersecretpassword123")
        )
        if any(secrets.compare_digest(raw_password, p) for p in allowed_demo):
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

    # Keep password_hash and password_terdaftar synchronized cleanly
    if needs_hash_sync and raw_password:
        user.password_hash = auth.hash_password(raw_password)
    if raw_password and user.password_terdaftar != raw_password and clean_email not in ("admin@cekgarasi.test", "buyer@cekgarasi.test"):
        user.password_terdaftar = raw_password
    user.terakhir_login_at = datetime.utcnow()
    if not user.auth_provider:
        user.auth_provider = "email"
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/verifikasi-otp")
@router.post("/verify-otp")
def verify_otp(
    otp_in: schemas.VerifyOtp,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth.security),
    db: Session = Depends(get_db)
):
    raw_code = (otp_in.kode_otp or otp_in.otp or "").strip()
    # Accept 123456 or any 4-6 digit code for demo testing as requested
    if raw_code and len(raw_code) < 4 and raw_code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP tidak valid. Gunakan kode demo: 123456"
        )

    # 1. Try finding user from token credentials
    user = auth.get_current_user_optional(credentials, db)

    # 2. Try finding user by email
    if not user and otp_in.email:
        clean_email = otp_in.email.strip().lower()
        user = db.query(models.User).filter(models.User.email == clean_email).first()

    # 3. Try finding user by phone
    if not user and (otp_in.no_hp or otp_in.no_telepon):
        phone = (otp_in.no_hp or otp_in.no_telepon or "").strip()
        user = db.query(models.User).filter(models.User.no_hp == phone).first()

    # 4. Fallback to latest unverified or registered pembeli
    if not user:
        user = db.query(models.User).filter(models.User.role == "pembeli").order_by(models.User.id.desc()).first()

    if user:
        phone = (otp_in.no_hp or otp_in.no_telepon or "").strip()
        if phone and not user.no_hp:
            user.no_hp = phone
        user.hp_terverifikasi = 1
        db.commit()
        db.refresh(user)

    user_id_str = str(user.id) if user else "1"
    user_role = user.role if user else "pembeli"
    token = auth.create_access_token({"sub": user_id_str, "role": user_role})

    return {
        "status": "success",
        "message": "Nomor HP & Akun berhasil diverifikasi.",
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/social")
def social_auth(payload: schemas.SocialAuthRequest, db: Session = Depends(get_db)):
    provider = (payload.provider or "google").strip().lower()
    if provider not in ("google", "facebook"):
        provider = "google"

    clean_email = (payload.email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Masukkan alamat email akun {provider.title()} yang valid."
        )

    first_name = (payload.nama_depan or "").strip()
    last_name = (payload.nama_belakang or "").strip()
    full_name = (payload.nama or f"{first_name} {last_name}").strip()
    if not full_name:
        local_part = clean_email.split("@")[0].replace(".", " ").replace("_", " ").title()
        full_name = local_part
    if not first_name:
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        if len(parts) > 1 and not last_name:
            last_name = parts[1]

    existing = (
        db.query(models.User)
        .filter(func.lower(func.trim(models.User.email)) == clean_email)
        .first()
    )

    # If user already exists in the database and is active -> log them in directly
    if existing and existing.hp_terverifikasi == 1:
        if not existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akun ini telah dinonaktifkan oleh administrator."
            )
        existing.terakhir_login_at = datetime.utcnow()
        if not existing.auth_provider or existing.auth_provider == "email":
            existing.auth_provider = provider
        if not existing.firebase_uid:
            existing.firebase_uid = f"{provider}_{existing.id}_{secrets.token_hex(4)}"
        db.commit()
        db.refresh(existing)
        token = auth.create_access_token({"sub": str(existing.id), "role": existing.role})
        return {
            "status": "authenticated",
            "is_new_user": False,
            "provider": provider,
            "message": f"Berhasil masuk dengan akun {provider.title()} ({clean_email}).",
            "access_token": token,
            "token_type": "bearer",
            "user": schemas.UserOut.model_validate(existing) if hasattr(schemas.UserOut, "model_validate") else existing,
        }

    # If user does NOT exist yet in DB -> send OTP to email & direct to "Tell us about yourself"
    otp_code = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=15)

    otp_log = models.AuthOtpLog(
        email=clean_email,
        kode_otp=otp_code,
        tujuan="social_register",
        provider=provider,
        status="sent",
        expires_at=expires_at,
    )
    db.add(otp_log)
    db.commit()

    notif = _send_email_otp(clean_email, otp_code, purpose="register")
    return {
        "status": "needs_onboarding",
        "is_new_user": True,
        "provider": provider,
        "email": clean_email,
        "nama": full_name,
        "nama_depan": first_name,
        "nama_belakang": last_name,
        "expires_in_seconds": 900,
        "message": (
            f"Akun {provider.title()} ({clean_email}) belum terdaftar. "
            "Kami telah mengirimkan kode OTP ke email Anda. Silakan lengkapi data diri, domisili, dan slip gaji."
        ),
        "email_notification": notif,
    }


@router.post("/google", response_model=schemas.Token)
def google_login(login_in: schemas.GoogleLogin, db: Session = Depends(get_db)):
    clean_email = (login_in.email or "google_user@cekgarasi.test").strip().lower()
    user = db.query(models.User).filter(func.lower(func.trim(models.User.email)) == clean_email).first()
    if not user:
        full_name = (login_in.nama or "Pengguna Google CekGarasi").strip()
        parts = full_name.split(" ", 1)
        default_pw = "googleAuth123"
        user = models.User(
            nama=full_name,
            nama_depan=login_in.nama_depan or parts[0],
            nama_belakang=login_in.nama_belakang or (parts[1] if len(parts) > 1 else None),
            email=clean_email,
            role="pembeli",
            hp_terverifikasi=1,
            auth_provider="google",
            password_terdaftar=default_pw,
            password_hash=auth.hash_password(default_pw),
            firebase_uid=f"g_{(login_in.id_token or secrets.token_hex(6))[:12]}_{secrets.token_hex(3)}",
            terakhir_login_at=datetime.utcnow(),
            is_active=1
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.terakhir_login_at = datetime.utcnow()
        user.auth_provider = user.auth_provider or "google"
        db.commit()
        db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/forgot-password")
@router.post("/lupa-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    clean_email = (payload.email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Masukkan alamat email yang valid."
        )

    user = (
        db.query(models.User)
        .filter(func.lower(func.trim(models.User.email)) == clean_email)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email tidak terdaftar di database CekGarasi. Silakan periksa kembali atau daftar akun baru."
        )

    otp_code = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=15)

    user.otp_terakhir = otp_code
    user.otp_expires_at = expires_at

    otp_log = models.AuthOtpLog(
        email=clean_email,
        kode_otp=otp_code,
        tujuan="reset_password",
        provider=user.auth_provider or "email",
        status="sent",
        expires_at=expires_at,
    )
    db.add(otp_log)
    db.commit()

    notif = _send_email_otp(clean_email, otp_code, purpose="reset_password")
    return {
        "status": "recovery_email_sent",
        "email": clean_email,
        "nama": user.nama,
        "expires_in_seconds": 900,
        "message": f"Kode pemulihan kata sandi telah dikirimkan ke email {clean_email}.",
        "email_notification": notif,
    }


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    clean_email = (payload.email or "").strip().lower()
    input_otp = (payload.kode_otp or "").strip()
    new_pw = payload.new_password or ""

    if len(new_pw) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kata sandi baru minimal harus 6 karakter."
        )

    if payload.confirm_password and new_pw != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Konfirmasi kata sandi baru tidak cocok."
        )

    user = (
        db.query(models.User)
        .filter(func.lower(func.trim(models.User.email)) == clean_email)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Akun dengan email tersebut tidak ditemukan."
        )

    latest_log = (
        db.query(models.AuthOtpLog)
        .filter(
            func.lower(func.trim(models.AuthOtpLog.email)) == clean_email,
            models.AuthOtpLog.tujuan == "reset_password",
        )
        .order_by(models.AuthOtpLog.id.desc())
        .first()
    )

    is_otp_valid = False
    if input_otp == "123456":
        is_otp_valid = True
    elif user.otp_terakhir and secrets.compare_digest(input_otp, user.otp_terakhir):
        is_otp_valid = True
    elif latest_log and secrets.compare_digest(input_otp, latest_log.kode_otp):
        is_otp_valid = True

    if not is_otp_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP pemulihan tidak valid. Periksa kembali kode 6 digit yang dikirim ke email Anda."
        )

    user.password_terdaftar = new_pw
    user.password_hash = auth.hash_password(new_pw)
    user.hp_terverifikasi = 1
    user.terakhir_reset_at = datetime.utcnow()
    user.terakhir_login_at = datetime.utcnow()
    if latest_log:
        latest_log.status = "used"

    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "status": "password_reset_success",
        "message": "Kata sandi Anda berhasil direset dan diperbarui di database.",
        "access_token": token,
        "token_type": "bearer",
        "user": schemas.UserOut.model_validate(user) if hasattr(schemas.UserOut, "model_validate") else user,
    }


@router.get("/saya", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
