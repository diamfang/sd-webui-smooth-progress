import time
from fastapi import FastAPI
from modules import script_callbacks, shared

def register_api(demo: None, app: FastAPI):
    "API with accurate calculation of ETA and progress"""
    @app.get("/smooth-progress/api")
    async def get_progress():
        state = shared.state
        
        sampling_step = getattr(state, 'sampling_step', 0)
        sampling_steps = getattr(state, 'sampling_steps', 0)
        skipped = getattr(state, 'skipped', False)
        interrupted = getattr(state, 'interrupted', False)
        
        time_start = getattr(state, 'time_start', None)
        now = time.time()
        
        elapsed = (now - time_start) if (time_start and time_start > 0) else 0.0
        active = sampling_steps > 0 and sampling_step < sampling_steps and not (skipped or interrupted)
        
        progress = 0.0
        if sampling_steps > 0:
            progress = min(1.0, max(0.0, sampling_step / sampling_steps))

        # Calculating ETA based on elapsed time
        eta = 0.0
        if elapsed > 0 and progress > 0 and progress < 1.0:
            total_estimated_time = elapsed / progress
            eta = total_estimated_time - elapsed

        return {
            "active": active,
            "step": sampling_step,
            "total_steps": sampling_steps,
            "progress": round(progress, 4),
            "elapsed": round(elapsed, 2),
            "eta": max(0.1, round(eta, 2)),
            "interrupted": interrupted or skipped,
            "server_time": now
        }

script_callbacks.on_app_started(register_api)