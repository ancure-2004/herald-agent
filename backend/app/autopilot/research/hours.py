from typing import Any, Dict, List, Optional


def parse_places_opening_hours(places_hours: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Parses Google Places regularOpeningHours into a truthful hours object."""
    if not places_hours or not places_hours.get("periods"):
        return {"verified": False, "notes": "Call to confirm hours", "schedule": []}

    weekday_descs = places_hours.get("weekdayDescriptions", [])
    day_map = {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"}
    periods = places_hours.get("periods", [])

    schedule: List[Dict[str, Any]] = []
    # Build schedule by day
    for d_idx in range(7):
        day_name = day_map[(d_idx + 1) % 7]  # Monday to Sunday
        target_day_idx = (d_idx + 1) % 7
        day_periods = [p for p in periods if (p.get("open", {}).get("day")) == target_day_idx]
        if not day_periods:
            schedule.append({"day": day_name, "open": "", "close": "", "isClosed": True, "status": "Closed"})
        else:
            first_p = day_periods[0]
            last_p = day_periods[-1]
            o_h = first_p.get("open", {}).get("hour", 10)
            o_m = first_p.get("open", {}).get("minute", 0)
            c_h = last_p.get("close", {}).get("hour", 20)
            c_m = last_p.get("close", {}).get("minute", 0)
            open_str = f"{o_h % 12 or 12}:{o_m:02d} {'AM' if o_h < 12 else 'PM'}"
            close_str = f"{c_h % 12 or 12}:{c_m:02d} {'AM' if c_h < 12 else 'PM'}"
            schedule.append(
                {"day": day_name, "open": open_str, "close": close_str, "isClosed": False, "status": "Open"}
            )

    sun_entry = next((s for s in schedule if s["day"] == "Sunday"), None)
    if weekday_descs:
        notes = "; ".join(weekday_descs[:2])
    elif sun_entry and sun_entry["isClosed"]:
        notes = "Monday to Saturday. Sunday: Closed."
    else:
        notes = "Open daily. Prior appointment recommended."

    return {"verified": True, "notes": notes, "schedule": schedule}
