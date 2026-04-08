import subprocess
import threading
import sys
import os
import signal
import time

def read_stream(stream, prefix, color):
    # Terminal color codes
    reset = "\033[0m"
    while True:
        line = stream.readline()
        if not line:
            break
        # Print with color prefix
        print(f"{color}[{prefix}]{reset} {line.strip()}", flush=True)

def main():
    print("\033[96m=== Starting Forge-X Pipeline ===\033[0m")
    
    # We use CREATE_NEW_PROCESS_GROUP on Windows to separate signals 
    # and allowing taskkill to nuke the whole process tree.
    kwargs = {}
    if os.name == 'nt':
        kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
        
    frontend_process = None
    backend_process = None
    
    try:
        # Start Backend (Flask endpoint)
        print("\033[94m[SYSTEM] Starting Flask Backend...\033[0m")
        
        backend_python = sys.executable
        venv_python = os.path.join(os.getcwd(), "backend", "venv", "Scripts", "python.exe")
        if os.path.exists(venv_python):
            backend_python = venv_python
            
        backend_cmd = [backend_python, "-u", "app.py"]
        
        # Ensure environment knows we want unbuffered output
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONIOENCODING"] = "utf-8"

        backend_process = subprocess.Popen(
            backend_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            cwd="backend",
            env=env,
            **kwargs
        )
        # Background thread to pipe backend output
        threading.Thread(target=read_stream, args=(backend_process.stdout, "BACKEND", "\033[94m"), daemon=True).start()

        # Start Frontend (Vite server)
        print("\033[92m[SYSTEM] Starting Vite Frontend...\033[0m")
        
        frontend_cmd = "npm run dev"
        frontend_process = subprocess.Popen(
            frontend_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            cwd="frontend",
            shell=True,
            **kwargs
        )
        # Background thread to pipe frontend output
        threading.Thread(target=read_stream, args=(frontend_process.stdout, "FRONTEND", "\033[92m"), daemon=True).start()

        # Keep main thread alive waiting for KeyboardInterrupt (Ctrl+C)
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\033[91m[SYSTEM] Shutting down Forge-X Pipeline...\033[0m")
    finally:
        # Cleanup
        # Important: taskkill gracefully tears down the entire subtree on Windows
        # specifically avoiding hanging Vite/Node ports.
        if os.name == 'nt':
            if frontend_process:
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if backend_process:
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(backend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            if frontend_process:
                frontend_process.terminate()
            if backend_process:
                backend_process.terminate()
        
        print("\033[96m=== Forge-X Pipeline Stopped ===\033[0m")
        sys.exit(0)

if __name__ == "__main__":
    main()
