from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Match, PsychologistProfile, SwipeAction, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'created_at']
    list_filter = ['role', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Self', {'fields': ('role', 'avatar', 'bio')}),
    )


@admin.register(PsychologistProfile)
class PsychologistProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'modality', 'session_price', 'years_experience', 'city', 'is_verified', 'is_accepting_patients']
    list_filter = ['modality', 'is_verified', 'is_accepting_patients']
    list_editable = ['is_verified', 'is_accepting_patients']


@admin.register(SwipeAction)
class SwipeActionAdmin(admin.ModelAdmin):
    list_display = ['patient', 'psychologist', 'action', 'created_at']
    list_filter = ['action']


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ['patient', 'psychologist', 'created_at', 'is_active']
    list_filter = ['is_active']
