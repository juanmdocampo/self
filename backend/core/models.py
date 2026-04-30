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
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True)
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
    document_upload = models.FileField(upload_to='documents/', blank=True, null=True)
    is_accepting_patients = models.BooleanField(default=True)

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
