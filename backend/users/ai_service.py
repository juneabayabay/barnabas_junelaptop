# ai_service.py
from collections import Counter
from django.utils import timezone
from datetime import datetime, timedelta

class AIDentalScheduler:
    
    @staticmethod
    def analyze_booking_patterns(user_appointments):
        """Analyze user's booking patterns"""
        if not user_appointments:
            return None
        
        times = [apt.time.hour for apt in user_appointments if apt.time]
        days = [apt.date.weekday() for apt in user_appointments]
        services = [apt.service for apt in user_appointments if apt.service]
        
        most_common_time = Counter(times).most_common(1)[0][0] if times else None
        most_common_day = Counter(days).most_common(1)[0][0] if days else None
        most_common_service = Counter(services).most_common(1)[0][0] if services else None
        
        return {
            'preferred_time': most_common_time,
            'preferred_day': most_common_day,
            'preferred_service': most_common_service,
            'booking_frequency': len(user_appointments),
            'average_lead_days': AIDentalScheduler._calculate_lead_days(user_appointments)
        }
    
    @staticmethod
    def _calculate_lead_days(appointments):
        """Calculate average lead days before appointment"""
        lead_days = []
        for apt in appointments:
            lead_days.append((apt.date - apt.created_at.date()).days)
        return sum(lead_days) // len(lead_days) if lead_days else 0
    
    @staticmethod
    def suggest_optimal_time(available_slots, user_preferences, urgency):
        """Suggest optimal time based on user preferences and urgency"""
        if not available_slots:
            return None
        
        scored_slots = []
        for slot in available_slots:
            score = 0
            slot_hour = slot['hour']
            
            if user_preferences and user_preferences.get('preferred_time'):
                if abs(slot_hour - user_preferences['preferred_time']) <= 1:
                    score += 10
            
            if urgency >= 3:
                score += (12 - slot_hour)
            elif urgency == 2:
                score += (10 - slot_hour) // 2
            
            if slot_hour == 12:
                score -= 5
            
            scored_slots.append({'slot': slot, 'score': score})
        
        best_slot = max(scored_slots, key=lambda x: x['score'])
        return best_slot['slot']
    
    @staticmethod
    def predict_cancellation_risk(appointment):
        """Predict cancellation risk for an appointment"""
        risk_factors = []
        risk_score = 0
        
        days_until = (appointment.date - timezone.now().date()).days
        if days_until > 14:
            risk_score += 30
            risk_factors.append("Appointment is far in the future")
        elif days_until > 7:
            risk_score += 15
            risk_factors.append("Appointment is more than a week away")
        
        if appointment.time.hour < 9 or appointment.time.hour > 17:
            risk_score += 20
            risk_factors.append("Unusual time slot")
        
        user_cancellations = appointment.user.appointments.filter(status='cancelled').count()
        if user_cancellations > 2:
            risk_score += min(user_cancellations * 10, 40)
            risk_factors.append(f"User has {user_cancellations} previous cancellations")
        
        return {
            'risk_score': min(risk_score, 100),
            'risk_factors': risk_factors,
            'risk_level': 'High' if risk_score > 60 else 'Medium' if risk_score > 30 else 'Low'
        }
    
    @staticmethod
    def generate_waitlist_suggestions(waitlist_entries, available_slots):
        """Generate AI suggestions for waitlist users"""
        suggestions = []
        
        for entry in waitlist_entries[:10]:
            matching_slots = []
            
            for slot in available_slots:
                slot_time = datetime.strptime(slot['timeValue'], '%H:%M').time()
                
                if entry.preferred_time_start <= slot_time <= entry.preferred_time_end:
                    matching_slots.append(slot)
            
            if matching_slots:
                suggestions.append({
                    'user_id': entry.user.id,
                    'username': entry.user.username,
                    'available_slots': matching_slots,
                    'urgency': entry.urgency_level,
                    'service': entry.service_needed
                })
        
        return suggestions
    
    @staticmethod
    def recommend_service_based_on_history(user_history):
        """Recommend services based on user's history"""
        if not user_history:
            return None
        
        services = [apt.service for apt in user_history if apt.service]
        if services:
            most_common = Counter(services).most_common(1)[0][0]
            return {
                'service': most_common,
                'message': f"Based on your history, you might need another {most_common} soon."
            }
        
        return None