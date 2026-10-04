"""
AgriGuard — Auto Design to Figma Automator
Automatically copies vector artboards to the Windows clipboard,
focuses your Figma window, and automatically pastes the design layers!
"""
import os
import sys
import time
import ctypes

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

kernel32.GlobalAlloc.restype = ctypes.c_void_p
kernel32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
kernel32.GlobalLock.restype = ctypes.c_void_p
kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]
user32.SetClipboardData.restype = ctypes.c_void_p
user32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]


def set_clipboard(text: str) -> bool:
    if not user32.OpenClipboard(0):
        return False
    user32.EmptyClipboard()
    encoded = text.encode("utf-16-le") + b"\x00\x00"
    h_mem = kernel32.GlobalAlloc(0x0042, len(encoded))
    p_mem = kernel32.GlobalLock(h_mem)
    ctypes.memmove(p_mem, encoded, len(encoded))
    kernel32.GlobalUnlock(h_mem)
    user32.SetClipboardData(13, h_mem)  # CF_UNICODETEXT
    user32.CloseClipboard()
    return True


def paste_into_figma():
    try:
        import win32com.client
        shell = win32com.client.Dispatch("WScript.Shell")
        if shell.AppActivate("Figma"):
            time.sleep(0.3)
            shell.SendKeys("^v")
            return True
    except Exception:
        # Fallback using powershell SendKeys
        try:
            cmd = '''powershell -Command "$ws = New-Object -ComObject Wscript.Shell; if($ws.AppActivate('Figma')) { Start-Sleep -Milliseconds 400; $ws.SendKeys('^v') }"'''
            os.system(cmd)
            return True
        except Exception:
            pass
    return False


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FIGMA_DIR = os.path.join(BASE_DIR, "docs", "figma")


FILES = {
    "1": ("Mobile App Artboard (390x844)", os.path.join(FIGMA_DIR, "AgriGuard_Mobile_Artboard.svg")),
    "2": ("Desktop EXE Station (1440x900)", os.path.join(FIGMA_DIR, "AgriGuard_Desktop_EXE_Artboard.svg")),
    "3": ("AgriGuard 4K Master Logo", os.path.join(FIGMA_DIR, "AgriGuard_Logo_4K.svg")),
}


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def load_file(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return None


def main():
    print("=" * 60)
    print("  AGRIGUARD AUTO DESIGN FOR FIGMA")
    print("=" * 60)
    print("This tool automatically copies vector UI frames directly to your")
    print("clipboard and triggers Figma to auto-paste them onto your canvas!\n")
    print("Options:")
    print("  [1] Auto-Design Mobile App Artboard (iPhone & Android)")
    print("  [2] Auto-Design Desktop EXE Workstation Artboard (Windows 11)")
    print("  [3] Auto-Design 4K Master Brand Logo")
    print("  [4] Auto-Design EVERYTHING (Mobile + Desktop + 4K Logo)")
    print("  [Q] Quit")
    print("-" * 60)

    choice = sys.argv[1] if len(sys.argv) > 1 else input("Select option [1-4, Default=4]: ").strip()
    if not choice:
        choice = "4"

    if choice == "4":
        # Combine SVGs into a single multi-artboard canvas layout
        mobile_svg = load_file(FILES["1"][1])
        desktop_svg = load_file(FILES["2"][1])
        logo_svg = load_file(FILES["3"][1])

        combined = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1100" width="2400" height="1100">
  <g transform="translate(60, 100)">
    {mobile_svg}
  </g>
  <g transform="translate(520, 100)">
    {desktop_svg}
  </g>
  <g transform="translate(2020, 100)">
    {logo_svg}
  </g>
</svg>"""
        set_clipboard(combined)
        print("\n✅ All Artboards (Mobile + Desktop + Logo) copied to Clipboard!")
        print("⚡ Activating Figma & sending paste command (Ctrl + V)...")
        paste_into_figma()
        print("🎉 Done! Switch to Figma to see your new editable vector frames.")
    elif choice in FILES:
        name, path = FILES[choice]
        svg_content = load_file(path)
        if svg_content:
            set_clipboard(svg_content)
            print(f"\n✅ {name} copied to Clipboard!")
            print("⚡ Activating Figma & sending paste command (Ctrl + V)...")
            paste_into_figma()
            print("🎉 Done! Switch to Figma to see your new editable vector frame.")
        else:
            print(f"Error: {path} not found.")


if __name__ == "__main__":
    main()
