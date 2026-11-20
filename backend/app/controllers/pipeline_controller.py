from typing import Any, Dict, List, Optional, Union

from sqlalchemy.orm import Session

from app.models.entities import RunLog
from app.services.pipeline_service import PipelineService


class PipelineController:
    @staticmethod
    def list_runs(
        db: Session,
        hustle_id: Optional[int] = None,
        job_type: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        cursor: Optional[int] = None,
    ) -> Union[List[RunLog], Dict[str, Any]]:
        return PipelineService.list_runs(
            db,
            hustle_id=hustle_id,
            job_type=job_type,
            limit=limit,
            offset=offset,
            cursor=cursor,
        )

    @staticmethod
    def list_discovery_candidates(
        db: Session,
        hustle_id: Optional[int] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        cursor: Optional[int] = None,
    ) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        return PipelineService.list_discovery_candidates(
            db,
            hustle_id=hustle_id,
            limit=limit,
            offset=offset,
            cursor=cursor,
        )

    @staticmethod
    def list_discovery_runs(
        db: Session,
        hustle_id: Optional[int] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        cursor: Optional[int] = None,
    ) -> Union[List[RunLog], Dict[str, Any]]:
        return PipelineService.list_discovery_runs(
            db,
            hustle_id=hustle_id,
            limit=limit,
            offset=offset,
            cursor=cursor,
        )

    @staticmethod
    def get_run(db: Session, run_id: int) -> Dict[str, Any]:
        return PipelineService.get_run_by_id(db, run_id)

    @staticmethod
    def cancel_run(run_id: Optional[int] = None) -> Dict[str, Any]:
        return PipelineService.cancel_run(run_id)

    @staticmethod
    def trigger_refill(
        db: Session,
        hustle_id: int = 1,
        batch_size: int = 3,
        testing_mode: bool = False,
        locality: Optional[str] = None,
        async_mode: bool = False,
        stop_after: Optional[str] = None,
    ) -> Dict[str, Any]:
        return PipelineService.trigger_refill(
            db,
            hustle_id,
            batch_size,
            testing_mode=testing_mode,
            locality=locality,
            async_mode=async_mode,
            stop_after=stop_after,
        )

    @staticmethod
    def discover_leads(
        db: Session,
        hustle_id: int = 1,
        target_count: int = 30,
        locality: Optional[str] = None,
        testing_mode: bool = False,
        async_mode: bool = False,
    ) -> Dict[str, Any]:
        return PipelineService.discover_leads(
            db,
            hustle_id=hustle_id,
            target_count=target_count,
            locality=locality,
            testing_mode=testing_mode,
            async_mode=async_mode,
        )

    @staticmethod
    def build_batch(
        db: Session,
        hustle_id: int = 1,
        batch_id: Optional[str] = None,
        batch_size: Optional[int] = None,
        testing_mode: bool = False,
        async_mode: bool = False,
    ) -> Dict[str, Any]:
        return PipelineService.build_batch(
            db,
            hustle_id=hustle_id,
            batch_id=batch_id,
            batch_size=batch_size,
            testing_mode=testing_mode,
            async_mode=async_mode,
        )

    @staticmethod
    def cleanup_test_data(db: Session, confirmation: str) -> Dict[str, Any]:
        return PipelineService.cleanup_test_data(db, confirmation)

    @staticmethod
    def verify_links(db: Session) -> Dict[str, Any]:
        return PipelineService.verify_links(db)

    @staticmethod
    def retry_recordings(
        db: Session,
        hustle_id: int = 1,
        batch_id: Optional[str] = None,
        testing_mode: bool = False,
        async_mode: bool = False,
    ) -> Dict[str, Any]:
        return PipelineService.retry_recordings(
            db,
            hustle_id=hustle_id,
            batch_id=batch_id,
            testing_mode=testing_mode,
            async_mode=async_mode,
        )

    @staticmethod
    def get_cockpit_batch(db: Session, hustle_id: int = 1, batch_id: Optional[str] = None) -> Dict[str, Any]:
        return PipelineService.get_cockpit_batch(db, hustle_id, batch_id=batch_id)

    @staticmethod
    def get_cockpit_state(db: Session, hustle_id: int = 1) -> Dict[str, Any]:
        return PipelineService.get_cockpit_state(db, hustle_id)
