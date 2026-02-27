"""
Image preprocessing utilities for Virtual Try-On
Handles image validation, conversion, and temporary file management
"""

import os
import io
import uuid
import logging
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
import base64

logger = logging.getLogger(__name__)

# Supported image formats
SUPPORTED_FORMATS = {'JPEG', 'JPG', 'PNG', 'WEBP'}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_image_file(file_content: bytes, filename: str) -> Tuple[bool, Optional[str]]:
    """
    Validate uploaded image file
    
    Args:
        file_content: Raw file bytes
        filename: Original filename
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check file size
    if len(file_content) > MAX_IMAGE_SIZE:
        return False, f"File size exceeds {MAX_IMAGE_SIZE / 1024 / 1024}MB limit"
    
    # Try to open as image
    try:
        img = Image.open(io.BytesIO(file_content))
        
        # Check format
        if img.format.upper() not in SUPPORTED_FORMATS:
            return False, f"Unsupported format. Use: {', '.join(SUPPORTED_FORMATS)}"
        
        # Check dimensions (minimum size)
        min_width, min_height = 256, 256
        if img.width < min_width or img.height < min_height:
            return False, f"Image too small. Minimum size: {min_width}x{min_height}px"
        
        return True, None
        
    except Exception as e:
        logger.error(f"Image validation failed: {str(e)}")
        return False, "Invalid image file"


def save_upload_to_temp(
    file_content: bytes,
    filename: str,
    temp_dir: str,
    prefix: str = ""
) -> str:
    """
    Save uploaded file to temporary directory
    
    Args:
        file_content: File bytes
        filename: Original filename
        temp_dir: Temporary directory path
        prefix: Optional prefix for filename
        
    Returns:
        Path to saved file
    """
    # Create temp directory if it doesn't exist
    Path(temp_dir).mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(filename).suffix.lower()
    unique_filename = f"{prefix}{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(temp_dir, unique_filename)
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    logger.debug(f"Saved upload to: {file_path}")
    return file_path


def convert_image_to_rgb(image_path: str) -> str:
    """
    Convert image to RGB format if needed
    
    Args:
        image_path: Path to image
        
    Returns:
        Path to converted image (same path if already RGB)
    """
    try:
        img = Image.open(image_path)
        
        if img.mode != 'RGB':
            logger.info(f"Converting {img.mode} to RGB")
            img = img.convert('RGB')
            img.save(image_path)
        
        return image_path
        
    except Exception as e:
        logger.error(f"Image conversion failed: {str(e)}")
        raise


def image_to_base64(image_path: str) -> str:
    """
    Convert image file to base64 string
    
    Args:
        image_path: Path to image file
        
    Returns:
        Base64 encoded string
    """
    with open(image_path, 'rb') as f:
        image_bytes = f.read()
    return base64.b64encode(image_bytes).decode('utf-8')


def base64_to_image(base64_string: str, output_path: str) -> str:
    """
    Convert base64 string to image file
    
    Args:
        base64_string: Base64 encoded image
        output_path: Path to save decoded image
        
    Returns:
        Path to saved image
    """
    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    image_bytes = base64.b64decode(base64_string)
    
    with open(output_path, 'wb') as f:
        f.write(image_bytes)
    
    return output_path


def resize_image(
    image_path: str,
    max_width: int = 1024,
    max_height: int = 1024,
    maintain_aspect: bool = True
) -> str:
    """
    Resize image if it exceeds maximum dimensions
    
    Args:
        image_path: Path to image
        max_width: Maximum width
        max_height: Maximum height
        maintain_aspect: Whether to maintain aspect ratio
        
    Returns:
        Path to resized image (same path)
    """
    try:
        img = Image.open(image_path)
        
        # Check if resize needed
        if img.width <= max_width and img.height <= max_height:
            return image_path
        
        if maintain_aspect:
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        else:
            img = img.resize((max_width, max_height), Image.Resampling.LANCZOS)
        
        img.save(image_path)
        logger.info(f"Resized image to {img.size}")
        
        return image_path
        
    except Exception as e:
        logger.error(f"Image resize failed: {str(e)}")
        raise


def get_image_metadata(image_path: str) -> dict:
    """
    Extract image metadata
    
    Args:
        image_path: Path to image
        
    Returns:
        Dictionary with image metadata
    """
    try:
        img = Image.open(image_path)
        
        return {
            "format": img.format,
            "mode": img.mode,
            "size": img.size,
            "width": img.width,
            "height": img.height,
            "file_size": os.path.getsize(image_path)
        }
        
    except Exception as e:
        logger.error(f"Failed to get image metadata: {str(e)}")
        return {}


def cleanup_files(*file_paths: str):
    """
    Remove temporary files
    
    Args:
        *file_paths: Variable number of file paths to delete
    """
    for file_path in file_paths:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.debug(f"Cleaned up: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup {file_path}: {e}")
