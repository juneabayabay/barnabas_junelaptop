from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from datetime import timedelta
import uuid
from django.db import models
from rest_framework.exceptions import PermissionDenied
from knox.models import AuthToken
from django.core.mail import send_mail
from django.conf import settings
import asyncio

from .models import *
from .serializers import *
from .tasks import (
    expire_pencil_booking, expire_reservation, 
    check_waitlist_for_slots, generate_ai_recommendations,
    send_invoice_email, check_overdue_invoices
)
from .ai_service import AIDentalScheduler, GeminiAIAssistant

User = get_user_model()


class RegisterViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=400)


class LoginViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)

            if user:
                _, token = AuthToken.objects.create(user)
                return Response(
                    {
                        'user': {'id': user.id, 'email': user.email},
                        'token': token
                    }
                )
            else:
                return Response({'error':'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)


class AdminLoginViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)

            if user and user.is_superuser:
                _, token = AuthToken.objects.create(user)
                return Response(
                    {
                        'user': {'id': user.id, 'email': user.email, 'is_superuser': user.is_superuser,},
                        'token': token
                    }
                )
            else:
                return Response({'error':'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)


class UserViewset(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def list(self, request):
        queryset = User.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)


class PatientRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PatientRecordSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role == 'admin' or user.is_staff:
            return PatientRecord.objects.all()
        return PatientRecord.objects.filter(user=user)
    
    def get_object(self):
        obj = super().get_object()
        if obj.user != self.request.user and not (self.request.user.is_superuser or self.request.user.is_staff):
            raise PermissionDenied("You can only access your own patient record")
        return obj
    
    @action(detail=False, methods=['get'])
    def my_record(self, request):
        """Get current user's patient record"""
        record, created = PatientRecord.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(record)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_medical_history(self, request, pk=None):
        """Add medical history notes"""
        record = self.get_object()
        record.medical_conditions = request.data.get('medical_conditions', record.medical_conditions)
        record.allergies = request.data.get('allergies', record.allergies)
        record.medications = request.data.get('medications', record.medications)
        record.save()
        return Response(self.get_serializer(record).data)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_superuser or user.role == 'admin':
            queryset = Appointment.objects.all().select_related('user', 'dentist')
        elif user.is_staff:
            # Staff can see all appointments but with limited edit
            queryset = Appointment.objects.all().select_related('user', 'dentist')
        else:
            queryset = Appointment.objects.filter(user=user)
        
        # Apply filters
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        user_id = self.request.query_params.get('user_id', None)
        if user_id and (user.is_superuser or user.is_staff):
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('date', 'time')
    
    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        
        if obj.user != user and not (user.is_superuser or user.is_staff):
            raise PermissionDenied("Access denied")
        return obj
    
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['user'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        
        # Create invoice for confirmed appointments
        if appointment.status == 'confirmed':
            self._create_invoice_for_appointment(appointment)
        
        # Generate AI suggestions asynchronously
        generate_ai_recommendations.delay()
        
        # Log creation
        AuditLog.objects.create(
            user=request.user,
            action='create',
            model_name='Appointment',
            object_id=str(appointment.id),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({
            'message': 'Appointment created successfully',
            'appointment': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def _create_invoice_for_appointment(self, appointment):
        """Create invoice for confirmed appointment"""
        service_prices = {
            'consultation': 500,
            'teeth_cleaning': 800,
            'tooth_extraction': 1500,
            'dental_filling': 1200,
            'orthodontic': 5000,
            'root_canal': 3000,
            'dental_implant': 15000,
            'teeth_whitening': 2500,
        }
        
        price = service_prices.get(appointment.service, 1000)
        
        invoice = Invoice.objects.create(
            user=appointment.user,
            appointment=appointment,
            due_date=appointment.date,
            subtotal=price,
            total_amount=price,
            status='sent'
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            description=f"Dental Service: {appointment.get_service_display()}",
            quantity=1,
            unit_price=price
        )
        
        send_invoice_email.delay(invoice.id)
    
    @action(detail=False, methods=['post'])
    def pencil_booking(self, request):
        """Create a temporary pencil booking"""
        user = request.user
        date = request.data.get('date')
        time_slot = request.data.get('time')
        service = request.data.get('service')
        
        existing = Appointment.objects.filter(
            date=date,
            time=time_slot,
            status__in=['confirmed', 'pending', 'pencil']
        ).count()
        
        if existing >= 2:
            return Response(
                {'error': 'Slot is no longer available'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pencil_appt = Appointment.objects.create(
            user=user,
            date=date,
            time=time_slot,
            service=service,
            status='pencil',
            pencil_expires_at=timezone.now() + timedelta(minutes=settings.PENCIL_BOOKING_MINUTES)
        )
        
        expire_pencil_booking.apply_async(
            args=[pencil_appt.id],
            countdown=settings.PENCIL_BOOKING_MINUTES * 60
        )
        
        return Response({
            'message': f'Pencil booking created! You have {settings.PENCIL_BOOKING_MINUTES} minutes to confirm.',
            'expires_at': pencil_appt.pencil_expires_at,
            'appointment_id': pencil_appt.id
        })
    
    @action(detail=False, methods=['post'])
    def confirm_pencil_booking(self, request):
        """Convert pencil booking to confirmed appointment"""
        appointment_id = request.data.get('appointment_id')
        
        try:
            appointment = Appointment.objects.get(id=appointment_id, user=request.user)
            
            if appointment.status != 'pencil':
                return Response({'error': 'Not a pencil booking'}, status=400)
            
            if appointment.pencil_expires_at < timezone.now():
                appointment.status = 'cancelled'
                appointment.save()
                return Response({'error': 'Pencil booking has expired'}, status=400)
            
            appointment.status = 'confirmed'
            appointment.pencil_expires_at = None
            appointment.save()
            
            # Create invoice for confirmed appointment
            self._create_invoice_for_appointment(appointment)
            
            return Response({
                'message': 'Appointment confirmed successfully!',
                'appointment': AppointmentSerializer(appointment).data
            })
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
    
    @action(detail=False, methods=['post'])
    def join_waitlist(self, request):
        """Add user to waitlist"""
        waitlist_entry = Waitlist.objects.create(
            user=request.user,
            preferred_date=request.data.get('preferred_date'),
            preferred_time_start=request.data.get('time_start'),
            preferred_time_end=request.data.get('time_end'),
            service_needed=request.data.get('service'),
            urgency_level=request.data.get('urgency_level', 1)
        )
        
        position = Waitlist.objects.filter(
            preferred_date=waitlist_entry.preferred_date,
            urgency_level__gte=waitlist_entry.urgency_level,
            created_at__lt=waitlist_entry.created_at,
            status='active'
        ).count() + 1
        
        return Response({
            'message': 'Added to waitlist successfully',
            'position': position,
            'waitlist': WaitlistSerializer(waitlist_entry).data
        })
    
    @action(detail=False, methods=['post'])
    def ai_chat(self, request):
        """AI receptionist chat endpoint"""
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=400)
        
        context = {
            'user_appointments': AppointmentSerializer(
                Appointment.objects.filter(user=request.user)[:5], 
                many=True
            ).data,
            'clinic_hours': settings.CLINIC_HOURS,
            'current_time': str(timezone.now())
        }
        
        ai_assistant = GeminiAIAssistant()
        
        # Run async in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(
            ai_assistant.generate_chat_response(message, context)
        )
        loop.close()
        
        return Response({'response': response})
    
    @action(detail=False, methods=['get'])
    def ai_suggestions(self, request):
        """Get AI-powered suggestions"""
        suggestions = AISuggestion.objects.filter(user=request.user, is_read=False)
        serializer = AISuggestionSerializer(suggestions, many=True)
        return Response({'suggestions': serializer.data})
    
    @action(detail=False, methods=['get'])
    def waitlist_status(self, request):
        """Get current user's waitlist status and position (using Appointment model)"""
        user = request.user

        # Get all waitlisted appointments of the user
        waitlists = Appointment.objects.filter(
            user=user,
            status='waitlist'
        ).order_by('created_at')

        result = []

        for entry in waitlists:
            # Recalculate position dynamically
            position = Appointment.objects.filter(
                date=entry.date,
                status='waitlist',
                urgency_level__gte=entry.urgency_level,
                created_at__lt=entry.created_at
            ).count() + 1

            result.append({
                'id': entry.id,
                'date': entry.date,
                'time': entry.time,
                'service': entry.service,
                'other_concern': entry.other_concern,
                'urgency_level': entry.urgency_level,
                'status': entry.status,
                'position': position,
                'notes': entry.notes,
                'created_at': entry.created_at
            })

        return Response({
            'waitlists': result
        })
    
    @action(detail=False, methods=['get'])
    def get_available_slots(self, request):
        """Get available time slots"""
        date_str = request.query_params.get('date')
        service = request.query_params.get('service')
        
        if not date_str:
            return Response({'error': 'Date is required'}, status=400)
        
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)
        
        # Get service duration
        service_durations = {
            'consultation': 30,
            'teeth_cleaning': 60,
            'tooth_extraction': 60,
            'dental_filling': 60,
            'orthodontic': 180,
            'root_canal': 90,
            'dental_implant': 120,
            'teeth_whitening': 60,
        }
        duration = service_durations.get(service, 60)
        
        booked_times = Appointment.objects.filter(
            date=selected_date,
            status__in=['pending', 'confirmed', 'pencil']
        ).values_list('time', flat=True)
        
        booked_times = [t.strftime('%H:%M') for t in booked_times]
        
        available_slots = []
        for hour in range(9, 18):
            if hour == 12:
                continue
            for minute in [0, 30]:
                slot_time = f"{hour:02d}:{minute:02d}"
                if slot_time in booked_times:
                    continue
                
                slot_datetime = datetime.combine(selected_date, datetime.strptime(slot_time, '%H:%M').time())
                end_datetime = slot_datetime + timedelta(minutes=duration)
                
                if slot_datetime.hour < 12 and end_datetime.hour >= 12:
                    continue
                if end_datetime.hour > 18 or (end_datetime.hour == 18 and end_datetime.minute > 0):
                    continue
                
                available_slots.append({
                    'time': datetime.strptime(slot_time, '%H:%M').strftime('%I:%M %p'),
                    'timeValue': slot_time,
                    'hour': hour,
                    'minute': minute
                })
        
        return Response({'available_slots': available_slots})


class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Invoice.objects.all().select_related('user', 'appointment')
        return Invoice.objects.filter(user=user)
    
    @action(detail=False, methods=['get'])
    def my_invoices(self, request):
        """Get current user's invoices"""
        invoices = Invoice.objects.filter(user=request.user)
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add payment to invoice"""
        invoice = self.get_object()
        
        payment = Payment.objects.create(
            invoice=invoice,
            user=request.user,
            amount=request.data.get('amount'),
            payment_method=request.data.get('payment_method'),
            reference_number=request.data.get('reference_number'),
            processed_by=request.user if request.user.is_staff else None,
            status='completed'
        )
        
        # Log payment
        AuditLog.objects.create(
            user=request.user,
            action='create',
            model_name='Payment',
            object_id=str(payment.id),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({
            'message': 'Payment recorded successfully',
            'payment': PaymentSerializer(payment).data,
            'invoice': self.get_serializer(invoice).data
        })
    
    @action(detail=True, methods=['post'])
    def send_reminder(self, request, pk=None):
        """Send invoice reminder email"""
        invoice = self.get_object()
        send_invoice_email.delay(invoice.id)
        return Response({'message': 'Reminder sent successfully'})


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Payment.objects.all().select_related('invoice', 'user')
        return Payment.objects.filter(user=user)


class StaffViewSet(viewsets.ViewSet):
    """Staff/dentist specific endpoints"""
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return super().get_permissions()
        raise PermissionDenied("Staff access required")
    
    @action(detail=False, methods=['get'])
    def today_appointments(self, request):
        """Get today's appointments"""
        today = timezone.now().date()
        appointments = Appointment.objects.filter(
            date=today,
            status__in=['confirmed', 'pending']
        ).select_related('user')
        
        return Response({
            'date': today,
            'appointments': AppointmentSerializer(appointments, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def upcoming_appointments(self, request):
        """Get upcoming appointments for the week"""
        today = timezone.now().date()
        next_week = today + timedelta(days=7)
        
        appointments = Appointment.objects.filter(
            date__range=[today, next_week],
            status__in=['confirmed', 'pending']
        ).order_by('date', 'time')
        
        return Response({
            'appointments': AppointmentSerializer(appointments, many=True).data
        })
    
    @action(detail=True, methods=['post'])
    def update_prescription(self, request, pk=None):
        """Update appointment prescription"""
        try:
            appointment = Appointment.objects.get(pk=pk)
            appointment.prescription = request.data.get('prescription', '')
            appointment.save()
            return Response({'message': 'Prescription updated'})
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
    
    @action(detail=False, methods=['get'])
    def pending_payments(self, request):
        """Get all pending/overdue invoices"""
        invoices = Invoice.objects.filter(
            status__in=['sent', 'partial', 'overdue']
        ).select_related('user')
        
        return Response({
            'invoices': InvoiceSerializer(invoices, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def revenue_stats(self, request):
        """Get revenue statistics"""
        from django.db.models import Sum
        
        # Today's revenue
        today = timezone.now().date()
        today_revenue = Payment.objects.filter(
            payment_date__date=today,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # This month's revenue
        this_month = today.replace(day=1)
        month_revenue = Payment.objects.filter(
            payment_date__date__gte=this_month,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'today_revenue': today_revenue,
            'month_revenue': month_revenue,
            'pending_invoices': Invoice.objects.filter(status__in=['sent', 'partial']).count(),
            'overdue_invoices': Invoice.objects.filter(status='overdue').count()
        })


class AdminViewSet(viewsets.ViewSet):
    """Admin-only endpoints"""
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.request.user.is_superuser or self.request.user.role == 'admin':
            return super().get_permissions()
        raise PermissionDenied("Admin access required")
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get comprehensive dashboard statistics"""
        from django.db.models import Sum, Count, Q
        from datetime import datetime, timedelta
        
        today = timezone.now().date()
        this_month_start = today.replace(day=1)
        
        stats = {
            'users': {
                'total': User.objects.count(),
                'patients': User.objects.filter(role='patient').count(),
                'staff': User.objects.filter(role='staff').count(),
                'dentists': User.objects.filter(role='dentist').count(),
                'new_this_month': User.objects.filter(date_joined__date__gte=this_month_start).count(),
            },
            'appointments': {
                'total': Appointment.objects.count(),
                'pending': Appointment.objects.filter(status='pending').count(),
                'confirmed': Appointment.objects.filter(status='confirmed').count(),
                'completed': Appointment.objects.filter(status='completed').count(),
                'cancelled': Appointment.objects.filter(status='cancelled').count(),
                'no_show': Appointment.objects.filter(status='no_show').count(),
                'today': Appointment.objects.filter(date=today).exclude(status='cancelled').count(),
                'upcoming_week': Appointment.objects.filter(
                    date__range=[today, today + timedelta(days=7)]
                ).exclude(status='cancelled').count(),
            },
            'revenue': {
                'today': Payment.objects.filter(payment_date__date=today, status='completed').aggregate(total=Sum('amount'))['total'] or 0,
                'this_month': Payment.objects.filter(payment_date__date__gte=this_month_start, status='completed').aggregate(total=Sum('amount'))['total'] or 0,
                'total': Payment.objects.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0,
            },
            'invoices': {
                'total': Invoice.objects.count(),
                'paid': Invoice.objects.filter(status='paid').count(),
                'pending': Invoice.objects.filter(status='sent').count(),
                'partial': Invoice.objects.filter(status='partial').count(),
                'overdue': Invoice.objects.filter(status='overdue').count(),
                'total_outstanding': Invoice.objects.filter(status__in=['sent', 'partial']).aggregate(total=Sum('balance_due'))['total'] or 0,
            },
            'waitlist': {
                'active': Waitlist.objects.filter(status='active').count(),
                'high_urgency': Waitlist.objects.filter(urgency_level=3, status='active').count(),
            },
            'ai_suggestions': {
                'unread': AISuggestion.objects.filter(is_read=False).count(),
                'total': AISuggestion.objects.count(),
            },
            'recent_activity': AuditLogSerializer(AuditLog.objects.all()[:20], many=True).data,
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def user_analytics(self, request):
        """Get user analytics"""
        from django.db.models import Count
        from datetime import timedelta
        
        last_30_days = timezone.now().date() - timedelta(days=30)
        
        # User registrations by day
        daily_registrations = User.objects.filter(
            date_joined__date__gte=last_30_days
        ).extra({'date': "date(date_joined)"}).values('date').annotate(count=Count('id'))
        
        # User activity
        active_users = Appointment.objects.filter(
            created_at__date__gte=last_30_days
        ).values('user__username').annotate(
            appointments=Count('id')
        ).order_by('-appointments')[:10]
        
        return Response({
            'daily_registrations': list(daily_registrations),
            'top_active_users': list(active_users),
        })
    
    @action(detail=False, methods=['get'])
    def system_logs(self, request):
        """View system audit logs"""
        logs = AuditLog.objects.all().select_related('user').order_by('-timestamp')[:100]
        return Response(AuditLogSerializer(logs, many=True).data)
    
    @action(detail=False, methods=['post'])
    def run_maintenance(self, request):
        """Run system maintenance tasks"""
        # Check for overdue invoices
        check_overdue_invoices.delay()
        
        # Check waitlist for slots
        check_waitlist_for_slots.delay()
        
        # Generate AI recommendations
        generate_ai_recommendations.delay()
        
        return Response({'message': 'Maintenance tasks started successfully'})

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin/staff can see all notifications (for debugging)
        if user.is_superuser or user.is_staff:
            queryset = Notification.objects.all()
        else:
            queryset = Notification.objects.filter(user=user)
        
        # Filter by read/unread
        is_read = self.request.query_params.get('is_read', None)
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        # Filter by notification type
        notification_type = self.request.query_params.get('type', None)
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Exclude expired
        exclude_expired = self.request.query_params.get('exclude_expired', 'true')
        if exclude_expired == 'true':
            queryset = queryset.filter(
                models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
            )
        
        return queryset.select_related('user')
    
    def list(self, request, *args, **kwargs):
        """Get notifications with pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'notifications': serializer.data,
                'unread_count': self.get_queryset().filter(is_read=False).count(),
                'total_count': self.get_queryset().count(),
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'notifications': serializer.data,
            'unread_count': self.get_queryset().filter(is_read=False).count(),
            'total_count': self.get_queryset().count(),
        })
    
   
    
    @action(detail=False, methods=['delete'])
    def delete_all_read(self, request):
        """Delete all read notifications"""
        if not (request.user.is_superuser or request.user.is_staff):
            # Users can only delete their own
            deleted_count = Notification.objects.filter(
                user=request.user, 
                is_read=True
            ).delete()[0]
        else:
            # Admin can delete all read notifications
            deleted_count = Notification.objects.filter(is_read=True).delete()[0]
        
        return Response({
            'message': f'Deleted {deleted_count} read notifications',
            'deleted_count': deleted_count
        })
    
    @action(detail=True, methods=['post'])
    def mark_single_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread notification count"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def test_notification(self, request):
        """Test endpoint for sending notifications (admin only)"""
        if not (request.user.is_superuser or request.user.is_staff):
            raise PermissionDenied("Admin access required")
        
        notification = Notification.objects.create(
            user=request.user,
            notification_type='system_alert',
            title='Test Notification',
            message='This is a test notification to verify the system is working correctly.',
            priority='high',
            channel='in_app',
            action_url='/dashboard',
            expires_at=timezone.now() + timedelta(days=1)
        )
        
        return Response({
            'message': 'Test notification created',
            'notification': NotificationSerializer(notification).data
        })


class NotificationPreferenceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_preferences(self, request):
        """Get or create notification preferences for current user"""
        preferences, created = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences)
        return Response(serializer.data)
    
    def update_preferences(self, request):
        """Update notification preferences"""
        preferences, created = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
    @action(detail=False, methods=['get'])
    def get(self, request):
        return self.get_preferences(request)
    
    @action(detail=False, methods=['put', 'patch'])
    def update(self, request):
        return self.update_preferences(request)    