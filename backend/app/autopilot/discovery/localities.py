import logging
import time
import urllib.parse
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import httpx

from app.autopilot.settings import get_autopilot_settings

logger = logging.getLogger("personal_os.autopilot.localities")


@dataclass(frozen=True)
class Locality:
    label: str
    city: str
    state: str
    bbox: Tuple[float, float, float, float]  # (south, west, north, east)


# Preset 100 well-curated micro-localities across Delhi NCR
# Strictly covering Noida, Greater Noida, Gurugram, Ghaziabad, Faridabad, and Delhi
LOCALITY_PRESETS: Dict[str, Locality] = {
    # =========================================================================
    # NOIDA (15 Micro-Localities) - State: Uttar Pradesh
    # =========================================================================
    "Noida Sector 18": Locality(
        label="Noida Sector 18",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.565, 77.315, 28.575, 77.328),
    ),
    "Noida Sector 50": Locality(
        label="Noida Sector 50",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.575, 77.355, 28.588, 77.370),
    ),
    "Noida Sector 62": Locality(
        label="Noida Sector 62",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.615, 77.355, 28.635, 77.375),
    ),
    "Noida Sector 75": Locality(
        label="Noida Sector 75",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.570, 77.380, 28.580, 77.395),
    ),
    "Noida Sector 76": Locality(
        label="Noida Sector 76",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.560, 77.380, 28.575, 77.395),
    ),
    "Noida Sector 78": Locality(
        label="Noida Sector 78",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.560, 77.395, 28.575, 77.410),
    ),
    "Noida Sector 104": Locality(
        label="Noida Sector 104",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.535, 77.355, 28.550, 77.370),
    ),
    "Noida Sector 137": Locality(
        label="Noida Sector 137",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.505, 77.400, 28.520, 77.415),
    ),
    "Noida Sector 128": Locality(
        label="Noida Sector 128",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.510, 77.355, 28.530, 77.375),
    ),
    "Noida Sector 44": Locality(
        label="Noida Sector 44",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.545, 77.325, 28.560, 77.340),
    ),
    "Noida Sector 29": Locality(
        label="Noida Sector 29",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.565, 77.330, 28.578, 77.345),
    ),
    "Noida Sector 52": Locality(
        label="Noida Sector 52",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.585, 77.360, 28.600, 77.375),
    ),
    "Noida Sector 93": Locality(
        label="Noida Sector 93",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.515, 77.375, 28.530, 77.390),
    ),
    "Noida Sector 135": Locality(
        label="Noida Sector 135",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.485, 77.395, 28.505, 77.415),
    ),
    "Noida Sector 150": Locality(
        label="Noida Sector 150",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.430, 77.460, 28.450, 77.485),
    ),

    # =========================================================================
    # GREATER NOIDA (8 Micro-Localities) - State: Uttar Pradesh
    # =========================================================================
    "Greater Noida West": Locality(
        label="Greater Noida West",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.580, 77.420, 28.610, 77.460),
    ),
    "Gaur City 1 Greater Noida": Locality(
        label="Gaur City 1 Greater Noida",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.605, 77.425, 28.620, 77.440),
    ),
    "Gaur City 2 Greater Noida": Locality(
        label="Gaur City 2 Greater Noida",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.605, 77.435, 28.620, 77.450),
    ),
    "Greater Noida Pari Chowk": Locality(
        label="Greater Noida Pari Chowk",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.455, 77.500, 28.470, 77.520),
    ),
    "Greater Noida Alpha 1": Locality(
        label="Greater Noida Alpha 1",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.465, 77.505, 28.480, 77.520),
    ),
    "Greater Noida Beta 1": Locality(
        label="Greater Noida Beta 1",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.475, 77.495, 28.490, 77.510),
    ),
    "Greater Noida Gamma 1": Locality(
        label="Greater Noida Gamma 1",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.480, 77.505, 28.495, 77.520),
    ),
    "Greater Noida Knowledge Park": Locality(
        label="Greater Noida Knowledge Park",
        city="Greater Noida",
        state="Uttar Pradesh",
        bbox=(28.450, 77.480, 28.470, 77.505),
    ),

    # =========================================================================
    # GURUGRAM (25 Micro-Localities) - State: Haryana
    # =========================================================================
    "DLF Phase 1 Gurugram": Locality(
        label="DLF Phase 1 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.470, 77.090, 28.485, 77.108),
    ),
    "DLF Phase 2 Gurugram": Locality(
        label="DLF Phase 2 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.475, 77.075, 28.490, 77.095),
    ),
    "DLF Phase 3 Gurugram": Locality(
        label="DLF Phase 3 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.485, 77.090, 28.505, 77.110),
    ),
    "DLF Phase 4 Gurugram": Locality(
        label="DLF Phase 4 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.460, 77.075, 28.475, 77.090),
    ),
    "DLF Phase 5 Gurugram": Locality(
        label="DLF Phase 5 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.445, 77.085, 28.460, 77.105),
    ),
    "Golf Course Road Gurugram": Locality(
        label="Golf Course Road Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.440, 77.090, 28.465, 77.110),
    ),
    "Golf Course Extension Gurugram": Locality(
        label="Golf Course Extension Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.405, 77.070, 28.425, 77.095),
    ),
    "Sohna Road Gurugram": Locality(
        label="Sohna Road Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.400, 77.030, 28.435, 77.055),
    ),
    "Sushant Lok 1 Gurugram": Locality(
        label="Sushant Lok 1 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.460, 77.070, 28.475, 77.088),
    ),
    "South City 1 Gurugram": Locality(
        label="South City 1 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.455, 77.055, 28.470, 77.070),
    ),
    "South City 2 Gurugram": Locality(
        label="South City 2 Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.415, 77.050, 28.430, 77.068),
    ),
    "Gurugram Sector 14": Locality(
        label="Gurugram Sector 14",
        city="Gurugram",
        state="Haryana",
        bbox=(28.465, 77.035, 28.480, 77.050),
    ),
    "Gurugram Sector 15": Locality(
        label="Gurugram Sector 15",
        city="Gurugram",
        state="Haryana",
        bbox=(28.455, 77.035, 28.470, 77.050),
    ),
    "Gurugram Sector 23": Locality(
        label="Gurugram Sector 23",
        city="Gurugram",
        state="Haryana",
        bbox=(28.500, 77.045, 28.518, 77.065),
    ),
    "Gurugram Sector 31": Locality(
        label="Gurugram Sector 31",
        city="Gurugram",
        state="Haryana",
        bbox=(28.445, 77.045, 28.460, 77.060),
    ),
    "Gurugram Sector 46": Locality(
        label="Gurugram Sector 46",
        city="Gurugram",
        state="Haryana",
        bbox=(28.430, 77.055, 28.445, 77.070),
    ),
    "Gurugram Sector 47": Locality(
        label="Gurugram Sector 47",
        city="Gurugram",
        state="Haryana",
        bbox=(28.420, 77.045, 28.435, 77.060),
    ),
    "Gurugram Sector 49": Locality(
        label="Gurugram Sector 49",
        city="Gurugram",
        state="Haryana",
        bbox=(28.405, 77.045, 28.420, 77.060),
    ),
    "Gurugram Sector 54": Locality(
        label="Gurugram Sector 54",
        city="Gurugram",
        state="Haryana",
        bbox=(28.435, 77.100, 28.450, 77.118),
    ),
    "Gurugram Sector 55": Locality(
        label="Gurugram Sector 55",
        city="Gurugram",
        state="Haryana",
        bbox=(28.425, 77.100, 28.440, 77.118),
    ),
    "Gurugram Sector 56": Locality(
        label="Gurugram Sector 56",
        city="Gurugram",
        state="Haryana",
        bbox=(28.425, 77.090, 28.440, 77.108),
    ),
    "Gurugram Sector 57": Locality(
        label="Gurugram Sector 57",
        city="Gurugram",
        state="Haryana",
        bbox=(28.420, 77.075, 28.435, 77.095),
    ),
    "Gurugram Sector 65": Locality(
        label="Gurugram Sector 65",
        city="Gurugram",
        state="Haryana",
        bbox=(28.395, 77.065, 28.410, 77.085),
    ),
    "Gurugram Sector 82": Locality(
        label="Gurugram Sector 82",
        city="Gurugram",
        state="Haryana",
        bbox=(28.385, 76.955, 28.405, 76.975),
    ),
    "Dwarka Expressway Gurugram": Locality(
        label="Dwarka Expressway Gurugram",
        city="Gurugram",
        state="Haryana",
        bbox=(28.445, 76.970, 28.485, 77.010),
    ),

    # =========================================================================
    # GHAZIABAD (8 Micro-Localities) - State: Uttar Pradesh
    # =========================================================================
    "Indirapuram Ghaziabad": Locality(
        label="Indirapuram Ghaziabad",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.630, 77.360, 28.655, 77.385),
    ),
    "Ahinsa Khand Indirapuram": Locality(
        label="Ahinsa Khand Indirapuram",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.635, 77.370, 28.648, 77.385),
    ),
    "Vaishali Ghaziabad": Locality(
        label="Vaishali Ghaziabad",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.635, 77.330, 28.655, 77.350),
    ),
    "Vasundhara Ghaziabad": Locality(
        label="Vasundhara Ghaziabad",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.650, 77.360, 28.670, 77.385),
    ),
    "Kaushambi Ghaziabad": Locality(
        label="Kaushambi Ghaziabad",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.635, 77.315, 28.650, 77.330),
    ),
    "Raj Nagar Ghaziabad": Locality(
        label="Raj Nagar Ghaziabad",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.675, 77.430, 28.695, 77.455),
    ),
    "Raj Nagar Extension Ghaziabad": Locality(
        label="Raj Nagar Extension Ghaziabad",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.700, 77.410, 28.725, 77.435),
    ),
    "Crossings Republik Ghaziabad": Locality(
        label="Crossings Republik Ghaziabad",
        city="Ghaziabad",
        state="Uttar Pradesh",
        bbox=(28.620, 77.430, 28.640, 77.455),
    ),

    # =========================================================================
    # FARIDABAD (8 Micro-Localities) - State: Haryana
    # =========================================================================
    "Faridabad Sector 15": Locality(
        label="Faridabad Sector 15",
        city="Faridabad",
        state="Haryana",
        bbox=(28.405, 77.315, 28.420, 77.330),
    ),
    "Faridabad Sector 16": Locality(
        label="Faridabad Sector 16",
        city="Faridabad",
        state="Haryana",
        bbox=(28.405, 77.325, 28.420, 77.340),
    ),
    "Faridabad Sector 21C": Locality(
        label="Faridabad Sector 21C",
        city="Faridabad",
        state="Haryana",
        bbox=(28.420, 77.295, 28.435, 77.310),
    ),
    "Faridabad NIT": Locality(
        label="Faridabad NIT",
        city="Faridabad",
        state="Haryana",
        bbox=(28.385, 77.290, 28.405, 77.315),
    ),
    "Faridabad Greenfield": Locality(
        label="Faridabad Greenfield",
        city="Faridabad",
        state="Haryana",
        bbox=(28.440, 77.295, 28.455, 77.310),
    ),
    "Faridabad Sector 14": Locality(
        label="Faridabad Sector 14",
        city="Faridabad",
        state="Haryana",
        bbox=(28.395, 77.315, 28.410, 77.330),
    ),
    "Faridabad Sector 28": Locality(
        label="Faridabad Sector 28",
        city="Faridabad",
        state="Haryana",
        bbox=(28.430, 77.310, 28.445, 77.325),
    ),
    "Faridabad Sector 86": Locality(
        label="Faridabad Sector 86",
        city="Faridabad",
        state="Haryana",
        bbox=(28.400, 77.350, 28.420, 77.370),
    ),

    # =========================================================================
    # DELHI (36 Micro-Localities) - State: Delhi
    # =========================================================================
    # South Delhi (14)
    "Saket Delhi": Locality(
        label="Saket Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.515, 77.200, 28.535, 77.220),
    ),
    "South Extension": Locality(
        label="South Extension",
        city="Delhi",
        state="Delhi",
        bbox=(28.565, 77.215, 28.580, 77.230),
    ),
    "South Extension Part 2": Locality(
        label="South Extension Part 2",
        city="Delhi",
        state="Delhi",
        bbox=(28.560, 77.215, 28.575, 77.230),
    ),
    "Greater Kailash 1": Locality(
        label="Greater Kailash 1",
        city="Delhi",
        state="Delhi",
        bbox=(28.545, 77.230, 28.560, 77.250),
    ),
    "Greater Kailash 2": Locality(
        label="Greater Kailash 2",
        city="Delhi",
        state="Delhi",
        bbox=(28.530, 77.235, 28.545, 77.255),
    ),
    "Hauz Khas Delhi": Locality(
        label="Hauz Khas Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.545, 77.195, 28.560, 77.215),
    ),
    "Green Park Delhi": Locality(
        label="Green Park Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.555, 77.195, 28.570, 77.215),
    ),
    "Defence Colony Delhi": Locality(
        label="Defence Colony Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.565, 77.225, 28.580, 77.240),
    ),
    "Lajpat Nagar Delhi": Locality(
        label="Lajpat Nagar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.560, 77.235, 28.580, 77.255),
    ),
    "Vasant Vihar Delhi": Locality(
        label="Vasant Vihar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.550, 77.150, 28.570, 77.170),
    ),
    "Vasant Kunj Delhi": Locality(
        label="Vasant Kunj Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.515, 77.140, 28.540, 77.170),
    ),
    "Safdarjung Enclave Delhi": Locality(
        label="Safdarjung Enclave Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.555, 77.185, 28.570, 77.205),
    ),
    "Malviya Nagar Delhi": Locality(
        label="Malviya Nagar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.525, 77.200, 28.540, 77.220),
    ),
    "CR Park Delhi": Locality(
        label="CR Park Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.535, 77.245, 28.550, 77.260),
    ),

    # Central / New Delhi (3)
    "Connaught Place Delhi": Locality(
        label="Connaught Place Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.625, 77.210, 28.638, 77.226),
    ),
    "Karol Bagh Delhi": Locality(
        label="Karol Bagh Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.645, 77.180, 28.660, 77.200),
    ),
    "Chanakyapuri Delhi": Locality(
        label="Chanakyapuri Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.585, 77.170, 28.605, 77.195),
    ),

    # East Delhi (6)
    "Mayur Vihar Phase 1": Locality(
        label="Mayur Vihar Phase 1",
        city="Delhi",
        state="Delhi",
        bbox=(28.595, 77.290, 28.615, 77.310),
    ),
    "Mayur Vihar Phase 2": Locality(
        label="Mayur Vihar Phase 2",
        city="Delhi",
        state="Delhi",
        bbox=(28.610, 77.300, 28.625, 77.320),
    ),
    "Preet Vihar Delhi": Locality(
        label="Preet Vihar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.635, 77.285, 28.650, 77.300),
    ),
    "Laxmi Nagar Delhi": Locality(
        label="Laxmi Nagar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.625, 77.270, 28.640, 77.290),
    ),
    "Anand Vihar Delhi": Locality(
        label="Anand Vihar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.645, 77.305, 28.660, 77.325),
    ),
    "Krishna Nagar Delhi": Locality(
        label="Krishna Nagar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.650, 77.275, 28.665, 77.295),
    ),

    # West Delhi (8)
    "Punjabi Bagh Delhi": Locality(
        label="Punjabi Bagh Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.660, 77.120, 28.680, 77.140),
    ),
    "Rajouri Garden Delhi": Locality(
        label="Rajouri Garden Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.640, 77.110, 28.660, 77.130),
    ),
    "Janakpuri Delhi": Locality(
        label="Janakpuri Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.615, 77.075, 28.635, 77.095),
    ),
    "Paschim Vihar Delhi": Locality(
        label="Paschim Vihar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.660, 77.085, 28.680, 77.110),
    ),
    "Patel Nagar Delhi": Locality(
        label="Patel Nagar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.645, 77.155, 28.660, 77.175),
    ),
    "Dwarka Sector 6": Locality(
        label="Dwarka Sector 6",
        city="Delhi",
        state="Delhi",
        bbox=(28.575, 77.050, 28.590, 77.068),
    ),
    "Dwarka Sector 10": Locality(
        label="Dwarka Sector 10",
        city="Delhi",
        state="Delhi",
        bbox=(28.575, 77.040, 28.590, 77.058),
    ),
    "Dwarka Sector 12": Locality(
        label="Dwarka Sector 12",
        city="Delhi",
        state="Delhi",
        bbox=(28.585, 77.030, 28.600, 77.048),
    ),

    # North / North-West Delhi (5)
    "Pitampura Delhi": Locality(
        label="Pitampura Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.690, 77.120, 28.710, 77.145),
    ),
    "Rohini Sector 7": Locality(
        label="Rohini Sector 7",
        city="Delhi",
        state="Delhi",
        bbox=(28.705, 77.110, 28.720, 77.130),
    ),
    "Rohini Sector 8": Locality(
        label="Rohini Sector 8",
        city="Delhi",
        state="Delhi",
        bbox=(28.705, 77.115, 28.720, 77.135),
    ),
    "Model Town Delhi": Locality(
        label="Model Town Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.695, 77.180, 28.715, 77.200),
    ),
    "Ashok Vihar Delhi": Locality(
        label="Ashok Vihar Delhi",
        city="Delhi",
        state="Delhi",
        bbox=(28.685, 77.165, 28.700, 77.185),
    ),
}

