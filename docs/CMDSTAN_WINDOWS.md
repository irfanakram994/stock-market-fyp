# Fix: CmdStan "missing makefile" / invalid path on Windows

Prophet needs **CmdStan**. On Windows, CmdStan must be **built** from source, which requires the **make** tool (from Rtools).

## What you saw

- **Error:** `CmdStan installation missing makefile, path ...\cmdstan-2.33.1 is invalid`
- **Or:** `Command "make build" failed` / `mingw32-make` / `No such file or directory`

That means CmdStan was never built correctly (or the build failed because `make` is missing).

## Fix (choose one)

### Option A – Install Rtools, then CmdStan (recommended if you use pip)

1. **Install Rtools** (includes `mingw32-make` and compiler):
   - https://cran.r-project.org/bin/windows/Rtools/
   - Download **Rtools43** or **Rtools42** (e.g. `rtools43-x86_64.exe`).
   - Run the installer (default path is fine, e.g. `C:\rtools43`).

2. **Add Rtools to PATH**
   - Press Win key, type **Environment Variables**, open **Edit environment variables for your account**.
   - Under **User variables** select **Path** → **Edit** → **New**.
   - Add (adjust if you chose another path):
     - Rtools43: `C:\rtools43\usr\bin`
     - Rtools42: `C:\rtools42\usr\bin`
   - Confirm with OK, then **close and reopen** your terminal (or VS Code/Cursor).

3. **Re-run the CmdStan installer** from the project root:
   ```powershell
   cd c:\Users\Ultron\Documents\FYP-1
   python apps/agents/install_cmdstan.py
   ```
   Wait until it finishes (download + build). Then run your prediction again.

### Option B – Use Conda (no compiler needed)

Conda can install Prophet and CmdStan with pre-built binaries:

```powershell
conda create -n fyp python=3.11
conda activate fyp
conda install -c conda-forge prophet
cd c:\Users\Ultron\Documents\FYP-1
# run your app (e.g. npm run dev, and use this Python for the agents)
```

Use that environment whenever you run the app so Prophet uses the Conda-installed CmdStan.

## Verify

After Option A or B, run a prediction again (e.g. AAPL, 30 days). If CmdStan is set up correctly, the "missing makefile" / invalid path error should be gone.
