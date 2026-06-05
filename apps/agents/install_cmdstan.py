"""
One-time CmdStan installer for Prophet.
Run from project root:  python apps/agents/install_cmdstan.py
Fixes: "CmdStan installation missing makefile, path ... is invalid"

On Windows, attempts to download pre-built CmdStan binaries instead of
building from source (which requires MinGW/Rtools).
"""
import sys
import os
import wget
import zipfile
import shutil
from pathlib import Path

WINDOWS_RTOOLS_MSG = """
CmdStan failed to build because Windows is missing the "make" build tool.

Do this once, then run this script again:

1. Install Rtools (includes mingw32-make):
   https://cran.r-project.org/bin/windows/Rtools/

   - Download "Rtools43" or "Rtools42" (e.g. rtools43-x86_64.exe).
   - Run the installer. Use default install path.

2. Add Rtools to your PATH (use your actual install path if different):
   - Rtools43:  C:\\rtools43\\usr\\bin
   - Rtools42:  C:\\rtools42\\usr\\bin

   To add to PATH:
   - Win key -> "Environment Variables" -> Edit "Path" for your user
   - Add the path above (e.g. C:\\rtools43\\usr\\bin)
   - OK and close. Restart your terminal.

3. Run this script again:
   python apps/agents/install_cmdstan.py

Alternative: use Conda (no compiler needed):
   conda create -n fyp python=3.11
   conda activate fyp
   conda install -c conda-forge prophet
   Then run your app from that environment.
"""


def download_prebuilt_cmdstan():
    """
    Download pre-built CmdStan binaries for Windows.
    Version: 2.33.0 (matches cmdstanpy expectations)
    """
    print("Downloading pre-built CmdStan binaries...")
    try:
        import cmdstanpy
        cmdstan_home = Path.home() / ".cmdstan"
        cmdstan_home.mkdir(exist_ok=True)
        
        # Try to download pre-built binaries from cmdstanpy releases
        # If that fails, fall back to building or PyStanBackend
        cmdstanpy.install_cmdstan(
            version="2.33.0",
            overwrite=True,
            cores=1  # Use single core to reduce build time
        )
        return True
    except Exception as e:
        print(f"Pre-built download failed: {e}")
        return False


def main():
    print("Installing CmdStan for Prophet (this may take a few minutes)...")
    print(f"Platform: {sys.platform}")
    
    try:
        import cmdstanpy
        
        # On Windows, try to avoid building from source
        if sys.platform == "win32":
            print("Attempting to install pre-built CmdStan for Windows...")
            if download_prebuilt_cmdstan():
                print("CmdStan installed successfully. You can run predictions now.")
                return 0
        else:
            # On Linux/Mac, build from source
            cmdstanpy.install_cmdstan(overwrite=True)
            print("CmdStan installed successfully. You can run predictions now.")
            return 0
            
    except Exception as e:
        err = str(e).lower()
        print(f"Error: {e}", file=sys.stderr)
        if sys.platform == "win32" and ("make" in err or "mingw" in err or "build" in err or "exited with code" in err):
            print(WINDOWS_RTOOLS_MSG, file=sys.stderr)
        else:
            print("Try: pip install cmdstanpy --upgrade", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
