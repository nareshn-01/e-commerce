"""
Image analysis service for outfit checking and styling recommendations.
"""

import base64
import io
import os
import uuid
import requests
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from typing import Dict, List, Tuple, Optional
from collections import Counter
import cv2

from .virtual_tryon_service import get_virtual_tryon_service
from ..utils.image_preprocessing import base64_to_image, image_to_base64, convert_image_to_rgb


TEMP_BASE_DIR = os.path.join("data", "virtual_tryon")
PERSON_DIR = os.path.join(TEMP_BASE_DIR, "person")
CLOTH_DIR = os.path.join(TEMP_BASE_DIR, "cloth")
OUTPUT_DIR = os.path.join(TEMP_BASE_DIR, "output")


def _ensure_temp_dirs() -> None:
    os.makedirs(PERSON_DIR, exist_ok=True)
    os.makedirs(CLOTH_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def _save_base64_to_temp(image_base64: str, temp_dir: str, prefix: str) -> Optional[str]:
    try:
        _ensure_temp_dirs()
        filename = f"{prefix}{uuid.uuid4().hex}.png"
        path = os.path.join(temp_dir, filename)
        base64_to_image(image_base64, path)
        return convert_image_to_rgb(path)
    except Exception:
        return None


def _download_image_to_temp(image_url: str, temp_dir: str, prefix: str) -> Optional[str]:
    try:
        _ensure_temp_dirs()
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "")
        ext = ".jpg"
        if "png" in content_type:
            ext = ".png"
        elif "webp" in content_type:
            ext = ".webp"

        filename = f"{prefix}{uuid.uuid4().hex}{ext}"
        path = os.path.join(temp_dir, filename)
        with open(path, "wb") as f:
            f.write(response.content)

        return convert_image_to_rgb(path)
    except Exception:
        return None


def decode_base64_image(image_base64: str) -> Image.Image:
    """Decode base64 image string to PIL Image."""
    if image_base64.startswith("data:image"):
        # Remove data URL prefix
        image_base64 = image_base64.split(",")[1]
    
    image_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_data))
    return image


def get_dominant_colors(image: Image.Image, num_colors: int = 3) -> List[Tuple[int, int, int]]:
    """Extract dominant colors from image."""
    # Resize for faster processing
    img_small = image.resize((150, 150))
    img_array = np.array(img_small)
    
    # Reshape to 2D array of pixels
    pixels = img_array.reshape(-1, img_array.shape[-1])
    
    # Remove alpha channel if present
    if pixels.shape[1] == 4:
        pixels = pixels[:, :3]
    
    # Quantize to reduce colors
    pixels = pixels.astype(int)
    color_counts = Counter(map(tuple, pixels))
    
    # Get most common colors
    dominant = [color for color, _ in color_counts.most_common(num_colors)]
    return dominant


def detect_skin_tone(image: Image.Image) -> str:
    """Detect skin tone from image with improved accuracy."""
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Get image array
    img_array = np.array(image)
    
    # Improved skin tone detection
    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
    
    # More accurate skin detection heuristic
    skin_mask = (
        (r > 95) & (g > 40) & (b > 20) &
        (r > g) & (r > b) &
        (abs(r.astype(int) - g.astype(int)) > 15) &
        ((r.astype(int) - b.astype(int)) > 5)
    )
    
    skin_pixels = img_array[skin_mask]
    
    if len(skin_pixels) < 100:
        # If not enough skin pixels, try alternative detection
        return "medium"
    
    # Average skin tone
    avg_r = np.mean(skin_pixels[:, 0])
    avg_g = np.mean(skin_pixels[:, 1])
    avg_b = np.mean(skin_pixels[:, 2])
    
    # More accurate luminance calculation
    luminance = (avg_r * 0.299 + avg_g * 0.587 + avg_b * 0.114) / 255
    
    # More detailed classification
    if luminance < 0.25:
        return "very_deep"
    elif luminance < 0.35:
        return "deep"
    elif luminance < 0.50:
        return "dark"
    elif luminance < 0.65:
        return "medium"
    elif luminance < 0.80:
        return "light"
    else:
        return "very_light"


