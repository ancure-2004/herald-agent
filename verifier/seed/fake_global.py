"""Rows not tied to one clinic: terminal log lines, the job queue and run logs.

Like fake_rows, every timestamp is explicit.
"""

from datetime import timedelta

from app.models import Job, RunLog, TerminalLog

import fake_values as fv


def make_log(rng, lead, hustle_id, created):
    """A terminal log line about this lead, or None for about half the leads."""
    if rng.random() < 0.5:
        return None
    service, level, line = rng.choice(fv.LOG_LINES)
    return TerminalLog(
        service=service,
        level=level,
        lead_id=lead.id,
        hustle_id=hustle_id,
        message=f"{line} for {lead.name}",
        metadata_json={"lead_slug": lead.slug},
        created_at=created + timedelta(minutes=rng.randint(1, 600)),
    )


def make_jobs(rng, hustle_id, base, count):
    """A small global work queue."""
    jobs = []
    for k in range(count):
        status = rng.choice(fv.JOB_STATUSES)
        done = status in ("succeeded", "failed", "cancelled")
        run_after = base + timedelta(hours=k)
        jobs.append(
            Job(
                hustle_id=hustle_id,
                job_type=fv.JOB_TYPES[k % len(fv.JOB_TYPES)],
                input_payload={"batch": k},
                status=status,
                priority=10,
                attempts=1 if done else 0,
                max_attempts=2,
                run_after=run_after,
                error_message="fake failure" if status == "failed" else "",
                created_at=run_after,
                completed_at=run_after + timedelta(minutes=5) if done else None,
            )
        )
    return jobs


def make_runs(rng, hustle_id, jobs, base, count):
    """Run logs, each tied to one of the jobs (which must already have ids)."""
    runs = []
    for k in range(count):
        job = jobs[k % len(jobs)]
        found = rng.randint(5, 40)
        passed = rng.randint(0, found)
        status = rng.choice(fv.RUN_STATUSES)
        started = base + timedelta(hours=k)
        runs.append(
            RunLog(
                hustle_id=hustle_id,
                job_id=job.id,
                job_type=job.job_type,
                status=status,
                count_found=found,
                count_passed=passed,
                count_dropped=found - passed,
                drop_reasons={"no_website_check": found - passed},
                errors=[],
                trace_logs=["fake trace line"],
                started_at=started,
                finished_at=None if status == "running" else started + timedelta(minutes=rng.randint(1, 20)),
            )
        )
    return runs
