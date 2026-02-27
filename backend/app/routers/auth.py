"""
Authentication router for user login, signup, and token management.
"""

from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
from typing import Optional
import jwt
import os
import random
import string
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
load_dotenv()

router = APIRouter()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Password hashing - use simple approach due to bcrypt issues
import hashlib

def hash_password(password: str) -> str:
    """Hash a password."""
    # Simple PBKDF2 hashing
    salt = "stylehub_salt_"
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password."""
    return hash_password(plain_password) == hashed_password

# In-memory user storage (in production, use a database)
fake_users_db = {}
# Verification codes storage
verification_codes = {}  # email -> {code, created_at, attempts}
unverified_users = {}  # email -> user_data
# Password reset codes storage
password_reset_codes = {}  # email -> {code, created_at, attempts}

# Initialize with default test users
fake_users_db["test@example.com"] = {
    "id": "user_1",
    "email": "test@example.com",
    "password": hash_password("password123"),
    "firstName": "Test",
    "lastName": "User",
    "createdAt": datetime.utcnow().isoformat(),
}

fake_users_db["john@example.com"] = {
    "id": "user_2",
    "email": "john@example.com",
    "password": hash_password("password123"),
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": datetime.utcnow().isoformat(),
}

fake_users_db["jane@example.com"] = {
    "id": "user_3",
    "email": "jane@example.com",
    "password": hash_password("password123"),
    "firstName": "Jane",
    "lastName": "Smith",
    "createdAt": datetime.utcnow().isoformat(),
}


class UserRegister(BaseModel):
    """User registration request model."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    firstName: str = Field(..., min_length=1)
    lastName: str = Field(..., min_length=1)


class UserLogin(BaseModel):
    """User login request model."""
    email: EmailStr
    password: str


class VerifyEmailRequest(BaseModel):
    """Email verification request model."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    """Token response model."""
    accessToken: str
    tokenType: str
    user: dict


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    firstName: str
    lastName: str
    avatar: Optional[str] = None


class SignupResponse(BaseModel):
    """Signup response model."""
    message: str
    email: str
    verificationCodeSent: bool


class ForgotPasswordRequest(BaseModel):
    """Forgot password request model."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password request model."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)


def create_access_token(user_id: str, email: str) -> str:
    """Create a JWT access token."""
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return "".join(random.choices(string.digits, k=6))


def send_verification_code(email: str, code: str) -> None:
    """
    Send verification code to email via Gmail SMTP.
    Requires GMAIL_EMAIL and GMAIL_PASSWORD in .env file.
    """
    try:
        gmail_email = os.getenv("GMAIL_EMAIL")
        gmail_password = os.getenv("GMAIL_PASSWORD")
        
        if not gmail_email or not gmail_password or gmail_password == "your_gmail_app_password_here":
            # Fallback to console logging if credentials not set
            print(f"\n{'='*50}")
            print(f"VERIFICATION CODE FOR {email}")
            print(f"Code: {code}")
            print(f"{'='*50}\n")
            print("⚠️  Email not sent - Gmail credentials not configured in .env")
            return
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "QuickKart - Email Verification Code"
        message["From"] = gmail_email
        message["To"] = email
        
        # HTML email template
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Welcome to QuickKart!</h2>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up. To complete your account verification, please use the code below:
                    </p>
                    
                    <div style="background-color: #f9f9f9; border: 2px solid #e0e0e0; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                        <p style="color: #999; margin: 0; font-size: 12px; margin-bottom: 10px;">VERIFICATION CODE</p>
                        <p style="color: #333; margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 5px; font-family: monospace;">{code}</p>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                        This code will expire in 15 minutes. If you didn't sign up for QuickKart, please ignore this email.
                    </p>
                    
                    <div style="border-top: 1px solid #e0e0e0; margin-top: 30px; padding-top: 20px; text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            QuickKart © 2026 | All rights reserved
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        # Attach HTML
        part = MIMEText(html, "html")
        message.attach(part)
        
        # Send email
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_email, gmail_password)
            server.sendmail(gmail_email, email, message.as_string())
        
        print(f"✅ Verification code sent to {email}")
        
    except smtplib.SMTPAuthenticationError:
        print(f"❌ Gmail authentication failed. Check your email and app password in .env")
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {str(e)}")
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")