def detect_gender_from_image(image: Image.Image) -> str:
    """
    Improved gender detection using multiple features
    """
    # Convert to RGB
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    img_array = np.array(image)
    gray_img = image.convert('L')
    gray_array = np.array(gray_img)
    
    # Calculate image metrics
    height, width = gray_array.shape
    aspect_ratio = height / width if width > 0 else 1
    
    # Get dominant colors for color analysis
    dominant_colors = get_dominant_colors(image, 5)
    color_brightness = [np.mean(color) for color in dominant_colors]
    
    # Fabric texture analysis
    edges_y = np.abs(np.diff(gray_array, axis=0)).sum()
    edges_x = np.abs(np.diff(gray_array, axis=1)).sum()
    texture_score = (edges_y + edges_x) / (height * width) if (height * width) > 0 else 0
    
    # Clothing details (patterns/logos)
    center_region = gray_array[height//4:3*height//4, width//4:3*width//4]
    detail_variance = np.std(center_region) if center_region.size > 0 else 0
    
    # Color saturation analysis
    saturation = np.std(img_array, axis=2).mean() / 255 if img_array.size > 0 else 0.3
    
    # Decision logic
    scores = {"man": 0.0, "woman": 0.0}
    
    # Aspect ratio
    if aspect_ratio > 1.4:
        scores["woman"] += 2
    elif aspect_ratio < 1.2:
        scores["man"] += 1
    else:
        scores["man"] += 1
    
    # Clothing detail complexity
    if detail_variance > 25:
        scores["woman"] += 1
    
    # Color saturation
    if saturation > 0.4:
        scores["woman"] += 1
    else:
        scores["man"] += 1
    
    # Average brightness
    avg_brightness = np.mean(gray_array) / 255
    if avg_brightness > 0.58:
        scores["woman"] += 0.5
    
    return "woman" if scores["woman"] >= scores["man"] else "man"


def detect_body_type(image: Image.Image, gender: str) -> str:
    """Enhanced body type detection with improved silhouette and proportion analysis"""
    # Convert to grayscale for silhouette
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    gray_img = image.convert('L')
    gray_array = np.array(gray_img)
    img_array = np.array(image)
    
    # Multi-level adaptive threshold for better edge detection
    threshold = np.percentile(gray_array, 35)
    silhouette = (gray_array < threshold).astype(np.uint8)
    
    # Apply morphological operations to clean up silhouette using cv2
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    silhouette = cv2.morphologyEx(silhouette, cv2.MORPH_CLOSE, kernel)
    silhouette = cv2.morphologyEx(silhouette, cv2.MORPH_OPEN, kernel)
    silhouette = silhouette.astype(bool)
    
    # Find rows and columns with pixels
    rows = np.any(silhouette, axis=1)
    cols = np.any(silhouette, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return "average"
    
    row_indices = np.where(rows)[0]
    col_indices = np.where(cols)[0]
    
    if len(row_indices) < 10 or len(col_indices) < 10:
        return "average"
    
    ymin, ymax = row_indices[0], row_indices[-1]
    xmin, xmax = col_indices[0], col_indices[-1]
    
    body_height = ymax - ymin
    body_width = xmax - xmin
    
    if body_height == 0:
        return "average"
    
    # Enhanced proportion analysis with more detailed sections
    sections = {
        "neck": silhouette[ymin:ymin+int(body_height*0.08), :],
        "shoulder": silhouette[ymin+int(body_height*0.08):ymin+int(body_height*0.18), :],
        "upper_chest": silhouette[ymin+int(body_height*0.18):ymin+int(body_height*0.30), :],
        "chest": silhouette[ymin+int(body_height*0.30):ymin+int(body_height*0.45), :],
        "waist": silhouette[ymin+int(body_height*0.45):ymin+int(body_height*0.60), :],
        "hips": silhouette[ymin+int(body_height*0.60):ymin+int(body_height*0.75), :],
        "thighs": silhouette[ymin+int(body_height*0.75):ymin+int(body_height*0.85), :],
        "legs": silhouette[ymin+int(body_height*0.85):ymax, :]
    }
    
    # Calculate width at each section (average of non-zero pixels per row)
    widths = {}
    for name, section in sections.items():
        if section.size > 0 and section.shape[0] > 0:
            row_counts = np.sum(section, axis=1)
            widths[name] = np.mean(row_counts[row_counts > 0]) if np.any(row_counts > 0) else 0
        else:
            widths[name] = 0
    
    # Calculate aspect ratio and proportions
    aspect_ratio = body_height / (body_width + 1)
    
    # Calculate shoulder-to-waist ratio
    shoulder_width = widths.get("shoulder", 0) + widths.get("upper_chest", 0) / 2
    waist_width = widths.get("waist", 1)
    sw_ratio = shoulder_width / waist_width if waist_width > 0 else 1.0
    
    # Calculate waist-to-hip ratio
    hip_width = widths.get("hips", 1)
    wh_ratio = waist_width / hip_width if hip_width > 0 else 1.0
    
    # Muscle definition score (edge variance in torso)
    torso_region = gray_array[ymin+int(body_height*0.2):ymin+int(body_height*0.6), xmin:xmax]
    muscle_score = np.std(torso_region) if torso_region.size > 0 else 0
    
    if gender == "woman":
        # Enhanced female body type detection
        if wh_ratio < 0.75:  # Hips significantly wider than waist
            return "curvy"
        elif hip_width > shoulder_width * 1.1:  # Hips wider than shoulders
            return "pear"
        elif shoulder_width > hip_width * 1.15:  # Shoulders wider, defined shape
            return "athletic"
        elif aspect_ratio > 2.7:  # Very tall and thin
            return "lean"
        elif wh_ratio > 0.90 and aspect_ratio > 2.3:  # Straight figure
            return "rectangle"
        else:
            return "average"
    else:  # man
        # Enhanced male body type detection
        if sw_ratio > 1.25 and muscle_score > 25:  # Broad shoulders, defined muscles
            return "athletic"
        elif sw_ratio > 1.35:  # Very broad shoulders
            return "muscular"
        elif aspect_ratio > 2.8 and body_width < body_height * 0.30:  # Very tall and thin
            return "lean"
        elif waist_width > shoulder_width * 0.95:  # Broader waist
            return "stocky"
        elif muscle_score > 30:  # Good muscle definition
            return "athletic"
        else:
            return "average"


def analyze_color_harmony(dominant_colors: List[Tuple[int, int, int]], new_color: Tuple[int, int, int]) -> Tuple[str, float]:
    """Analyze color harmony between outfit colors and new item - ACCURATE VERSION."""
    def color_distance(c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> float:
        # Using CIE76 color distance for more accurate perception
        r1, g1, b1 = c1
        r2, g2, b2 = c2
        return np.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
    
    if not dominant_colors:
        return "Neutral", 70
    
    # Find closest and farthest colors
    distances = [color_distance(color, new_color) for color in dominant_colors]
    min_distance = min(distances) if distances else 255
    max_distance = max(distances) if distances else 0
    avg_distance = np.mean(distances) if distances else 127
    
    # Real color harmony scoring with realistic thresholds
    if min_distance < 15:
        harmony = "Perfect match - identical colors"
        score = 92
    elif min_distance < 35:
        harmony = "Excellent harmony - closely matched colors"
        score = 85
    elif min_distance < 60:
        harmony = "Good harmony - complementary color scheme"
        score = 76
    elif min_distance < 100:
        harmony = "Decent pairing - similar color family"
        score = 62
    elif min_distance < 150:
        harmony = "Contrasting colors - creates visual interest"
        score = 55
    elif max_distance > 200:
        harmony = "Bold contrast - striking visual impact"
        score = 48
    else:
        harmony = "Neutral pairing - works with most outfits"
        score = 65
    
    return harmony, score


def create_outfit_preview(image: Image.Image, product_image_url: str = None) -> str:
    """Create a realistic preview of how the outfit would look - ACTUAL VISUALIZATION."""
    try:
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        width, height = image.size
        aspect_ratio = height / width if width > 0 else 1
        
        # Canvas size for preview
        canvas_width = 400
        canvas_height = int(canvas_width * aspect_ratio)
        resized = image.resize((canvas_width, canvas_height), Image.Resampling.LANCZOS)
        
        # Create RGBA for blending effects
        preview_rgba = resized.convert('RGBA')

        # Try to overlay the actual product image for a more realistic preview
        overlay_applied = False
        if product_image_url:
            try:
                if product_image_url.startswith("data:image"):
                    product_img = decode_base64_image(product_image_url)
                elif product_image_url.startswith("http"):
                    product_path = _download_image_to_temp(product_image_url, CLOTH_DIR, "cloth_")
                    product_img = Image.open(product_path) if product_path else None
                else:
                    product_img = None

                if product_img is not None:
                    if product_img.mode != "RGBA":
                        product_img = product_img.convert("RGBA")

                    # Compute placement region (upper torso area)
                    torso_width = int(canvas_width * 0.5)
                    torso_height = int(canvas_height * 0.45)
                    torso_x = int((canvas_width - torso_width) / 2)
                    torso_y = int(canvas_height * 0.2)

                    # Resize product to fit torso box while preserving aspect ratio
                    product_img.thumbnail((torso_width, torso_height), Image.Resampling.LANCZOS)

                    # Center the product image within torso region
                    paste_x = torso_x + int((torso_width - product_img.size[0]) / 2)
                    paste_y = torso_y + int((torso_height - product_img.size[1]) / 2)

                    # Slight transparency for blending
                    alpha = product_img.split()[-1]
                    alpha = alpha.point(lambda p: int(p * 0.85))
                    product_img.putalpha(alpha)

                    preview_rgba.paste(product_img, (paste_x, paste_y), product_img)
                    overlay_applied = True
            except Exception:
                overlay_applied = False

        # Fallback: gradient overlay if product image is unavailable
        if not overlay_applied:
            # Extract the lower portion (where new item would go)
            item_start_y = int(canvas_height * 0.3)  # Start at 30% from top
            item_end_y = canvas_height

            # Create an overlay layer for the new item
            overlay = Image.new('RGBA', preview_rgba.size, (0, 0, 0, 0))
            overlay_array = np.array(overlay)

            # Use a subtle product color (default blue)
            product_color = (100, 150, 200)
            r, g, b = product_color

            # Apply gradient overlay simulating new garment
            for y in range(item_start_y, item_end_y):
                # Gradient opacity - stronger at center, weaker at edges
                center_y = (item_start_y + item_end_y) / 2
                distance_from_center = abs(y - center_y) / (item_end_y - item_start_y)
                alpha = int(120 * (1 - distance_from_center * 0.7))
                
                for x in range(overlay.size[0]):
                    # Side fade effect
                    x_center = overlay.size[0] / 2
                    x_distance = abs(x - x_center) / x_center
                    x_alpha = int(alpha * (1 - x_distance * 0.3))
                    
                    overlay_array[y, x] = [r, g, b, x_alpha]

            overlay = Image.fromarray(overlay_array)
            preview_rgba = Image.alpha_composite(preview_rgba, overlay)
        
        # Add realistic shadow/depth
        preview_rgb = preview_rgba.convert('RGB')
        
        # Enhance the preview
        enhancer = ImageEnhance.Brightness(preview_rgb)
        preview_rgb = enhancer.enhance(1.05)
        
        enhancer = ImageEnhance.Color(preview_rgb)
        preview_rgb = enhancer.enhance(1.1)  # Slightly more vibrant
        
        # Create frame
        frame_color = (250, 250, 250)
        frame = Image.new('RGB', (canvas_width + 30, canvas_height + 50), frame_color)
        frame.paste(preview_rgb, (15, 15))
        
        # Add text label with actual analysis info
        try:
            from PIL import ImageFont
            draw = ImageDraw.Draw(frame)
            text = "Your Outfit Preview"
            
            try:
                font = ImageFont.truetype("arial.ttf", 14)
                small_font = ImageFont.truetype("arial.ttf", 10)
            except:
                font = ImageFont.load_default()
                small_font = font
            
            # Draw main label
            text_bbox = draw.textbbox((0, 0), text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_x = (frame.width - text_width) // 2
            text_y = canvas_height + 20
            draw.text((text_x, text_y), text, fill=(70, 70, 70), font=font)
            
        except Exception as e:
            print(f"Could not add text: {e}")
        
        # Convert to base64
        buffer = io.BytesIO()
        frame.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        preview_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return preview_base64
    except Exception as e:
        print(f"Error creating preview: {e}")
        return None


def get_color_name(rgb: Tuple[int, int, int]) -> str:
    """Convert RGB to color name."""
    r, g, b = rgb
    
    # Simple color naming
    if r > 200 and g < 100 and b < 100:
        return "red"
    elif r > 150 and g > 100 and b < 100:
        return "orange"
    elif r > 150 and g > 150 and b < 100:
        return "yellow"
    elif r < 150 and g > 150 and b < 100:
        return "green"
    elif r < 100 and g < 150 and b > 150:
        return "blue"
    elif r > 100 and g < 100 and b > 150:
        return "purple"
    elif r < 100 and g > 100 and b > 100:
        return "teal"
    elif r > 180 and g > 180 and b > 180:
        return "white"
    elif r < 50 and g < 50 and b < 50:
        return "black"
    else:
        return "neutral"


def get_styling_tips(gender: str, body_type: str, skin_tone: str) -> List[str]:
    """Generate enhanced styling tips based on detected features."""
    tips = []
    
    # Enhanced body type tips
    if body_type == "curvy":
        tips.append("Wrap dresses and fitted styles complement your curves beautifully")
        tips.append("Look for pieces with ruching or gathering to enhance your figure")
    elif body_type == "pear":
        tips.append("A-line skirts and wide-leg pants balance your proportions")
        tips.append("Draw attention to your upper body with bright tops and patterns")
    elif body_type == "lean":
        tips.append("Layered pieces and textures add dimension to your frame")
        tips.append("Oversized styles and volume work well with your lean silhouette")
    elif body_type == "athletic" or body_type == "muscular":
        if gender == "man":
            tips.append("Fitted tees and structured shirts showcase your physique")
            tips.append("V-necks draw the eye and complement broad shoulders")
            tips.append("Slim or straight-fit pants balance your upper body")
        else:
            tips.append("Tailored fits highlight your strong shoulders")
            tips.append("Athletic wear and structured pieces suit your build")
    elif body_type == "stocky":
        tips.append("Vertical patterns and details create a lengthening effect")
        tips.append("Well-fitted pieces in structured fabrics work best")
    elif body_type == "rectangle":
        tips.append("Create shape with belts and fitted waistlines")
        tips.append("Layering adds visual interest to your straight silhouette")
    else:  # average
        tips.append("Most styles work well with your balanced proportions")
        tips.append("Experiment with different fits to find your preference")
    
    # Enhanced skin tone tips
    if skin_tone in ["deep", "very_deep"]:
        tips.append("Rich jewel tones (emerald, sapphire, ruby) look stunning on you")
        tips.append("Bright colors and metallics make your skin glow")
    elif skin_tone == "dark":
        tips.append("Warm colors like terracotta, gold, and warm reds are flattering")
        tips.append("Bold patterns and bright shades make you stand out")
    elif skin_tone == "medium":
        tips.append("Both warm and cool tones work well - experiment!")
        tips.append("Earth tones and jewel tones are particularly complementary")
    elif skin_tone in ["light", "very_light"]:
        tips.append("Soft pastels and light colors are very flattering")
        tips.append("Jewel tones also create beautiful contrast with your skin")
    
    return tips


def analyze_outfit_match(outfit_image: str, product_image_url: str, product: dict) -> Dict:
    """
    Analyze how well a product matches with an outfit image.
    
    Args:
        outfit_image: Base64 encoded outfit image
        product_image_url: URL or base64 of product image
        product: Product information dict
        
    Returns:
        Dictionary with match analysis
    """
    try:
        # Decode outfit image
        outfit_img = decode_base64_image(outfit_image)

        # Detect features
        detected_gender = detect_gender_from_image(outfit_img)
        detected_body_type = detect_body_type(outfit_img, detected_gender)
        skin_tone = detect_skin_tone(outfit_img)

        # Get dominant colors from outfit
        outfit_colors = get_dominant_colors(outfit_img, num_colors=5)
        dominant_color_names = [get_color_name(color) for color in outfit_colors[:4]]

        # Try to get product image colors
        product_colors = []
        if product_image_url:
            try:
                if product_image_url.startswith("data:image"):
                    product_img = decode_base64_image(product_image_url)
                    product_colors = get_dominant_colors(product_img, num_colors=3)
                elif product_image_url.startswith("http"):
                    product_path = _download_image_to_temp(product_image_url, CLOTH_DIR, "cloth_")
                    if product_path:
                        product_img = Image.open(product_path)
                        product_colors = get_dominant_colors(product_img, num_colors=3)
            except Exception:
                product_colors = []

        # Calculate color harmony
        harmony_description = "Complementary"
        harmony_score = 70

        if product_colors and outfit_colors:
            harmony_description, harmony_score = analyze_color_harmony(outfit_colors, product_colors[0])

        # Analyze category/style match
        product_category = product.get("category", "").lower()
        product_name = product.get("name", "").lower()

        style_match = "Great versatile piece"
        suggestions = []

        # Category-specific suggestions
        if "footwear" in product_category or any(word in product_name for word in ["shoe", "boot", "sneaker"]):
            style_match = "Footwear that completes your look with balanced proportions"
            suggestions = [
                "This footwear adds a clean finishing touch",
                "Pairs well with casual and smart-casual outfits",
                "Consider color-matching with your accessories"
            ]
        elif "fashion" in product_category or any(word in product_name for word in ["shirt", "dress", "top", "jacket"]):
            style_match = "Statement piece that complements your current outfit structure"
            suggestions = [
                "Layer with complementary colors for depth",
                "Balance the silhouette with fitted bottoms",
                "Great for both day and evening styling"
            ]
        elif "accessories" in product_category or any(word in product_name for word in ["watch", "bag", "belt"]):
            style_match = "Accessory that elevates your outfit without overpowering it"
            suggestions = [
                "Accessories can tie the whole outfit together",
                "Mix textures for added visual interest",
                "Keep metals consistent for a refined look"
            ]
        else:
            suggestions = [
                "This item complements your style well",
                "Try pairing with neutral tones for balance",
                "Works nicely for multiple occasions"
            ]

        # Add color-based and personal styling tips
        if harmony_score >= 85:
            suggestions.insert(0, "Strong color harmony for a cohesive look")
        elif harmony_score < 60:
            suggestions.insert(0, "Balance bold colors with neutral pieces")

        personal_tips = get_styling_tips(detected_gender, detected_body_type, skin_tone)
        for tip in personal_tips[:2]:
            suggestions.append(tip)

        # Compute match score with multiple factors
        style_score = 78 if product_category else 70
        match_score = int((harmony_score * 0.7) + (style_score * 0.3))
        match_score = max(35, min(95, match_score))

        # Generate preview image (virtual try-on if possible)
        preview_base64 = None
        try:
            person_path = _save_base64_to_temp(outfit_image, PERSON_DIR, "person_")
            cloth_path = None

            if product_image_url.startswith("data:image"):
                cloth_path = _save_base64_to_temp(product_image_url, CLOTH_DIR, "cloth_")
            elif product_image_url.startswith("http"):
                cloth_path = _download_image_to_temp(product_image_url, CLOTH_DIR, "cloth_")

            if person_path and cloth_path:
                output_filename = f"tryon_{uuid.uuid4().hex}.png"
                output_path = os.path.join(OUTPUT_DIR, output_filename)

                service = get_virtual_tryon_service()
                result = service.generate_tryon(
                    person_image_path=person_path,
                    cloth_image_path=cloth_path,
                    output_path=output_path
                )

                if result.get("success") and os.path.exists(output_path):
                    preview_base64 = image_to_base64(output_path)
        except Exception:
            preview_base64 = None

        if preview_base64 is None:
            preview_base64 = create_outfit_preview(outfit_img, product_image_url)

        return {
            "matchScore": match_score,
            "colorHarmony": harmony_description,
            "styleMatch": style_match,
            "suggestions": suggestions[:4],
            "previewImage": preview_base64,
            "detectedGender": detected_gender,
            "detectedBodyType": detected_body_type,
            "skinTone": skin_tone,
            "dominantColors": dominant_color_names
        }
        
    except Exception as e:
        # Return default values on error
        return {
            "matchScore": 75,
            "colorHarmony": "Complementary",
            "styleMatch": "Good match with most styles",
            "suggestions": [
                "This piece offers great versatility",
                "Try pairing with complementary colors",
                "Would work well for casual occasions"
            ],
            "previewImage": None,
            "detectedGender": "unknown",
            "detectedBodyType": "average",
            "skinTone": "medium",
            "dominantColors": []
        }


def color_distance(color1: Tuple[int, int, int], color2: Tuple[int, int, int]) -> float:
    """Calculate Euclidean distance between two RGB colors."""
    return np.sqrt(
        (color1[0] - color2[0]) ** 2 +
        (color1[1] - color2[1]) ** 2 +
        (color1[2] - color2[2]) ** 2
    )
