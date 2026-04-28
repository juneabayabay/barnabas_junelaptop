# tasks.py
from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Appointment, Waitlist, AISuggestion, BookingReservation
from .ai_service import AIDentalScheduler

@shared_task
def expire_pencil_booking(appointment_id):
    """Auto-expire pencil bookings after 15 minutes"""
    from .models import Appointment
    
    try:
        appointment = Appointment.objects.get(id=appointment_id, status='pencil')
        if appointment.pencil_expires_at < timezone.now():
            appointment.status = 'cancelled'
            appointment.save()
            
            send_mail(
                'Pencil Booking Expired',
                f'Your pencil booking for {appointment.date} at {appointment.time} has expired. Please book again.',
                'noreply@dentalclinic.com',
                [appointment.user.email],
                fail_silently=True,
            )
            return f"Expired pencil booking {appointment_id}"
    except Appointment.DoesNotExist:
        return f"Appointment {appointment_id} not found"
    return f"Pencil booking {appointment_id} still valid"

@shared_task
def expire_reservation(reservation_token):
    """Expire booking reservation"""
    try:
        reservation = BookingReservation.objects.get(token=reservation_token, is_confirmed=False)
        if reservation.expires_at < timezone.now():
            reservation.delete()
            return f"Expired reservation {reservation_token}"
    except BookingReservation.DoesNotExist:
        pass
    return f"Reservation {reservation_token} not found"

@shared_task
def check_waitlist_for_slots():
    """Periodically check if waitlist users can be matched with open slots"""
    from .models import Appointment, Waitlist, AISuggestion
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    for days_ahead in range(7):
        check_date = timezone.now().date() + timedelta(days=days_ahead)
        
        appointments = Appointment.objects.filter(
            date=check_date,
            status__in=['confirmed', 'pending']
        )
        
        booked_slots = set([(apt.time.hour, apt.time.minute) for apt in appointments])
        
        all_slots = []
        for hour in range(9, 18):
            if hour == 12:
                continue
            for minute in [0, 30]:
                all_slots.append({
                    'time': f"{hour:02d}:{minute:02d}",
                    'hour': hour,
                    'minute': minute
                })
        
        available_slots = [slot for slot in all_slots if (slot['hour'], slot['minute']) not in booked_slots]
        
        waitlist_users = Waitlist.objects.filter(
            preferred_date=check_date,
            status='active'
        ).order_by('-urgency_level', 'created_at')
        
        for user_entry in waitlist_users:
            matching_slots = []
            for slot in available_slots:
                slot_time = datetime.strptime(slot['time'], '%H:%M').time()
                if user_entry.preferred_time_start <= slot_time <= user_entry.preferred_time_end:
                    matching_slots.append(slot)
            
            if matching_slots:
                user_entry.status = 'notified'
                user_entry.save()
                
                AISuggestion.objects.create(
                    user=user_entry.user,
                    suggestion_type='waitlist_opportunity',
                    title='Waitlist Match Found!',
                    description=f'A slot has opened on {check_date}. Book now before it\'s taken!',
                    priority=user_entry.urgency_level,
                    metadata={'available_slots': matching_slots, 'date': str(check_date)}
                )
                
                send_mail(
                    'Waitlist Match Found',
                    f'Good news! A slot has opened on {check_date}. Please log in to book your appointment.',
                    'noreply@dentalclinic.com',
                    [user_entry.user.email],
                    fail_silently=True,
                )
    
    return "Waitlist check completed"

@shared_task
def generate_ai_recommendations():
    """Generate AI recommendations for all users"""
    from django.contrib.auth import get_user_model
    from .models import Appointment, AISuggestion
    
    User = get_user_model()
    users = User.objects.filter(is_active=True)
    
    suggestions_created = 0
    
    for user in users:
        user_appointments = Appointment.objects.filter(user=user)
        
        if not user_appointments:
            continue
        
        patterns = AIDentalScheduler.analyze_booking_patterns(user_appointments)
        
        if patterns and patterns.get('preferred_time'):
            AISuggestion.objects.create(
                user=user,
                suggestion_type='time_optimization',
                title='Optimal Booking Time Identified',
                description=f"Based on your history, {patterns['preferred_time']}:00 works best for you. Consider booking at this time for better availability.",
                priority=1,
                metadata={'preferred_time': patterns['preferred_time']}
            )
            suggestions_created += 1
        
        service_rec = AIDentalScheduler.recommend_service_based_on_history(user_appointments)
        if service_rec:
            AISuggestion.objects.create(
                user=user,
                suggestion_type='service_recommendation',
                title='Service Recommendation',
                description=service_rec['message'],
                priority=2,
                metadata={'recommended_service': service_rec['service']}
            )
            suggestions_created += 1
        
        upcoming = Appointment.objects.filter(
            user=user,
            date__gt=timezone.now().date(),
            status='pending'
        ).first()
        
        if upcoming:
            risk = AIDentalScheduler.predict_cancellation_risk(upcoming)
            if risk['risk_score'] > 50:
                AISuggestion.objects.create(
                    user=user,
                    suggestion_type='cancellation_risk',
                    title='Appointment Risk Alert',
                    description=f"Your appointment on {upcoming.date} has a {risk['risk_score']}% cancellation risk. Consider rescheduling to a more optimal time.",
                    priority=3,
                    metadata=risk
                )
                suggestions_created += 1
        
        all_services = Appointment.objects.exclude(user=user).values_list('service', flat=True)
        trending_services = Counter([s for s in all_services if s]).most_common(3)
        
        if trending_services:
            AISuggestion.objects.create(
                user=user,
                suggestion_type='trending_services',
                title='Popular Services This Week',
                description=f"Other patients are booking: {', '.join([s[0] for s in trending_services])}. Consider trying these services.",
                priority=4,
                metadata={'trending': trending_services}
            )
            suggestions_created += 1
    
    return f"Generated {suggestions_created} AI suggestions"

@shared_task
def cleanup_expired_items():
    """Clean up expired pencil bookings, reservations, and old suggestions"""
    from .models import Appointment, BookingReservation, AISuggestion
    
    # Expire old pencil bookings
    expired_pencils = Appointment.objects.filter(
        status='pencil',
        pencil_expires_at__lt=timezone.now()
    )
    expired_pencils.update(status='cancelled')
    
    # Delete expired reservations
    BookingReservation.objects.filter(
        is_confirmed=False,
        expires_at__lt=timezone.now()
    ).delete()
    
    # Delete old AI suggestions (older than 30 days)
    cutoff_date = timezone.now() - timedelta(days=30)
    AISuggestion.objects.filter(created_at__lt=cutoff_date).delete()
    
    return f"Cleaned up {expired_pencils.count()} pencil bookings"

@shared_task
def send_appointment_reminders():
    """Send appointment reminders for tomorrow's appointments"""
    from .models import Appointment
    
    tomorrow = timezone.now().date() + timedelta(days=1)
    appointments = Appointment.objects.filter(
        date=tomorrow,
        status='confirmed'
    )
    
    reminders_sent = 0
    for apt in appointments:
        send_mail(
            'Appointment Reminder',
            f'Reminder: You have an appointment tomorrow at {apt.time.strftime("%I:%M %p")}.',
            'noreply@dentalclinic.com',
            [apt.user.email],
            fail_silently=True,
        )
        reminders_sent += 1
    
    return f"Sent {reminders_sent} reminders"