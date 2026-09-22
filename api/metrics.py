from http.server import BaseHTTPRequestHandler
import json
import math
import os
import urllib.error
import urllib.request

import pandas as pd

TZ = "America/Santiago"
LOG_COLS = ["date", "hours_worked", "task_description", "category", "is_in_person"]


class AuthError(Exception):
    pass


def r(x):
    return round(float(x), 2)


def fetch(table, columns, token):
    """Lee una tabla con el token del usuario: RLS devuelve solo sus filas."""
    url = f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/{table}?select={columns}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": os.environ["SUPABASE_ANON_KEY"],
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise AuthError()
        raise


def compute(profile, logs, tasks):
    today = pd.Timestamp.now(tz=TZ).normalize().tz_localize(None)
    week0 = today - pd.Timedelta(days=int(today.weekday()))  # lunes de esta semana
    required = float(profile.get("required_hours") or 360)
    target = float(profile.get("weekly_hours_target") or 30)

    # ---------- Bitácora (horas cumplidas) ----------
    df = pd.DataFrame(logs, columns=LOG_COLS)
    df["date"] = pd.to_datetime(df["date"])
    df["hours_worked"] = pd.to_numeric(df["hours_worked"]).astype(float)
    df["category"] = df["category"].fillna("Otro")
    df["is_in_person"] = df["is_in_person"].fillna(False).astype(bool)

    total = float(df["hours_worked"].sum())
    remaining = max(required - total, 0.0)
    percent = min(total / required * 100, 100.0) if required > 0 else 0.0

    # ---------- Horas por semana (últimas 8, con ceros) ----------
    idx = pd.date_range(week0 - pd.Timedelta(weeks=7), periods=8, freq="7D")
    weekly = pd.Series(0.0, index=idx)
    if not df.empty:
        df["week"] = df["date"] - pd.to_timedelta(df["date"].dt.weekday, unit="D")
        weekly = df.groupby("week")["hours_worked"].sum().reindex(idx, fill_value=0.0)
    this_week = float(weekly.iloc[-1])

    # ---------- Ritmo real: promedio de las últimas 4 semanas completas ----------
    avg, source = None, "meta"
    if not df.empty:
        past = weekly.iloc[:-1]
        past = past[past.index >= df["week"].min()].tail(4)
        if len(past) > 0 and past.mean() > 0:
            avg, source = float(past.mean()), "real"

    if source == "real" and target > 0:
        ratio = avg / target
        status = "adelantado" if ratio >= 1.05 else "en_ritmo" if ratio >= 0.85 else "atrasado"
    else:
        ratio, status = None, "sin_datos"

    # ---------- Proyección de término ----------
    pace = avg if source == "real" else target
    weeks_left, end_date = None, None
    if remaining > 0 and pace > 0:
        weeks_left = int(math.ceil(remaining / pace))
        end_date = (today + pd.Timedelta(weeks=weeks_left)).strftime("%Y-%m-%d")

    # ---------- Plan (tareas planificadas) ----------
    tk = pd.DataFrame(tasks, columns=["status", "due_date", "planned_hours"])
    tk["due_date"] = pd.to_datetime(tk["due_date"])
    tk["planned_hours"] = pd.to_numeric(tk["planned_hours"]).fillna(0.0).astype(float)
    is_open = tk["status"] != "done"
    planned_total = float(tk["planned_hours"].sum())
    done_planned = float(tk.loc[~is_open, "planned_hours"].sum())
    due_to_date = float(tk.loc[tk["due_date"] <= today, "planned_hours"].sum())
    overdue = is_open & (tk["due_date"] < today)

    # ---------- Desgloses ----------
    cats = df.groupby("category")["hours_worked"].sum().sort_values(ascending=False)
    in_person = float(df.loc[df["is_in_person"], "hours_worked"].sum())
    recent = df.sort_values("date", ascending=False).head(5)

    return {
        "generated_at": pd.Timestamp.now(tz=TZ).isoformat(),
        "progress": {"total": r(total), "required": r(required), "percent": r(percent), "remaining": r(remaining)},
        "pace": {
            "this_week": r(this_week),
            "target": r(target),
            "avg_recent": None if avg is None else r(avg),
            "ratio": None if ratio is None else r(ratio),
            "source": source,
            "status": status,
        },
        "projection": {"weeks_left": weeks_left, "end_date": end_date},
        "weekly": [{"week": d.strftime("%Y-%m-%d"), "hours": r(h)} for d, h in weekly.items()],
        "plan": {
            "planned_total": r(planned_total),
            "done": r(done_planned),
            "due_to_date": r(due_to_date),
            "delta": r(done_planned - due_to_date),
            "overdue_count": int(overdue.sum()),
            "overdue_hours": r(tk.loc[overdue, "planned_hours"].sum()),
            "pending_count": int(is_open.sum()),
        },
        "categories": [{"name": n, "hours": r(h)} for n, h in cats.items()],
        "modality": {"in_person": r(in_person), "remote": r(total - in_person)},
        "recent": [
            {"date": row.date.strftime("%Y-%m-%d"), "description": row.task_description or "", "hours": r(row.hours_worked)}
            for row in recent.itertuples()
        ],
    }


class handler(BaseHTTPRequestHandler):
    def _send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return self._send(401, {"error": "Falta el token de sesión"})
        token = auth[7:]
        try:
            profile = (fetch("profiles", "required_hours,weekly_hours_target", token) or [{}])[0]
            logs = fetch("work_logs", ",".join(LOG_COLS), token)
            tasks = fetch("tasks", "status,due_date,planned_hours", token)
            self._send(200, compute(profile, logs, tasks))
        except AuthError:
            self._send(401, {"error": "Sesión no válida"})
        except Exception as e:
            print("metrics error:", repr(e))
            self._send(500, {"error": "No se pudo calcular"})