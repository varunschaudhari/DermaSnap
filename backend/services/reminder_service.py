"""
Reminder service for treatment notifications
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def schedule_treatment_reminder(
    treatment_id: str,
    patient_id: str,
    reminder_date: datetime,
    message: str
):
    """Schedule a treatment reminder"""
    try:
        # In production, this would integrate with push notification service
        # For now, we'll just log it
        logger.info(f"Scheduling reminder for treatment {treatment_id} on {reminder_date}")
        
        # Schedule job
        scheduler.add_job(
            send_reminder_notification,
            trigger=DateTrigger(run_date=reminder_date),
            args=[treatment_id, patient_id, message],
            id=f"treatment_reminder_{treatment_id}",
            replace_existing=True
        )
        
        if not scheduler.running:
            scheduler.start()
    except Exception as e:
        logger.error(f"Failed to schedule reminder: {e}", exc_info=True)

async def send_reminder_notification(
    treatment_id: str,
    patient_id: str,
    message: str
):
    """Send reminder notification"""
    try:
        logger.info(f"Sending reminder to patient {patient_id} for treatment {treatment_id}")
        logger.info(f"Message: {message}")
        
        # TODO: Integrate with push notification service
        # - Expo Push Notifications for mobile
        # - Email notifications
        # - SMS notifications (optional)
    except Exception as e:
        logger.error(f"Failed to send reminder: {e}", exc_info=True)

def start_scheduler():
    """Start the reminder scheduler"""
    if not scheduler.running:
        scheduler.start()
        logger.info("Reminder scheduler started")

def shutdown_scheduler():
    """Shutdown the reminder scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Reminder scheduler stopped")
