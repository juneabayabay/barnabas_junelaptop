from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register('register', RegisterViewset, basename='register')
router.register('login', LoginViewset, basename='login')
router.register('admin-login', AdminLoginViewset, basename='admin-login')
router.register('users', UserViewset, basename='users')
router.register('appointments', AppointmentViewSet, basename='appointments')
router.register('patient-records', PatientRecordViewSet, basename='patient-records')
router.register('invoices', InvoiceViewSet, basename='invoices')
router.register('payments', PaymentViewSet, basename='payments')
router.register('staff', StaffViewSet, basename='staff')
router.register('admin', AdminViewSet, basename='admin')
router.register('notifications', NotificationViewSet, basename='notifications')

notification_preference_urls = [
    path('notification-preferences/', NotificationPreferenceViewSet.as_view({
        'get': 'get', 
        'put': 'update', 
        'patch': 'update'
    }), name='notification-preferences'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('api/password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    *notification_preference_urls,
]