import google.generativeai as genai
from django.conf import settings
from collections import Counter
from django.utils import timezone
from datetime import datetime, timedelta
import json

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


class AIDentalScheduler:
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
    
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
        
        # Calculate preferred time range
        preferred_hours = []
        for t in times:
            preferred_hours.extend([t-1, t, t+1])
        preferred_hours = [h for h in preferred_hours if 9 <= h <= 18 and h != 12]
        
        return {
            'preferred_time': most_common_time,
            'preferred_time_range': preferred_hours[:3] if preferred_hours else None,
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
            if apt.created_at:
                lead_days.append((apt.date - apt.created_at.date()).days)
        return sum(lead_days) // len(lead_days) if lead_days else 0
    
    async def get_gemini_suggestions(self, user_data, appointment_history):
        """Get AI suggestions using Gemini API"""
        prompt = f"""
        As a dental clinic AI assistant, analyze this patient data and provide 3 actionable suggestions:
        
        Patient Info:
        - Age: {user_data.get('age', 'Unknown')}
        - Previous appointments: {len(appointment_history)}
        - Common services: {user_data.get('common_services', [])}
        
        Appointment History:
        {json.dumps(appointment_history[:5], default=str)}
        
        Provide suggestions for:
        1. Optimal booking times based on patterns
        2. Preventive care recommendations
        3. Follow-up schedule
        
        Format as JSON with keys: 'booking_suggestion', 'preventive_care', 'follow_up'
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            suggestions = json.loads(response.text)
            return suggestions
        except Exception as e:
            print(f"Gemini API error: {e}")
            return None
    
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
                score += (12 - slot_hour) if slot_hour < 12 else (18 - slot_hour)
            elif urgency == 2:
                score += (10 - slot_hour) // 2 if slot_hour < 12 else (17 - slot_hour) // 2
            
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
        
        # Check if it's a rescheduled appointment
        if appointment.notes and 'rescheduled' in appointment.notes.lower():
            risk_score += 15
            risk_factors.append("Previously rescheduled appointment")
        
        return {
            'risk_score': min(risk_score, 100),
            'risk_factors': risk_factors,
            'risk_level': 'High' if risk_score > 60 else 'Medium' if risk_score > 30 else 'Low'
        }
    
    async def generate_waitlist_suggestions(self, waitlist_entries, available_slots):
        """Generate AI suggestions for waitlist users using Gemini"""
        suggestions = []
        
        if not waitlist_entries or not available_slots:
            return suggestions
        
        # Create prompt for Gemini
        waitlist_data = []
        for entry in waitlist_entries[:10]:
            waitlist_data.append({
                'user_id': entry.user.id,
                'username': entry.user.username,
                'preferred_date': str(entry.preferred_date),
                'preferred_time': f"{entry.preferred_time_start} - {entry.preferred_time_end}",
                'service': entry.service_needed,
                'urgency': entry.urgency_level
            })
        
        prompt = f"""
        Match these waitlist users with available slots:
        
        Waitlist Users: {json.dumps(waitlist_data, default=str)}
        Available Slots: {json.dumps(available_slots[:20], default=str)}
        
        For each user, suggest the best available slot that matches their preferences.
        Consider urgency level and preferred time windows.
        
        Return as JSON array with keys: user_id, suggested_slot, reason
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            matches = json.loads(response.text)
            
            for match in matches:
                suggestions.append({
                    'user_id': match['user_id'],
                    'suggested_slot': match['suggested_slot'],
                    'reason': match['reason']
                })
        except Exception as e:
            print(f"Gemini waitlist matching error: {e}")
            
            # Fallback to simple matching
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
            
            # Calculate next recommended date
            last_appointment = max(user_history, key=lambda x: x.date)
            next_recommended = last_appointment.date + timedelta(days=180)  # 6 months for checkup
            
            return {
                'service': most_common,
                'message': f"Based on your history, you might need another {most_common} soon.",
                'recommended_date': next_recommended
            }
        
        return None
    
    async def analyze_patient_health_trends(self, patient_records):
        """Analyze patient health trends using Gemini"""
        prompt = f"""
        Analyze these dental patient records and identify:
        1. Common treatment patterns
        2. Potential preventive care needs
        3. Risk factors for dental issues
        
        Patient Records Summary:
        {json.dumps(patient_records, default=str)}
        
        Provide insights as JSON with keys: 'patterns', 'preventive_care', 'risk_factors'
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return json.loads(response.text)
        except Exception as e:
            print(f"Health trends analysis error: {e}")
            return None


class GeminiAIAssistant:
    """Wrapper class for Gemini AI operations"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def generate_chat_response(self, message, context):
        """Generate conversational AI response for receptionist"""
        prompt = f"""
        You are a dental clinic receptionist AI assistant. 
        
        Context: {json.dumps(context)}
        User message: {message}
        
        Provide a helpful, professional response about:
        - Appointment scheduling
        - Clinic hours and policies
        - Available services
        - Payment and insurance inquiries
        
        Keep response concise and friendly.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"I apologize, but I'm having trouble processing your request. Please contact the clinic directly. Error: {e}"
    
    async def optimize_schedule(self, appointments, staff_availability):
        """Optimize clinic schedule using AI"""
        prompt = f"""
        Optimize this dental clinic schedule:
        
        Current Appointments: {json.dumps(appointments, default=str)}
        Staff Availability: {json.dumps(staff_availability)}
        
        Suggest improvements to:
        1. Minimize wait times
        2. Balance dentist workload
        3. Maximize efficiency
        
        Return as JSON with 'optimizations' array.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return json.loads(response.text)
        except Exception as e:
            print(f"Schedule optimization error: {e}")
            return {'optimizations': []}