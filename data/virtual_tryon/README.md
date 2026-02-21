# Virtual Try-On Data Directory

This directory stores temporary files for the Virtual Try-On feature.

## Structure:
- `person/` - Temporary storage for uploaded person images
- `cloth/` - Temporary storage for uploaded clothing images  
- `output/` - Generated virtual try-on results

## Note:
These directories are automatically created and managed by the backend service.
Files are cleaned up after processing to save disk space.
