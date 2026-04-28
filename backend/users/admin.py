# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Appointment, Waitlist, AISuggestion, BookingReservation

# --- Custom User Admin ---
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ("email", "is_staff", "is_superuser")
    ordering = ("email",)
    search_fields = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "is_staff", "is_superuser"),
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)

# --- Appointment Admin ---
@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'date', 'time', 'service', 'status', 'created_at']
    list_filter = ['status', 'date', 'urgency_level']
    search_fields = ['user__username', 'user__email', 'service', 'other_concern']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Patient Information', {'fields': ('user',)}),
        ('Appointment Details', {'fields': ('date', 'time', 'service', 'other_concern')}),
        ('Status Information', {'fields': ('status', 'urgency_level', 'pencil_expires_at')}),
        ('AI & Notes', {'fields': ('ai_suggestion', 'notes', 'created_at', 'updated_at')}),
    )

# --- Waitlist Admin ---
@admin.register(Waitlist)
class WaitlistAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'preferred_date', 'service_needed', 'urgency_level', 'status']
    list_filter = ['status', 'urgency_level', 'preferred_date']
    search_fields = ['user__username', 'service_needed']
    readonly_fields = ['created_at']

# --- AI Suggestion Admin ---
@admin.register(AISuggestion)
class AISuggestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'suggestion_type', 'title', 'priority', 'is_read', 'created_at']
    list_filter = ['suggestion_type', 'is_read', 'priority']
    search_fields = ['user__username', 'title', 'description']
    readonly_fields = ['created_at']

# --- Booking Reservation Admin ---
@admin.register(BookingReservation)
class BookingReservationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'token', 'date', 'time', 'is_confirmed', 'expires_at']
    list_filter = ['is_confirmed', 'date']
    search_fields = ['user__username', 'token']
    readonly_fields = ['created_at']
