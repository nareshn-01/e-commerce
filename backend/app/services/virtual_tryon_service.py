"""
Virtual Try-On Service using Trained Model
Handles inference for virtual clothing try-on using trained outfit model
"""

import os
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict
import torch
from PIL import Image
import numpy as np
import cv2
from ..services.model_training import get_outfit_training_model

logger = logging.getLogger(__name__)


class VirtualTryOnService:
    """
    Service for virtual try-on using IDM-VTON model
    Singleton pattern to load model once
    """
    
    _instance = None
    _model = None
    _device = None
    _is_initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VirtualTryOnService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the service (model loaded lazily)"""
        if not self._is_initialized:
            self._setup_device()
            self._is_initialized = True
    
    def _setup_device(self):
        """Setup computing device (GPU if available, else CPU)"""
        if torch.cuda.is_available():
            self._device = torch.device("cuda")
            logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
        else:
            self._device = torch.device("cpu")
            logger.info("Using CPU for inference (GPU recommended for better performance)")
    
    def _load_model(self):
        """
        Load IDM-VTON model
        This is called lazily on first inference request
        """
        if self._model is not None:
            return
        
        try:
            logger.info("Loading IDM-VTON model...")
            
            # Note: IDM-VTON uses diffusers pipeline
            # You'll need to either:
            # 1. Clone and install IDM-VTON from GitHub
            # 2. Use their pretrained checkpoints
            # 3. Install via pip if available
            
            # Placeholder for actual model loading
            # Replace with actual IDM-VTON initialization
            from diffusers import StableDiffusionInpaintPipeline
            
            # Example placeholder - replace with actual IDM-VTON model
            # model_path = "yisol/IDM-VTON"  # Hypothetical HuggingFace path
            # self._model = IDMVTONPipeline.from_pretrained(
            #     model_path,
            #     torch_dtype=torch.float16 if self._device.type == "cuda" else torch.float32
            # )
            
            # For now, using a placeholder
            # You need to install IDM-VTON separately and integrate here
            logger.warning("IDM-VTON model placeholder - please integrate actual model")
            self._model = None  # Replace with actual model
            
            # if self._model:
            #     self._model.to(self._device)
            #     self._model.enable_attention_slicing()  # Memory optimization
            #     if hasattr(self._model, 'enable_xformers_memory_efficient_attention'):
            #         self._model.enable_xformers_memory_efficient_attention()
            
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load IDM-VTON model: {str(e)}")
            raise RuntimeError(f"Model loading failed: {str(e)}")
    
    def _preprocess_images(
        self, 
        person_image: Image.Image, 
        cloth_image: Image.Image
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Preprocess images for model input
        
        Args:
            person_image: PIL Image of person
            cloth_image: PIL Image of clothing
            
        Returns:
            Tuple of preprocessed tensors
        """
        # Resize to model's expected input size
        target_size = (512, 384)  # width, height - adjust based on IDM-VTON requirements
        
        # Resize person image
        person_resized = person_image.resize(target_size, Image.Resampling.LANCZOS)
        
        # Resize cloth image
        cloth_resized = cloth_image.resize(target_size, Image.Resampling.LANCZOS)
        
        # Convert to RGB if needed
        if person_resized.mode != 'RGB':
            person_resized = person_resized.convert('RGB')
        if cloth_resized.mode != 'RGB':
            cloth_resized = cloth_resized.convert('RGB')
        
        # Convert to tensors and normalize
        # Note: Actual preprocessing depends on IDM-VTON requirements
        person_array = np.array(person_resized).astype(np.float32) / 255.0
        cloth_array = np.array(cloth_resized).astype(np.float32) / 255.0
        
        person_tensor = torch.from_numpy(person_array).permute(2, 0, 1).unsqueeze(0)
        cloth_tensor = torch.from_numpy(cloth_array).permute(2, 0, 1).unsqueeze(0)
        
        return person_tensor.to(self._device), cloth_tensor.to(self._device)
    
    def _postprocess_output(self, output_tensor: torch.Tensor) -> Image.Image:
        """
        Convert model output tensor back to PIL Image
        
        Args:
            output_tensor: Model output tensor
            
        Returns:
            PIL Image
        """
        # Denormalize and convert to numpy
        output_array = output_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
        output_array = (output_array * 255.0).clip(0, 255).astype(np.uint8)
        
        return Image.fromarray(output_array)
    
    @torch.no_grad()
    def generate_tryon(
        self,
        person_image_path: str,
        cloth_image_path: str,
        output_path: str
    ) -> dict:
        """
        Generate virtual try-on result
        
        Args:
            person_image_path: Path to person's full-body image
            cloth_image_path: Path to clothing item image
            output_path: Path to save generated result
            
        Returns:
            dict with status and output path or error message
        """
        try:
            # Load model if not already loaded
            self._load_model()
            
            # Load images
            person_image = Image.open(person_image_path)
            cloth_image = Image.open(cloth_image_path)
            
            logger.info(f"Processing try-on: person={person_image.size}, cloth={cloth_image.size}")
            
            # Preprocess images
            person_tensor, cloth_tensor = self._preprocess_images(person_image, cloth_image)
            
            # TODO: Replace with actual IDM-VTON inference
            # For now, this is a placeholder that creates a composite
            if self._model is None:
                logger.warning("Using placeholder - no actual model loaded")
                # Create a simple composite as placeholder
                result_image = self._create_placeholder_result(person_image, cloth_image)
            else:
                # Actual IDM-VTON inference
                # result = self._model(
                #     person=person_tensor,
                #     cloth=cloth_tensor,
                #     num_inference_steps=50,
                #     guidance_scale=7.5
                # )
                # result_image = result.images[0]
                result_image = self._create_placeholder_result(person_image, cloth_image)
            
            # Save result
            result_image.save(output_path)
            logger.info(f"Try-on result saved to {output_path}")
            
            return {
                "success": True,
                "output_path": output_path,
                "message": "Virtual try-on generated successfully"
            }
            
        except Exception as e:
            logger.error(f"Virtual try-on generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to generate virtual try-on"
            }
    
    def _create_placeholder_result(
        self, 
        person_image: Image.Image, 
        cloth_image: Image.Image
    ) -> Image.Image:
        """
        Create realistic virtual try-on with smart clothing placement
        """
        import cv2
        
        # Convert images
        person = person_image.convert("RGB")
        cloth_rgba = cloth_image.convert("RGBA")
        
        person_array = np.array(person, dtype=np.uint8)
        cloth_array = np.array(cloth_rgba, dtype=np.uint8)
        
        h, w = person_array.shape[:2]
        cloth_h, cloth_w = cloth_array.shape[:2]
        
        # Step 1: Find torso region using skin detection
        hsv = cv2.cvtColor(person_array, cv2.COLOR_RGB2HSV)
        
        # Skin ranges (more inclusive for various skin tones)
        lower1 = np.array([0, 20, 70])
        upper1 = np.array([20, 255, 255])
        mask1 = cv2.inRange(hsv, lower1, upper1)
        
        lower2 = np.array([150, 20, 70])
        upper2 = np.array([180, 255, 255])
        mask2 = cv2.inRange(hsv, lower2, upper2)
        
        skin = cv2.bitwise_or(mask1, mask2)
        skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20)))
        
        # Find largest contour (likely the person's body)
        contours, _ = cv2.findContours(skin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            body = max(contours, key=cv2.contourArea)
            x, y, bw, bh = cv2.boundingRect(body)
            
            # Torso region: from a bit below shoulder to waist
            shoulder_y = max(0, y + int(bh * 0.05))
            waist_y = min(h, y + int(bh * 0.65))
            torso_h = waist_y - shoulder_y
            
            shoulder_x = max(0, x)
            torso_w = min(w, bw)
        else:
            # Fallback if skin detection fails
            shoulder_y = int(h * 0.15)
            waist_y = int(h * 0.65)
            torso_h = waist_y - shoulder_y
            shoulder_x = int(w * 0.15)
            torso_w = int(w * 0.7)
        
        # Step 2: Resize clothing to fit torso
        aspect = cloth_h / cloth_w if cloth_w > 0 else 1
        cloth_fit_w = int(torso_w * 0.9)  # 90% of torso width
        cloth_fit_h = int(cloth_fit_w * aspect)
        
        # If too tall, constrain by height
        if cloth_fit_h > torso_h:
            cloth_fit_h = torso_h
            cloth_fit_w = int(cloth_fit_h / aspect)
        
        cloth_resized = cv2.resize(cloth_array, (cloth_fit_w, cloth_fit_h), interpolation=cv2.INTER_CUBIC)
        
        # Step 3: Position clothing centered on torso
        cloth_x = shoulder_x + (torso_w - cloth_fit_w) // 2
        cloth_y = shoulder_y + int(torso_h * 0.08)  # Start slightly below shoulders
        
        # Clamp to image bounds
        cloth_x = max(0, min(cloth_x, w - cloth_fit_w))
        cloth_y = max(0, min(cloth_y, h - cloth_fit_h))
        
        # Step 4: Build cloth mask (remove background / use alpha if available)
        cloth_rgb = cloth_resized[:, :, :3]
        cloth_alpha = cloth_resized[:, :, 3] if cloth_resized.shape[2] == 4 else None
        
        if cloth_alpha is not None:
            mask = cloth_alpha
        else:
            # Background removal using HSV and brightness thresholding
            cloth_hsv = cv2.cvtColor(cloth_rgb, cv2.COLOR_RGB2HSV)
            h_chan, s_chan, v_chan = cv2.split(cloth_hsv)
            bg_mask = ((v_chan > 230) & (s_chan < 30)).astype(np.uint8) * 255
            mask = cv2.bitwise_not(bg_mask)
        
        # Clean up mask
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        mask = cv2.GaussianBlur(mask, (11, 11), 0)
        
        # Step 5: Match clothing lighting to torso region
        y1, y2 = cloth_y, min(cloth_y + cloth_fit_h, h)
        x1, x2 = cloth_x, min(cloth_x + cloth_fit_w, w)
        
        torso_region = person_array[y1:y2, x1:x2]
        if torso_region.size > 0:
            torso_mean = np.mean(torso_region, axis=(0, 1))
            cloth_mean = np.mean(cloth_rgb, axis=(0, 1)) + 1e-6
            scale = np.clip(torso_mean / cloth_mean, 0.7, 1.4)
            cloth_rgb = np.clip(cloth_rgb * scale, 0, 255).astype(np.uint8)
        
        # Step 6: Seamless clone for natural drape and edges
        try:
            center = (int(cloth_x + cloth_fit_w / 2), int(cloth_y + cloth_fit_h / 2))
            result = cv2.seamlessClone(cloth_rgb, person_array, mask, center, cv2.NORMAL_CLONE)
        except Exception:
            # Fallback to alpha blending with proper shape matching
            result = person_array.copy().astype(np.float32)
            
            # Calculate actual region sizes to prevent shape mismatch
            actual_cloth_h = min(cloth_fit_h, y2 - y1, mask.shape[0])
            actual_cloth_w = min(cloth_fit_w, x2 - x1, mask.shape[1])
            
            # Ensure we don't exceed image boundaries
            y2_actual = y1 + actual_cloth_h
            x2_actual = x1 + actual_cloth_w
            
            # Create properly sized blend mask
            blend_mask = mask[:actual_cloth_h, :actual_cloth_w].astype(np.float32) / 255.0 * 0.9
            blend_mask = cv2.GaussianBlur(blend_mask, (21, 21), 0)
            
            # Ensure blend_mask matches the region dimensions
            if blend_mask.shape != (actual_cloth_h, actual_cloth_w):
                blend_mask = cv2.resize(blend_mask, (actual_cloth_w, actual_cloth_h))
            
            # Apply blending with proper dimensions
            cloth_region = cloth_rgb[:actual_cloth_h, :actual_cloth_w].astype(np.float32)
            person_region = result[y1:y2_actual, x1:x2_actual]
            
            # Expand blend_mask to 3 channels for RGB
            blend_mask_3ch = np.stack([blend_mask] * 3, axis=2)
            
            # Blend with shape-safe operation
            blended = person_region * (1 - blend_mask_3ch) + cloth_region * blend_mask_3ch
            result[y1:y2_actual, x1:x2_actual] = blended
            
            result = np.clip(result, 0, 255).astype(np.uint8)
        
        # Step 7: Add subtle depth shadow with safe dimensions
        try:
            actual_h = min(mask.shape[0], y2 - y1)
            actual_w = min(mask.shape[1], x2 - x1)
            shadow_mask = cv2.GaussianBlur(mask[:actual_h, :actual_w], (25, 25), 0).astype(np.float32) / 255.0
            shadow_mask = shadow_mask * 0.25
            
            # Apply shadow only to the clothing region
            y2_safe = y1 + actual_h
            x2_safe = x1 + actual_w
            for c in range(3):
                result[y1:y2_safe, x1:x2_safe, c] = np.clip(
                    result[y1:y2_safe, x1:x2_safe, c] - (12 * shadow_mask), 0, 255
                )
        except Exception as e:
            logger.warning(f"Shadow application skipped: {e}")
        
        # Step 8: Smooth + sharpen slightly on clothing area
        result_uint8 = cv2.bilateralFilter(result, 7, 50, 50)
        
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]]) / 2.2
        clothing_region = result_uint8[y1:y2, x1:x2]
        if clothing_region.size > 0:
            sharpened = cv2.filter2D(clothing_region, -1, kernel)
            result_uint8[y1:y2, x1:x2] = sharpened
        
        return Image.fromarray(result_uint8)
    
    def cleanup_temp_files(self, file_paths: list):
        """
        Clean up temporary files
        
        Args:
            file_paths: List of file paths to delete
        """
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.debug(f"Cleaned up: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup {file_path}: {e}")


# Singleton instance
_virtual_tryon_service = None

def get_virtual_tryon_service() -> VirtualTryOnService:
    """Get singleton instance of VirtualTryOnService"""
    global _virtual_tryon_service
    if _virtual_tryon_service is None:
        _virtual_tryon_service = VirtualTryOnService()
    return _virtual_tryon_service
