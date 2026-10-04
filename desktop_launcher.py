"""
AgriGuard Desktop & Local App Launcher
Starts backend (port 8001 on 0.0.0.0) & frontend (port 3000 on 0.0.0.0),
launches secure Cloudflare public tunnel for remote access without same Wi-Fi,
bridges connected Android devices via ADB, and launches native desktop app window.
"""
import os
import sys
import time
import re
import subprocess
import webbrowser
import urllib.request
import shutil

BACKEND_PORT = 8001
FRONTEND_PORT = 3000
BACKEND_URL = f"http://127.0.0.1:{BACKEND_PORT}/api/v1/health"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"


def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def get_python_cmd():
    # Priority: Python 3.11 where ML & FastAPI dependencies are installed
    py311_path = r"C:\Users\lohit\AppData\Local\Programs\Python\Python311\python.exe"
    if os.path.exists(py311_path):
        return py311_path

    # Try py -3.11 launcher
    try:
        res = subprocess.run(["py", "-3.11", "-c", "import sys; print(sys.executable)"],
                             capture_output=True, text=True, timeout=2)
        if res.returncode == 0 and res.stdout.strip() and os.path.exists(res.stdout.strip()):
            return res.stdout.strip()
    except Exception:
        pass

    return sys.executable if not getattr(sys, 'frozen', False) else "python"


def is_service_ready(url, timeout=1.5):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status in (200, 304)
    except Exception:
        return False


def setup_adb_port_forwarding():
    """If an Android phone is connected via USB, bridge ports 3000 and 8001."""
    adb_bin = shutil.which("adb")
    if not adb_bin:
        default_adb = os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe")
        if os.path.exists(default_adb):
            adb_bin = default_adb

    if adb_bin:
        try:
            print("[AgriGuard] Configuring ADB port forwarding for Android device...")
            subprocess.run([adb_bin, "reverse", f"tcp:{FRONTEND_PORT}", f"tcp:{FRONTEND_PORT}"],
                           capture_output=True, timeout=3)
            subprocess.run([adb_bin, "reverse", f"tcp:{BACKEND_PORT}", f"tcp:{BACKEND_PORT}"],
                           capture_output=True, timeout=3)
            print("[AgriGuard] Android reverse bridge active (phone can access http://localhost:3000).")
        except Exception:
            pass


def start_tunnel(base_dir):
    """Starts cloudflared tunnel so friends anywhere can access without same Wi-Fi."""
    cf_bin = os.path.join(base_dir, "cloudflared.exe")
    if not os.path.exists(cf_bin):
        cf_bin = shutil.which("cloudflared")
    if not cf_bin:
        return None, None

    print("[AgriGuard] Initializing public internet tunnel for remote friends...")
    log_file = os.path.join(base_dir, "tunnel.log")
    try:
        with open(log_file, "w") as f:
            pass
    except Exception:
        pass

    stderr_f = open(log_file, "a")
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    proc = subprocess.Popen(
        [cf_bin, "tunnel", "--url", f"http://localhost:{FRONTEND_PORT}"],
        stdout=subprocess.DEVNULL,
        stderr=stderr_f,
        creationflags=creationflags
    )

    public_url = None
    for _ in range(30):
        time.sleep(0.5)
        if os.path.exists(log_file):
            try:
                with open(log_file, "r") as f:
                    content = f.read()
                    match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
                    if match:
                        public_url = match.group(0)
                        break
            except Exception:
                pass

    if public_url:
        online_file = os.path.join(base_dir, "ONLINE_URL.txt")
        try:
            with open(online_file, "w") as f:
                f.write(f"AgriGuard Public Share Link:\n{public_url}\n\nShare this link with your friends on mobile or PC (no same Wi-Fi needed)!\nEach friend can create their own account and save their own crop data.\n")
        except Exception:
            pass
        print("\n" + "=" * 66)
        print(" 🌍 SHARE WITH FRIENDS ANYWHERE (NO SAME WI-FI NEEDED):")
        print(f"    {public_url}")
        print("    (Saved to ONLINE_URL.txt - copy & send to friends via WhatsApp!)")
        print("=" * 66 + "\n")

    return proc, public_url


def start_backend(base_dir):
    if is_service_ready(BACKEND_URL):
        print(f"[AgriGuard] Backend already running on port {BACKEND_PORT}.")
        return None

    backend_dir = os.path.join(base_dir, "backend")
    if not os.path.exists(backend_dir):
        print(f"[Error] Backend directory not found at {backend_dir}")
        return None

    python_cmd = get_python_cmd()
    print(f"[AgriGuard] Starting FastAPI backend on port {BACKEND_PORT} using {python_cmd}...")
    cmd = [
        python_cmd,
        "-m", "uvicorn",
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", str(BACKEND_PORT)
    ]
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    proc = subprocess.Popen(
        cmd,
        cwd=backend_dir,
        creationflags=creationflags,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    return proc


def start_frontend(base_dir):
    if is_service_ready(FRONTEND_URL):
        print(f"[AgriGuard] Frontend already running on port {FRONTEND_PORT}.")
        return None

    frontend_dir = os.path.join(base_dir, "frontend")
    if not os.path.exists(frontend_dir):
        print(f"[Error] Frontend directory not found at {frontend_dir}")
        return None

    print(f"[AgriGuard] Starting Next.js frontend on port {FRONTEND_PORT}...")
    npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
    cmd = [npm_cmd, "run", "dev"]

    creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    proc = subprocess.Popen(
        cmd,
        cwd=frontend_dir,
        creationflags=creationflags,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    return proc


def launch_window():
    app_url = FRONTEND_URL

    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]

    for p in edge_paths + chrome_paths:
        if os.path.exists(p):
            print(f"[AgriGuard] Launching desktop application window with: {p}")
            cmd = [p, f"--app={app_url}", "--window-size=1200,850", "--window-position=100,100"]
            window_proc = subprocess.Popen(cmd)
            return window_proc

    print("[AgriGuard] Launching in default web browser...")
    webbrowser.open(app_url)
    return None


def main():
    print("=" * 66)
    print("      AgriGuard - AI Crop Health Server & Desktop Launcher")
    print("=" * 66)

    base_dir = get_base_dir()

    setup_adb_port_forwarding()
    backend_proc = start_backend(base_dir)
    frontend_proc = start_frontend(base_dir)

    print("[AgriGuard] Waiting for application services to initialize...")
    for _ in range(30):
        if is_service_ready(BACKEND_URL) and is_service_ready(FRONTEND_URL):
            print("[AgriGuard] All local services are online!")
            break
        time.sleep(0.5)

    tunnel_proc, public_url = start_tunnel(base_dir)
    window_proc = launch_window()

    if window_proc:
        try:
            window_proc.wait()
            print("[AgriGuard] Desktop window closed.")
        except KeyboardInterrupt:
            pass
        finally:
            print("[AgriGuard] Cleaning up background services...")
            if tunnel_proc:
                try:
                    tunnel_proc.terminate()
                except Exception:
                    pass
            if backend_proc:
                try:
                    backend_proc.terminate()
                except Exception:
                    pass
            if frontend_proc:
                try:
                    frontend_proc.terminate()
                except Exception:
                    pass


if __name__ == "__main__":
    main()
