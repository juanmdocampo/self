from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_PATIENT = 'patient'
    ROLE_PSYCHOLOGIST = 'psychologist'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_PATIENT, 'Paciente'),
        (ROLE_PSYCHOLOGIST, 'Psicólogo/a'),
        (ROLE_ADMIN, 'Administrador'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PATIENT)
    avatar = models.CharField(max_length=500, blank=True, null=True, default='')
    bio = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    sought_specialties = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'


class PsychologistProfile(models.Model):
    MODALITY_ONLINE = 'online'
    MODALITY_PRESENTIAL = 'presential'
    MODALITY_BOTH = 'both'
    MODALITY_CHOICES = [
        (MODALITY_ONLINE, 'Online'),
        (MODALITY_PRESENTIAL, 'Presencial'),
        (MODALITY_BOTH, 'Ambas'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente de revisión'),
        (STATUS_APPROVED, 'Aprobado'),
        (STATUS_REJECTED, 'Rechazado'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='psychologist_profile')
    specialties = models.JSONField(default=list)
    modality = models.CharField(max_length=20, choices=MODALITY_CHOICES, default=MODALITY_BOTH)
    session_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    years_experience = models.PositiveIntegerField(default=0)
    license_number = models.CharField(max_length=50, blank=True)
    languages = models.JSONField(default=list)
    city = models.CharField(max_length=100, blank=True)
    verification_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.TextField(blank=True, default='')
    document_upload = models.CharField(max_length=500, blank=True, null=True, default='')
    is_accepting_patients = models.BooleanField(default=True)
    slot_duration = models.PositiveIntegerField(default=60, help_text='Duración de cada sesión en minutos')
    slot_gap = models.PositiveIntegerField(default=0, help_text='Pausa entre sesiones en minutos')

    @property
    def is_verified(self):
        return self.verification_status == self.STATUS_APPROVED

    def __str__(self):
        return f'Perfil de {self.user.get_full_name() or self.user.username}'


class SwipeAction(models.Model):
    LIKE = 'like'
    PASS = 'pass'
    ACTION_CHOICES = [
        (LIKE, 'Like'),
        (PASS, 'Pasar'),
    ]

    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='swipes_made')
    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='swipes_received')
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('patient', 'psychologist')

    def __str__(self):
        return f'{self.patient.username} → {self.psychologist.username}: {self.action}'


class Favorite(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites_as_patient')
    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites_as_psychologist')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('patient', 'psychologist')

    def __str__(self):
        return f'Favorite: {self.patient.username} ↔ {self.psychologist.username}'


class RecurringAvailability(models.Model):
    DAYS = [
        (0, 'Lunes'), (1, 'Martes'), (2, 'Miércoles'),
        (3, 'Jueves'), (4, 'Viernes'), (5, 'Sábado'), (6, 'Domingo'),
    ]

    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recurring_availability')
    day_of_week = models.IntegerField(choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    cancelled_dates = models.JSONField(default=list)

    class Meta:
        unique_together = ('psychologist', 'day_of_week', 'start_time')

    def __str__(self):
        day = dict(self.DAYS)[self.day_of_week]
        return f'{self.psychologist.username} — {day} {self.start_time}–{self.end_time}'


class Availability(models.Model):
    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability_slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)

    class Meta:
        ordering = ['date', 'start_time']
        unique_together = ('psychologist', 'date', 'start_time')

    def __str__(self):
        return f'{self.psychologist.username} — {self.date} {self.start_time}'


class Appointment(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_REJECTED = 'rejected'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente de aprobación'),
        (STATUS_CONFIRMED, 'Confirmado'),
        (STATUS_REJECTED, 'Rechazado'),
        (STATUS_CANCELLED, 'Cancelado'),
    ]

    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments_as_patient')
    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments_as_psychologist')
    availability = models.OneToOneField(Availability, on_delete=models.CASCADE, related_name='appointment')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    recurring_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Turno: {self.patient.username} con {self.psychologist.username} — {self.availability.date}'


class RecurringBooking(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_REJECTED = 'rejected'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente de aprobación'),
        (STATUS_CONFIRMED, 'Confirmado'),
        (STATUS_REJECTED, 'Rechazado'),
        (STATUS_CANCELLED, 'Cancelado'),
    ]
    DAYS = RecurringAvailability.DAYS

    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recurring_bookings')
    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recurring_bookings_received')
    day_of_week = models.IntegerField(choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.TextField(blank=True)
    cancelled_dates = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        day = dict(self.DAYS)[self.day_of_week]
        return f'Recurrente: {self.patient.username} con {self.psychologist.username} — {day}'


class AppointmentModification(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_ACCEPTED, 'Aceptado'),
        (STATUS_REJECTED, 'Rechazado'),
    ]

    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE,
        related_name='modifications', null=True, blank=True,
    )
    recurring_booking = models.ForeignKey(
        RecurringBooking, on_delete=models.CASCADE,
        related_name='modifications', null=True, blank=True,
    )
    proposed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proposed_modifications')
    is_cancellation = models.BooleanField(default=False)
    new_date = models.DateField(null=True, blank=True)
    new_start_time = models.TimeField(null=True, blank=True)
    new_end_time = models.TimeField(null=True, blank=True)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Modificación por {self.proposed_by.username} — {self.status}'


class Conversation(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_patient')
    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_psychologist')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('patient', 'psychologist')

    def __str__(self):
        return f'Chat: {self.patient.username} ↔ {self.psychologist.username}'


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f'Msg {self.id} from {self.sender.username}'