# In-memory permanent cache for resolved free-text localities
_NOMINATIM_CACHE: Dict[str, Locality] = {}
_LAST_NOMINATIM_CALL_TS: float = 0.0
_CURRENT_PRESET_INDEX = 0


def get_next_preset_locality() -> Locality:
    """Returns the next locality in the preset rotation so autopilot never repeats or stalls."""
    global _CURRENT_PRESET_INDEX
    keys = list(LOCALITY_PRESETS.keys())
    key = keys[_CURRENT_PRESET_INDEX % len(keys)]
    _CURRENT_PRESET_INDEX = (_CURRENT_PRESET_INDEX + 1) % len(keys)
    return LOCALITY_PRESETS[key]


def resolve_locality(raw_input: Optional[str]) -> Locality:
    """
    Resolves a locality label to a Locality object with city, state and bounding box.
    First checks exact presets; falls back to preset rotation or Nominatim OSM geocoding.
    """
    global _LAST_NOMINATIM_CALL_TS
    if not raw_input or not raw_input.strip():
        # Rotate through presets automatically
        return get_next_preset_locality()

    norm_key = raw_input.strip()
    if norm_key in LOCALITY_PRESETS:
        return LOCALITY_PRESETS[norm_key]

    # Check case-insensitive preset match
    for k, v in LOCALITY_PRESETS.items():
        if k.lower() == norm_key.lower():
            return v

    # Support zone/city prefixes (e.g. "South Delhi / Saket", "West Delhi / Rajouri Garden", "Delhi NCR / Noida")
    if "/" in norm_key:
        sub_key = norm_key.split("/")[-1].strip().lower()
        for k, v in LOCALITY_PRESETS.items():
            k_low = k.lower()
            if k_low == sub_key or k_low.startswith(sub_key) or sub_key in k_low:
                return v

    # Support matching without city suffix or partial token match (e.g. "Saket", "Rajouri Garden")
    norm_lower = norm_key.lower()
    for k, v in LOCALITY_PRESETS.items():
        k_lower = k.lower()
        clean_k = (
            k_lower.replace(" delhi", "")
            .replace(" gurugram", "")
            .replace(" ghaziabad", "")
            .replace(" noida", "")
            .strip()
        )
        if norm_lower == clean_k or norm_lower in clean_k.split():
            return v

    for k, v in LOCALITY_PRESETS.items():
        if norm_lower in k.lower():
            return v

    if norm_key in _NOMINATIM_CACHE:
        return _NOMINATIM_CACHE[norm_key]

    # Rate limit Nominatim (max 1 req/s)
    now = time.time()
    elapsed = now - _LAST_NOMINATIM_CALL_TS
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)
    _LAST_NOMINATIM_CALL_TS = time.time()

    settings = get_autopilot_settings()
    encoded = urllib.parse.quote(norm_key)
    url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=1"

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers={"User-Agent": settings.contact_user_agent})
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data, list) and len(data) > 0:
                    item = data[0]
                    bb = item.get("boundingbox", [])
                    if len(bb) == 4:
                        # Nominatim returns [south, north, west, east]
                        south, north, west, east = (
                            float(bb[0]),
                            float(bb[1]),
                            float(bb[2]),
                            float(bb[3]),
                        )
                        disp_name = item.get("display_name", "")
                        city_part = norm_key.split("/")[0].split(",")[0].strip()
                        loc = Locality(
                            label=norm_key,
                            city=city_part,
                            state=disp_name.split(",")[-2].strip() if "," in disp_name else "Delhi",
                            bbox=(south, west, north, east),
                        )
                        _NOMINATIM_CACHE[norm_key] = loc
                        return loc
    except Exception as e:
        logger.warning("Nominatim resolution failed for '%s': %s", norm_key, e)

    # Safe fallback
    fallback = Locality(
        label=norm_key,
        city=norm_key.split("/")[0].split(",")[0].strip(),
        state="Delhi",
        bbox=(28.40, 76.80, 28.90, 77.40),
    )
    _NOMINATIM_CACHE[norm_key] = fallback
    return fallback
