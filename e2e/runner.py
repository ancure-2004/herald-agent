#!/usr/bin/env python3
"""Executable E2E Test Suite Runner for Personal OS & CRM.

Runs the complete 4-tier independent opaque-box test suite:
- Tier 1: Feature Coverage (>=5 tests per feature)
- Tier 2: Boundary & Corner Cases (>=5 tests per feature)
- Tier 3: Cross-Feature Combinations (pairwise interactions)
- Tier 4: Real-World Application Scenarios (>=5 full workflows)

Usage:
    python e2e/runner.py
    python e2e/runner.py -v
    python e2e/runner.py e2e/tier1_feature_coverage
"""

import os
import sys
import time
import pytest

# Ensure project and backend directories are on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


class E2EResultCollector:
    """Pytest plugin collecting per-tier counts and summary metrics."""

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.tier_counts = {
            "tier1_feature_coverage": {"passed": 0, "failed": 0, "skipped": 0},
            "tier2_boundary_cases": {"passed": 0, "failed": 0, "skipped": 0},
            "tier3_cross_feature": {"passed": 0, "failed": 0, "skipped": 0},
            "tier4_real_world": {"passed": 0, "failed": 0, "skipped": 0},
        }

    def pytest_runtest_logreport(self, report):
        if report.when == "call":
            tier_key = None
            for key in self.tier_counts:
                if key in report.nodeid:
                    tier_key = key
                    break

            if report.passed:
                self.passed += 1
                if tier_key:
                    self.tier_counts[tier_key]["passed"] += 1
            elif report.failed:
                self.failed += 1
                if tier_key:
                    self.tier_counts[tier_key]["failed"] += 1
            elif report.skipped:
                self.skipped += 1
                if tier_key:
                    self.tier_counts[tier_key]["skipped"] += 1
        elif report.when in ("setup", "teardown") and report.skipped:
            self.skipped += 1
            for key in self.tier_counts:
                if key in report.nodeid:
                    self.tier_counts[key]["skipped"] += 1
                    break


def main():
    print("=" * 80)
    print(" Personal OS & CRM - Independent E2E Test Suite Runner")
    print(" Integrity Mode: Development | Methodology: 4-Tier Opaque-Box")
    print("=" * 80)

    e2e_dir = os.path.dirname(__file__)
    passed_args = sys.argv[1:]

    # Default targets: run all 4 tiers under e2e/
    if not passed_args or all(arg.startswith("-") for arg in passed_args):
        targets = [e2e_dir]
        flags = [arg for arg in passed_args]
    else:
        targets = [arg for arg in passed_args if not arg.startswith("-")]
        flags = [arg for arg in passed_args if arg.startswith("-")]

    pytest_args = targets + flags + ["-q"]
    collector = E2EResultCollector()

    start_time = time.perf_counter()
    exit_code = pytest.main(pytest_args, plugins=[collector])
    elapsed = time.perf_counter() - start_time

    total = collector.passed + collector.failed + collector.skipped

    print("\n" + "=" * 80)
    print(" E2E Test Execution Summary")
    print("=" * 80)
    print(f" Total Tests Collected: {total}")
    print(f" Passed:                {collector.passed}")
    print(f" Skipped (Pending M2+): {collector.skipped}")
    print(f" Failed:                {collector.failed}")
    print(f" Elapsed Time:          {elapsed:.2f}s")
    print("-" * 80)
    print(" Per-Tier Breakdown:")
    for tier, counts in collector.tier_counts.items():
        t_total = counts["passed"] + counts["failed"] + counts["skipped"]
        if t_total > 0:
            print(f"   • {tier:<26}: Total={t_total:<3} Passed={counts['passed']:<3} Skipped={counts['skipped']:<3} Failed={counts['failed']:<3}")
    print("=" * 80)

    if exit_code == 0:
        print(" RESULT: SUCCESS - All executed tests passed cleanly (Exit Code 0).")
    else:
        print(f" RESULT: FAILURE - Test suite exited with code {exit_code}.")
    print("=" * 80 + "\n")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
