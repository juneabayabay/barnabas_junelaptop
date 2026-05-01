from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import *
from .ai_service import AIDentalScheduler, GeminiAIAssistant


@shared_task
def expire_pencil_booking(appointment_id):
    """Auto-expire pencil bookings after time limit"""
    try:
        appointment = Appointment.objects.get(id=appointment_id, status='pencil')
        if appointment.pencil_expires_at < timezone.now():
            appointment.status = 'cancelled'
            appointment.save()
            
            send_mail(
                'Pencil Booking Expired',
                f'Your pencil booking for {appointment.date} at {appointment.time} has expired.',
                settings.DEFAULT_FROM_EMAIL,
                [appointment.user.email],
                fail_silently=True,
            )
    except Appointment.DoesNotExist:
        pass


@shared_task
def expire_reservation(token):
    """Expire unconfirmed reservations"""
    from .models import BookingReservation
    try:
        reservation = BookingReservation.objects.get(token=token, is_confirmed=False)
        if reservation.expires_at < timezone.now():
            reservation.delete()
    except BookingReservation.DoesNotExist:
        pass


@shared_task
def check_waitlist_for_slots():
    """Periodically check if waitlist users can be matched with open slots"""
    from datetime import datetime, timedelta
    from .models import Waitlist, Appointment
    
    for days_ahead in range(7):
        check_date = timezone.now().date() + timedelta(days=days_ahead)
        
        appointments = Appointment.objects.filter(
            date=check_date,
            status__in=['confirmed', 'pending']
        )
        
        booked_slots = set([(apt.time.hour, apt.time.minute) for apt in appointments])
        
        # Generate all slots
        all_slots = []
        for hour in range(9, 18):
            if hour == 12:
                continue
            for minute in [0, 30]:
                slot_time = f"{hour:02d}:{minute:02d}"
                all_slots.append({
                    'time': slot_time,
                    'hour': hour,
                    'minute': minute
                })
        
        available_slots = [slot for slot in all_slots if (slot['hour'], slot['minute']) not in booked_slots]
        
        waitlist_users = Waitlist.objects.filter(
            preferred_date=check_date,
            status='active'
        ).order_by('-urgency_level', 'created_at')
        
        ai_assistant = GeminiAIAssistant()
        
        for user in waitlist_users:
            matching_slots = []
            for slot in available_slots:
                slot_time = datetime.strptime(slot['time'], '%H:%M').time()
                if user.preferred_time_start <= slot_time <= user.preferred_time_end:
                    matching_slots.append(slot)
            
            if matching_slots:
                AISuggestion.objects.create(
                    user=user.user,
                    suggestion_type='waitlist_opportunity',
                    title='Slot Available!',
                    description=f'A slot has opened on {check_date}. Book now before it\'s gone!',
                    priority=user.urgency_level
                )
                
                send_mail(
                    'Waitlist Slot Available',
                    f'Good news! A slot matching your preferences is available on {check_date}. '
                    f'Please log in to book it immediately.',
                    settings.DEFAULT_FROM_EMAIL,
                    [user.user.email],
                    fail_silently=True,
                )


@shared_task
def generate_ai_recommendations():
    """Generate AI recommendations for all users"""
    from .models import User, Appointment, AISuggestion
    from .ai_service import AIDentalScheduler
    
    users = User.objects.filter(is_active=True)
    ai_scheduler = AIDentalScheduler()
    
    for user in users:
        user_appointments = Appointment.objects.filter(user=user)
        
        # Analyze patterns
        patterns = ai_scheduler.analyze_booking_patterns(user_appointments)
        
        if patterns and patterns.get('preferred_time'):
            AISuggestion.objects.create(
                user=user,
                suggestion_type='time_optimization',
                title='Optimal Booking Time',
                description=f"Based on your history, {patterns['preferred_time']}:00 works best for you.",
                priority=1
            )
        
        # Service recommendation
        service_rec = ai_scheduler.recommend_service_based_on_history(user_appointments)
        if service_rec:
            AISuggestion.objects.create(
                user=user,
                suggestion_type='service_recommendation',
                title='Service Recommendation',
                description=service_rec['message'],
                priority=2,
                metadata={'recommended_date': str(service_rec['recommended_date'])}
            )
        
        # Check for upcoming appointments
        upcoming = Appointment.objects.filter(
            user=user,
            date__gt=timezone.now().date(),
            status='pending'
        ).first()
        
        if upcoming:
            risk = ai_scheduler.predict_cancellation_risk(upcoming)
            if risk['risk_score'] > 50:
                AISuggestion.objects.create(
                    user=user,
                    suggestion_type='cancellation_risk',
                    title='Appointment Risk Alert',
                    description=f"Your appointment has a {risk['risk_score']}% cancellation risk. "
                               f"Please confirm to secure your slot.",
                    priority=3,
                    metadata={'risk_factors': risk['risk_factors']}
                )


@shared_task
def send_invoice_email(invoice_id):
    """Send invoice email to patient"""
    from .models import Invoice
    
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        send_mail(
            f'Invoice {invoice.invoice_number} from Barnabas Dental Clinic',
            f'Dear {invoice.user.full_name},\n\n'
            f'Please find your invoice attached.\n'
            f'Total Amount: ₱{invoice.total_amount}\n'
            f'Due Date: {invoice.due_date}\n\n'
            f'You can view and pay your invoice online through your patient portal.\n\n'
            f'Thank you for choosing Barnabas Dental Clinic!',
            settings.DEFAULT_FROM_EMAIL,
            [invoice.user.email],
            fail_silently=True,
        )
    except Invoice.DoesNotExist:
        pass


