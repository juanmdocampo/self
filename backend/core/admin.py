from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import Appointment, Availability, Conversation, Favorite, Message, PsychologistProfile, RecurringAvailability, SwipeAction, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'city', 'created_at']
    list_filter = ['role', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Self', {'fields': ('role', 'avatar', 'bio', 'city', 'sought_specialties')}),
    )


def aprobar_psicologos(modeladmin, request, queryset):
    queryset.update(verification_status=PsychologistProfile.STATUS_APPROVED, rejection_reason='')

aprobar_psicologos.short_description = '✓ Aprobar psicólogos seleccionados'


def rechazar_psicologos(modeladmin, request, queryset):
    queryset.update(verification_status=PsychologistProfile.STATUS_REJECTED)

rechazar_psicologos.short_description = '✕ Rechazar psicólogos seleccionados (sin motivo)'


@admin.register(PsychologistProfile)
class PsychologistProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'city', 'modality', 'session_price',
        'verification_status', 'document_link', 'is_accepting_patients',
    ]
    list_filter = ['verification_status', 'modality', 'is_accepting_patients']
    list_editable = ['verification_status', 'is_accepting_patients']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'user__email', 'license_number']
    readonly_fields = ['document_link']
    actions = [aprobar_psicologos, rechazar_psicologos]
    fieldsets = (
        ('Perfil profesional', {
            'fields': (
                'user', 'specialties', 'modality', 'session_price',
                'years_experience', 'city', 'languages', 'license_number',
                'is_accepting_patients',
            ),
        }),
        ('Verificación', {
            'fields': ('verification_status', 'rejection_reason', 'document_link'),
        }),
    )

    @admin.display(description='Documento')
    def document_link(self, obj):
        if obj.document_upload:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener">Ver documento ↗</a>',
                obj.document_upload.url,
            )
        return '—'


@admin.register(SwipeAction)
class SwipeActionAdmin(admin.ModelAdmin):
    list_display = ['patient', 'psychologist', 'action', 'created_at']
    list_filter = ['action']


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['patient', 'psychologist', 'created_at', 'is_active']
    list_filter = ['is_active']


@admin.register(RecurringAvailability)
class RecurringAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['psychologist', 'day_of_week', 'start_time', 'end_time', 'is_active']
    list_filter = ['is_active', 'day_of_week']


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ['psychologist', 'date', 'start_time', 'end_time', 'is_booked']
    list_filter = ['is_booked', 'date']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['patient', 'psychologist', 'availability', 'status', 'created_at']
    list_filter = ['status']


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['patient', 'psychologist', 'created_at', 'updated_at']
    raw_id_fields = ['patient', 'psychologist']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'sender', 'text', 'created_at', 'is_read']
    list_filter = ['is_read']