@router.post("/auth/signup", response_model=SignupResponse)
async def signup(user: UserRegister):
    """
    Register a new user and send verification code.
    
    Body Parameters:
    - email: User's email
    - password: User's password (minimum 6 characters)
    - firstName: User's first name
    - lastName: User's last name
    
    Response: Returns verification code sent status
    """
    # Check if user already exists
    if user.email in fake_users_db or user.email in unverified_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Generate verification code
    verification_code = generate_verification_code()
    
    # Store unverified user
    user_data = {
        "email": user.email,
        "password": hash_password(user.password),
        "firstName": user.firstName,
        "lastName": user.lastName,
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    unverified_users[user.email] = user_data
    verification_codes[user.email] = {
        "code": verification_code,
        "created_at": datetime.utcnow(),
        "attempts": 0,
    }
    
    # Send verification code (logs to console for development)
    try:
        send_verification_code(user.email, verification_code)
    except Exception as e:
        print(f"⚠️  Warning: Failed to send email: {str(e)}")
        # Don't fail signup if email sending fails - show the code in console instead
    
    return {
        "message": "Verification code sent to your email",
        "email": user.email,
        "verificationCodeSent": True,
    }


@router.post("/auth/verify-email", response_model=TokenResponse)
async def verify_email(request: VerifyEmailRequest):
    """
    Verify email with verification code.
    
    Body Parameters:
    - email: User's email
    - code: 6-digit verification code
    """
    # Check if user exists in unverified users
    if request.email not in unverified_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or already verified",
        )
    
    # Check if verification code exists
    if request.email not in verification_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found",
        )
    
    code_data = verification_codes[request.email]
    
    # Check if code has expired (15 minutes)
    if datetime.utcnow() - code_data["created_at"] > timedelta(minutes=15):
        del verification_codes[request.email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired",
        )
    
    # Check if code is correct
    if code_data["code"] != request.code:
        code_data["attempts"] += 1
        if code_data["attempts"] >= 5:
            del verification_codes[request.email]
            del unverified_users[request.email]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please sign up again.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {5 - code_data['attempts']} attempts remaining.",
        )
    
    # Move user from unverified to verified
    user_data = unverified_users.pop(request.email)
    user_id = f"user_{len(fake_users_db) + 1}"
    user_data["id"] = user_id
    fake_users_db[request.email] = user_data
    
    # Clean up verification code
    del verification_codes[request.email]
    
    # Create token
    access_token = create_access_token(user_id, request.email)
    
    return {
        "accessToken": access_token,
        "tokenType": "bearer",
        "user": {
            "id": user_id,
            "email": user_data["email"],
            "firstName": user_data["firstName"],
            "lastName": user_data["lastName"],
        },
    }


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Login user with email and password.
    
    Body Parameters:
    - email: User's email
    - password: User's password
    """
    # Find user
    if credentials.email not in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not available",
        )
    
    user = fake_users_db[credentials.email]
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not available",
        )
    
    # Create token
    access_token = create_access_token(user["id"], user["email"])
    
    return {
        "accessToken": access_token,
        "tokenType": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "firstName": user["firstName"],
            "lastName": user["lastName"],
        },
    }


@router.post("/auth/verify")
async def verify_auth(token: str = None, authorization: str = Header(None)):
    """
    Verify if token is valid.
    
    Accepts token either as:
    - Query parameter: ?token=xxx
    - Body parameter: {"token": "xxx"}
    - Authorization header: Bearer xxx
    """
    # Extract token from Authorization header if provided
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is required",
        )
    
    payload = verify_token(token)
    return {
        "valid": True,
        "userId": payload.get("sub"),
        "email": payload.get("email"),
    }


@router.get("/auth/me")
async def get_current_user(token: str = None, authorization: str = Header(None)):
    """
    Get current authenticated user info.
    
    Accepts token either as:
    - Query parameter: ?token=xxx
    - Authorization header: Bearer xxx
    """
    # Extract token from Authorization header if provided
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is required",
        )
    
    payload = verify_token(token)
    email = payload.get("email")
    
    if email not in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    user = fake_users_db[email]
    return {
        "id": user["id"],
        "email": user["email"],
        "firstName": user["firstName"],
        "lastName": user["lastName"],
    }


@router.post("/auth/logout")
async def logout():
    """
    Logout user (client should discard token).
    """
    return {"message": "Logged out successfully"}


@router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Request password reset by sending a reset code to the user's email.
    
    Body Parameters:
    - email: User's email
    """
    # Check if user exists
    if request.email not in fake_users_db:
        # For security, don't reveal if email exists or not
        return {
            "message": "If the email exists, a reset code has been sent",
            "email": request.email,
        }
    
    # Generate reset code
    reset_code = generate_verification_code()
    
    # Store reset code
    password_reset_codes[request.email] = {
        "code": reset_code,
        "created_at": datetime.utcnow(),
        "attempts": 0,
    }
    
    # Send reset code (logs to console for development)
    try:
        send_verification_code(request.email, reset_code)
    except Exception as e:
        print(f"⚠️  Warning: Failed to send email: {str(e)}")
    
    return {
        "message": "If the email exists, a reset code has been sent",
        "email": request.email,
    }


@router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using verification code.
    
    Body Parameters:
    - email: User's email
    - code: 6-digit reset code
    - new_password: New password (minimum 6 characters)
    """
    # Check if user exists
    if request.email not in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )
    
    # Check if reset code exists
    if request.email not in password_reset_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reset code found. Please request a new one.",
        )
    
    code_data = password_reset_codes[request.email]
    
    # Check if code has expired (15 minutes)
    if datetime.utcnow() - code_data["created_at"] > timedelta(minutes=15):
        del password_reset_codes[request.email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one.",
        )
    
    # Check if code is correct
    if code_data["code"] != request.code:
        code_data["attempts"] += 1
        if code_data["attempts"] >= 5:
            del password_reset_codes[request.email]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new reset code.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reset code. {5 - code_data['attempts']} attempts remaining.",
        )
    
    # Update password
    user = fake_users_db[request.email]
    user["password"] = hash_password(request.new_password)
    
    # Clean up reset code
    del password_reset_codes[request.email]
    
    return {
        "message": "Password has been reset successfully",
        "email": request.email,
    }

