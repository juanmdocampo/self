# -*- coding: utf-8 -*-
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from backend.core.models import User, PsychologistProfile

# Fix existing bad-encoded psychologists
User.objects.filter(username__in=['ana_garcia', 'martin_lopez', 'sofia_ruiz']).delete()

psicologos = [
    {
        'username': 'ana_garcia',
        'first_name': 'Ana',
        'last_name': 'García',
        'email': 'ana@self.com',
        'bio': 'Especializada en ansiedad y terapia cognitivo-conductual. 8 años de experiencia acompañando a personas en su camino hacia el bienestar.',
        'profile': {
            'specialties': ['Ansiedad', 'Depresión', 'TCC'],
            'modality': 'both',
            'session_price': 4500,
            'years_experience': 8,
            'city': 'Buenos Aires',
            'languages': ['Español'],
            'is_verified': True,
        }
    },
    {
        'username': 'martin_lopez',
        'first_name': 'Martín',
        'last_name': 'López',
        'email': 'martin@self.com',
        'bio': 'Psicólogo clínico con enfoque sistémico. Trabajo con adultos y parejas en procesos de cambio y crecimiento personal.',
        'profile': {
            'specialties': ['Terapia de Pareja', 'Sistémica', 'Duelo'],
            'modality': 'online',
            'session_price': 3800,
            'years_experience': 5,
            'city': 'Córdoba',
            'languages': ['Español', 'Inglés'],
            'is_verified': True,
        }
    },
    {
        'username': 'sofia_ruiz',
        'first_name': 'Sofía',
        'last_name': 'Ruiz',
        'email': 'sofia@self.com',
        'bio': 'Psicóloga infanto-juvenil y de adultos. Me especializo en trauma y EMDR. Creo en un espacio terapéutico cálido y sin juicios.',
        'profile': {
            'specialties': ['Trauma', 'EMDR', 'Infanto-Juvenil'],
            'modality': 'presential',
            'session_price': 5200,
            'years_experience': 12,
            'city': 'Buenos Aires',
            'languages': ['Español'],
            'is_verified': True,
        }
    },
]

for data in psicologos:
    profile_data = data.pop('profile')
    user = User.objects.create_user(password='test1234', role='psychologist', **data)
    PsychologistProfile.objects.create(user=user, is_accepting_patients=True, **profile_data)
    print(f'Creado: {user.get_full_name()}')

print('Seed completado.')