@shared_task
def check_overdue_invoices():
    """Mark invoices as overdue if past due date"""
    from .models import Invoice
    
    overdue_invoices = Invoice.objects.filter(
        due_date__lt=timezone.now().date(),
        status__in=['sent', 'partial']
    )
    
    for invoice in overdue_invoices:
        invoice.status = 'overdue'
        invoice.save()
        
        send_mail(
            'Payment Overdue Notice',
            f'Dear {invoice.user.full_name},\n\n'
            f'Your invoice {invoice.invoice_number} is now overdue.\n'
            f'Outstanding Balance: ₱{invoice.balance_due}\n\n'
            f'Please make payment as soon as possible to avoid penalties.\n\n'
            f'Thank you for your prompt attention to this matter.',
            settings.DEFAULT_FROM_EMAIL,
            [invoice.user.email],
            fail_silently=True,
        )

@shared_task
def send_notification_email(notification_id):
    """Send email for a notification"""
    from django.core.mail import send_mail
    from .models import Notification
    
    try:
        notification = Notification.objects.get(id=notification_id)
        
        if notification.channel == 'email' and not notification.is_sent:
            send_mail(
                notification.title,
                notification.message,
                settings.DEFAULT_FROM_EMAIL,
                [notification.user.email],
                fail_silently=True,
            )
            notification.is_sent = True
            notification.sent_at = timezone.now()
            notification.save()
    except Notification.DoesNotExist:
        pass


@shared_task
def send_appointment_reminders():
    """Send appointment reminders for tomorrow's appointments"""
    tomorrow = timezone.now().date() + timedelta(days=1)
    
    appointments = Appointment.objects.filter(
        date=tomorrow,
        status='confirmed'
    ).select_related('user')
    
    reminder_count = 0
    
    for appointment in appointments:
        # Check user preferences
        try:
            prefs = appointment.user.notification_preferences
        except NotificationPreference.DoesNotExist:
            prefs = None
        
        # Send email reminder if enabled
        if not prefs or prefs.email_appointment_reminders:
            Notification.objects.create(
                user=appointment.user,
                notification_type='appointment_reminder',
                title=f'Appointment Reminder: Tomorrow at {appointment.time.strftime("%I:%M %p")}',
                message=f'Dear {appointment.user.full_name},\n\n'
                       f'This is a reminder of your appointment tomorrow ({tomorrow}) at {appointment.time.strftime("%I:%M %p")}.\n'
                       f'Service: {appointment.get_service_display()}\n\n'
                       f'Please arrive 10 minutes early.\n\n'
                       f'Thank you for choosing Barnabas Dental Clinic!',
                priority='high',
                channel='email',
                related_appointment=appointment,
                action_url='/my-appointments',
            )
            reminder_count += 1
        
        # Send push notification if enabled
        if not prefs or prefs.push_appointment_reminders:
            Notification.objects.create(
                user=appointment.user,
                notification_type='appointment_reminder',
                title='Appointment Tomorrow!',
                message=f'Reminder: Your {appointment.get_service_display()} is tomorrow at {appointment.time.strftime("%I:%M %p")}',
                priority='high',
                channel='push',
                related_appointment=appointment,
                action_url='/my-appointments',
            )
    
    return f'Sent {reminder_count} appointment reminders'


@shared_task
def send_invoice_reminders():
    """Send reminders for unpaid invoices"""
    today = timezone.now().date()
    
    # Invoices due in 3 days
    due_soon = Invoice.objects.filter(
        due_date=today + timedelta(days=3),
        status__in=['sent', 'partial']
    )
    
    for invoice in due_soon:
        Notification.objects.create(
            user=invoice.user,
            notification_type='payment_reminder',
            title=f'Invoice Due Soon: {invoice.invoice_number}',
            message=f'Your invoice {invoice.invoice_number} is due in 3 days.\n'
                   f'Amount Due: ₱{invoice.balance_due}\n'
                   f'Due Date: {invoice.due_date}\n\n'
                   f'Please make payment to avoid late fees.',
            priority='high',
            channel='email',
            related_invoice=invoice,
            action_url='/my-invoices',
        )
    
    # Overdue invoices
    overdue = Invoice.objects.filter(
        due_date__lt=today,
        status__in=['sent', 'partial']
    )
    
    for invoice in overdue:
        Notification.objects.create(
            user=invoice.user,
            notification_type='payment_reminder',
            title=f'Payment Overdue: {invoice.invoice_number}',
            message=f'Your invoice {invoice.invoice_number} is now overdue.\n'
                   f'Outstanding Balance: ₱{invoice.balance_due}\n'
                   f'Please make immediate payment to avoid service interruption.',
            priority='urgent',
            channel='email',
            related_invoice=invoice,
            action_url='/my-invoices',
        )
    
    return f'Sent {due_soon.count() + overdue.count()} invoice reminders'


@shared_task
def cleanup_old_notifications():
    """Delete old notifications (older than 30 days)"""
    cutoff_date = timezone.now() - timedelta(days=30)
    deleted_count = Notification.objects.filter(
        created_at__lt=cutoff_date,
        is_read=True
    ).delete()[0]
    
    return f'Deleted {deleted_count} old notifications'