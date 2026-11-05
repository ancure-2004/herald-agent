"""
Autopilot Pipelines Package
---------------------------
High-level workflow pipelines orchestrating multi-step execution.
"""

from .dental_pipeline import DentalPipeline, default_dental_pipeline

__all__ = [
    "DentalPipeline",
    "default_dental_pipeline",
]
