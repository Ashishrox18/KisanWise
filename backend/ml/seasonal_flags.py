"""
seasonal_flags.py — festival/harvest-season calendar flags for Indian mandi
commodities (month-based domain heuristic).

Shared by train.py and inference/predict.py so the two can never drift.

These are coarse, honest heuristics — not a precise festival calendar. A flag = 1
means "a known harvest or festive-demand window for this crop is active in this
calendar month." Commodity names are matched case-insensitively.
"""
from __future__ import annotations

# Harvest months (calendar month numbers) per canonical crop (lower-cased)
HARVEST = {
    "wheat":     [3, 4],            # Rabi harvest Mar–Apr
    "rice":      [10, 11, 3, 4],    # Kharif Oct–Nov, Rabi Mar–Apr
    "maize":     [9, 10, 3],        # Kharif + Rabi
    "potato":    [2, 3, 9, 10],    # Rabi + early Kharif
    "onion":     [4, 5, 11, 12],   # Rabi + Kharif harvest
    "tomato":    [10, 11, 3, 4],   # peak harvest windows
    "soybean":   [9, 10],          # Kharif
    "mustard":   [2, 3],           # Rabi
    "chickpea":  [2, 3, 4],        # Rabi
    "bajra":     [9, 10],          # Kharif
    "jowar":     [9, 10, 1],       # Kharif + late
    "green gram":[7, 8, 3],        # Kharif + spring
    "black gram":[10, 11, 3],      # Kharif + Rabi
    "groundnut": [9, 10, 3, 4],    # Kharif + Rabi
    "barley":    [3, 4],           # Rabi
}

# Festive-demand / volatility windows per crop (e.g. Diwali, winter procurement)
FESTIVAL = {
    "onion":  [10, 11, 12],        # Diwali + winter demand — prices spike
    "tomato": [10, 11],           # festive demand
    "potato": [10, 11, 12],       # festive + cold-storage demand
    "rice":   [10, 11, 12],       # festive procurement
    "wheat":  [11, 12, 1, 2],     # winter demand, pre-harvest tightness
    "mustard":[11, 12],           # winter oil demand
}


def _norm(commodity: str) -> str:
    return (commodity or "").strip().lower()


def harvest_flag(commodity: str, month: int) -> int:
    return 1 if int(month) in HARVEST.get(_norm(commodity), []) else 0


def festival_flag(commodity: str, month: int) -> int:
    return 1 if int(month) in FESTIVAL.get(_norm(commodity), []) else 0
