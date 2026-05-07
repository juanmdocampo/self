from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/me/', views.me),
    path('auth/token/refresh/', TokenRefreshView.as_view()),

    # Public
    path('psychologists/', views.psychologists_list),
    path('psychologists/<int:pk>/', views.psychologist_detail),

    # Patient
    path('swipe/', views.swipe),
    path('favorites/', views.my_favorites),
    path('favorites/<int:pk>/', views.delete_favorite),

    # Calendar
    path('calendar/events/', views.calendar_events),
    path('calendar/events/psychologist/<int:pk>/', views.psychologist_public_events),
    path('calendar/slots/', views.availability_slots),
    path('calendar/slots/<int:pk>/', views.availability_slot_detail),
    path('calendar/recurring/', views.recurring_availability),
    path('calendar/recurring/<int:pk>/', views.recurring_availability_detail),
    path('calendar/appointments/', views.appointments),
    path('calendar/appointments/<int:pk>/', views.appointment_detail),

    # Chat
    path('chat/', views.conversations),
    path('chat/<int:pk>/messages/', views.conversation_messages),

    # Admin
    path('admin/psychologists/', views.admin_psychologists),
    path('admin/psychologists/<int:pk>/verify/', views.admin_verify),
    path('admin/stats/', views.admin_stats),
]
