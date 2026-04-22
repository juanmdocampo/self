from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_PATIENT = 'patient'
    ROLE_PSYCHOLOGIST = 'psychologist'
    ROLE_CHOICES = [
        (ROLE_PATIENT, 'Paciente'),
        (ROLE_PSYCHOLOGIST, 'Psicólogo/a'),
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

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='psychologist_profile')
    specialties = models.JSONField(default=list)
    modality = models.CharField(max_length=20, choices=MODALITY_CHOICES, default=MODALITY_BOTH)
    session_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    years_experience = models.PositiveIntegerField(default=0)
    license_number = models.CharField(max_length=50, blank=True)
    languages = models.JSONField(default=list)
    city = models.CharField(max_length=100, blank=True)
    is_verified = models.BooleanField(default=False)
    is_accepting_patients = models.BooleanField(default=True)

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


class Match(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_patient')
    psychologist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_psychologist')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('patient', 'psychologist')

    def __str__(self):
        return f'Match: {self.patient.username} ↔ {self.psychologist.username}'
