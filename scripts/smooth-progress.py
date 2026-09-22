import time
from fastapi import FastAPI
from modules import script_callbacks, shared

# --- Per-step ETA tracking ----------------------------------------------------
# The raw ``elapsed / progress - elapsed`` ratio ramps *up* inside each step
# interval because ``sampling_step`` stays frozen while wall-clock time keeps
# growing; the displayed timer then crept upward instead of counting down and
# bounced between two values at integer boundaries. Instead we keep a small
# cross-request tracker of how long completed steps actually took and subtract
# the time already spent inside the current step:
#
#     eta = (steps_remaining) * avg_step_sec - min(time_in_step, avg_step_sec)
#
# That estimate decreases smoothly (~1/s) within a step and drops by exactly
# one step duration at each boundary - a normal countdown.
_tr_key = None
_tr = None


def _step_eta(tracker, step, steps, now, elapsed):
    """Estimate remaining seconds from per-step durations.

    Returns ``(eta, tracker)`` where ``tracker`` is ``None`` until usable data exists.
    """
    if tracker is None:
        # Start tracking this job; no usable per-step data yet (eta unknown).
        tracker = {'step': int(step), 'step_ts': now, 'dur_sum': 0.0, 'dur_n': 0}
        return (0.0, tracker)

    if tracker['step'] != step:
        # One or more steps completed since the previous observation: fold the wall
        # time between observations into the running total (split across advanced
        # steps). This keeps avg_step_sec close to the real mean step duration.
        advanced = step - tracker['step']
        dt = max(0.0, now - tracker['step_ts'])
        if advanced > 0:
            tracker['dur_sum'] += dt
            tracker['dur_n'] += advanced
        tracker['step'] = int(step)
        tracker['step_ts'] = now

    if tracker['dur_n'] <= 0:
        return (0.0, tracker)

    avg_step_sec = tracker['dur_sum'] / tracker['dur_n']
    if avg_step_sec <= 0.0:
        return (0.0, tracker)

    # Time already spent inside the current step, capped at one step's worth so
    # throttled/missed polls cannot drive the estimate negative.
    in_step_sec = min(now - tracker['step_ts'], avg_step_sec)
    eta = (steps - step) * avg_step_sec - in_step_sec
    return (max(0.0, eta), tracker)


def register_api(demo: None, app: FastAPI):
    "API with accurate calculation of ETA and progress"""
    @app.get("/smooth-progress/api")
    async def get_progress():
        global _tr_key, _tr
        state = shared.state
        
        sampling_step = getattr(state, 'sampling_step', 0)
        sampling_steps = getattr(state, 'sampling_steps', 0)
        skipped = getattr(state, 'skipped', False)
        interrupted = getattr(state, 'interrupted', False)
        
        time_start = getattr(state, 'time_start', None)
        # Terminal-state signal: State.end() clears state.job even when the frozen
        # sampling_step/sampling_steps values keep "active" stale-true right after an
        # ultra-fast generation ends. The frontend keys completion detection on this.
        job_running = bool(getattr(state, 'job', None))
        now = time.time()
        
        elapsed = (now - time_start) if (time_start and time_start > 0) else 0.0
        active = sampling_steps > 0 and sampling_step < sampling_steps and not (skipped or interrupted)
        
        progress = 0.0
        if sampling_steps > 0:
            progress = min(1.0, max(0.0, sampling_step / sampling_steps))

        # A new job/item starts a fresh timing tracker (State.begin() refreshes
        # time_start for every generation).
        if time_start != _tr_key:
            _tr_key = time_start
            _tr = None

        # Remaining seconds from per-step durations while a job is running; fall
        # back to the legacy linear estimate otherwise.
        eta = 0.0
        if active and sampling_steps > 0:
            eta, _tr = _step_eta(_tr, sampling_step, sampling_steps, now, elapsed)
        elif elapsed > 0 and progress > 0 and progress < 1.0:
            total_estimated_time = elapsed / progress
            eta = total_estimated_time - elapsed

        return {
            "active": active,
            "job_running": job_running,
            "step": sampling_step,
            "total_steps": sampling_steps,
            "progress": round(progress, 4),
            "elapsed": round(elapsed, 2),
            "eta": max(0.1, round(eta, 2)),
            "interrupted": interrupted or skipped,
            "server_time": now,
            # Job identity token: State.begin() assigns a fresh time.time() to every new
            # job/item, and the value survives until the next begin(). The frontend uses it
            # to detect new generations and generations that finished between two polls.
            "time_start": time_start
        }

script_callbacks.on_app_started(register_api)