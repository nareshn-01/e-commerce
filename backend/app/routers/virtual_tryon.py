"""
Virtual Try-On API Router
Handles virtual try-on requests using IDM-VTON
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import logging
import os
import uuid
from datetime import datetime

from ..services.virtual_tryon_service import get_virtual_tryon_service
from ..utils.image_preprocessing import (
    validate_image_file,
    save_upload_to_temp,
    convert_image_to_rgb,
    image_to_base64,
    cleanup_files
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Temporary storage directories
TEMP_BASE_DIR = os.path.join("data", "virtual_tryon")
PERSON_DIR = os.path.join(TEMP_BASE_DIR, "person")
CLOTH_DIR = os.path.join(TEMP_BASE_DIR, "cloth")
OUTPUT_DIR = os.path.join(TEMP_BASE_DIR, "output")


class VirtualTryOnResponse(BaseModel):
    """Response model for virtual try-on"""
    success: bool
    message: str
    result_image: Optional[str] = None  # Base64 encoded image
    result_url: Optional[str] = None
    processing_time: Optional[float] = None
    error: Optional[str] = None


@router.post("/virtual-tryon", response_model=VirtualTryOnResponse)
async def create_virtual_tryon(
    person_image: UploadFile = File(..., description="Full-body image of person"),
    cloth_image: UploadFile = File(..., description="Clothing item image"),
    return_base64: bool = Form(default=True, description="Return result as base64")
):
    """
    Generate virtual try-on result
    
    - **person_image**: Upload full-body image of the person
    - **cloth_image**: Upload image of clothing item from catalog
    - **return_base64**: Return result as base64 string (default: True)
    
    Returns generated image of person wearing the selected clothing
    """
    start_time = datetime.now()
    person_path = None
    cloth_path = None
    output_path = None
    
    try:
        logger.info("Processing virtual try-on request")
        
        # Read uploaded files
        person_content = await person_image.read()
        cloth_content = await cloth_image.read()
        
        # Validate person image
        is_valid, error_msg = validate_image_file(person_content, person_image.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid person image: {error_msg}")
        
        # Validate cloth image
        is_valid, error_msg = validate_image_file(cloth_content, cloth_image.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid cloth image: {error_msg}")
        
        logger.info(f"Images validated: person={person_image.filename}, cloth={cloth_image.filename}")
        
        # Save uploaded images to temporary storage
        person_path = save_upload_to_temp(
            person_content, 
            person_image.filename, 
            PERSON_DIR,
            prefix="person_"
        )
        
        cloth_path = save_upload_to_temp(
            cloth_content,
            cloth_image.filename,
            CLOTH_DIR,
            prefix="cloth_"
        )
        
        # Convert images to RGB if needed
        person_path = convert_image_to_rgb(person_path)
        cloth_path = convert_image_to_rgb(cloth_path)
        
        # Generate unique output filename
        output_filename = f"tryon_{uuid.uuid4().hex}.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Ensure output directory exists
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Get virtual try-on service
        service = get_virtual_tryon_service()
        
        # Generate try-on result
        logger.info("Starting virtual try-on generation...")
        result = service.generate_tryon(
            person_image_path=person_path,
            cloth_image_path=cloth_path,
            output_path=output_path
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Virtual try-on generation failed: {result.get('error', 'Unknown error')}"
            )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Virtual try-on completed in {processing_time:.2f}s")
        
        # Prepare response
        response_data = {
            "success": True,
            "message": "Virtual try-on generated successfully",
            "processing_time": processing_time
        }
        
        # Return base64 or URL
        if return_base64:
            result_base64 = image_to_base64(output_path)
            response_data["result_image"] = result_base64
        else:
            # Provide URL to download the image
            response_data["result_url"] = f"/api/virtual-tryon/result/{output_filename}"
        
        return VirtualTryOnResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Virtual try-on request failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    finally:
        # Cleanup temporary input files
        # Keep output file for potential retrieval
        cleanup_files(person_path, cloth_path)


@router.get("/virtual-tryon/result/{filename}")
async def get_tryon_result(filename: str):
    """
    Retrieve generated virtual try-on result image
    
    - **filename**: Name of the generated result file
    """
    try:
        file_path = os.path.join(OUTPUT_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Result file not found")
        
        # Security: Prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        return FileResponse(
            path=file_path,
            media_type="image/png",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve result: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve result")


@router.delete("/virtual-tryon/result/{filename}")
async def delete_tryon_result(filename: str):
    """
    Delete a generated virtual try-on result
    
    - **filename**: Name of the result file to delete
    """
    try:
        file_path = os.path.join(OUTPUT_DIR, filename)
        
        # Security: Prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted result file: {filename}")
            return {"success": True, "message": f"Deleted {filename}"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete result: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete result")


@router.get("/virtual-tryon/health")
async def check_health():
    """
    Check if virtual try-on service is ready
    """
    try:
        service = get_virtual_tryon_service()
        
        return {
            "status": "healthy",
            "service": "virtual-tryon",
            "model_loaded": service._model is not None,
            "device": str(service._device) if service._device else "not initialized"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
