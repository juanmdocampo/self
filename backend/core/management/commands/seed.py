from django.core.management.base import BaseCommand
from backend.core.models import User, PsychologistProfile


PSYCHOLOGISTS = [
    {
        'username': 'sofia_martinez',
        'first_name': 'Sofía',
        'last_name': 'Martínez',
        'email': 'sofia@self-app.com',
        'bio': 'Especialista en ansiedad y trastornos del estado de ánimo. Trabajo con adultos y adolescentes desde un enfoque TCC, integrando técnicas de mindfulness. Mi consulta es un espacio seguro, sin juicios.',
        'profile': {
            'specialties': ['TCC', 'Ansiedad', 'Depresión'],
            'modality': 'both',
            'session_price': 8000,
            'years_experience': 7,
            'license_number': 'MN 45231',
            'languages': ['Español', 'Inglés'],
            'city': 'Buenos Aires',
            'is_accepting_patients': True,
        },
    },
    {
        'username': 'martin_lopez',
        'first_name': 'Martín',
        'last_name': 'López',
        'email': 'martin@self-app.com',
        'bio': 'Psicoanalista con más de 10 años de experiencia. Trabajo con adultos en procesos de autoconocimiento, vínculos y subjetividad. Consulta presencial en Palermo.',
        'profile': {
            'specialties': ['Psicoanálisis', 'Pareja', 'Duelo'],
            'modality': 'presential',
            'session_price': 10000,
            'years_experience': 12,
            'license_number': 'MN 38901',
            'languages': ['Español'],
            'city': 'Buenos Aires',
            'is_accepting_patients': True,
        },
    },
    {
        'username': 'valentina_ruiz',
        'first_name': 'Valentina',
        'last_name': 'Ruiz',
        'email': 'valentina@self-app.com',
        'bio': 'Psicóloga sistémica con enfoque en familia y pareja. También trabajo trauma y abuso desde EMDR. Sesiones online para toda Argentina.',
        'profile': {
            'specialties': ['Sistémica', 'Familia', 'Trauma', 'EMDR'],
            'modality': 'online',
            'session_price': 7500,
            'years_experience': 5,
            'license_number': 'MP 22187',
            'languages': ['Español', 'Portugués'],
            'city': 'Córdoba',
            'is_accepting_patients': True,
        },
    },
    {
        'username': 'lucas_fernandez',
        'first_name': 'Lucas',
        'last_name': 'Fernández',
        'email': 'lucas@self-app.com',
        'bio': 'Especializado en infancia y adolescencia. Trabajo con niños desde los 4 años y sus familias. Enfoque integrativo con juego terapéutico.',
        'profile': {
            'specialties': ['Infancia', 'Gestalt', 'Familia'],
            'modality': 'presential',
            'session_price': 6500,
            'years_experience': 4,
            'license_number': 'MN 51034',
            'languages': ['Español'],
            'city': 'Rosario',
            'is_accepting_patients': True,
        },
    },
    {
        'username': 'camila_torres',
        'first_name': 'Camila',
        'last_name': 'Torres',
        'email': 'camila@self-app.com',
        'bio': 'Psicóloga ACT y mindfulness. Me especializo en bienestar psicológico, estrés laboral y burnout. Sesiones online con flexibilidad de horarios.',
        'profile': {
            'specialties': ['ACT', 'Ansiedad', 'Depresión'],
            'modality': 'online',
            'session_price': 9000,
            'years_experience': 6,
            'license_number': 'MN 48762',
            'languages': ['Español', 'Inglés'],
            'city': 'Mendoza',
            'is_accepting_patients': True,
        },
    },
    {
        'username': 'nicolas_gimenez',
        'first_name': 'Nicolás',
        'last_name': 'Giménez',
        'email': 'nicolas@self-app.com',
        'bio': 'Psicoanalista lacaniano. Trabajo con adultos en procesos de análisis, síntomas, fobias y neurosis. Consulta en CABA.',
        'profile': {
            'specialties': ['Psicoanálisis', 'Ansiedad', 'Pareja'],
            'modality': 'both',
            'session_price': 11000,
            'years_experience': 15,
            'license_number': 'MN 29403',
            'languages': ['Español', 'Francés'],
            'city': 'Buenos Aires',
            'is_accepting_patients': False,
        },
    },
    {
        'username': 'ana_benitez',
        'first_name': 'Ana',
        'last_name': 'Benítez',
        'email': 'ana@self-app.com',
        'bio': 'Gestalt y humanista. Acompaño procesos de crecimiento personal, duelos y crisis vitales. Creo en el potencial de cada persona para sanar.',
        'profile': {
            'specialties': ['Gestalt', 'Duelo', 'Trauma'],
            'modality': 'both',
            'session_price': 7000,
            'years_experience': 9,
            'license_number': 'MP 31580',
            'languages': ['Español'],
            'city': 'La Plata',
            'is_accepting_patients': True,
        },
    },
    {
        'username': 'diego_morales',
        'first_name': 'Diego',
        'last_name': 'Morales',
        'email': 'diego@self-app.com',
        'bio': 'Especialista en terapia de pareja y sexología. Trabajo con parejas en crisis, dificultades de comunicación y sexualidad. Online para toda Latinoamérica.',
        'profile': {
            'specialties': ['Pareja', 'TCC', 'Ansiedad'],
            'modality': 'online',
            'session_price': 12000,
            'years_experience': 11,
            'license_number': 'MN 40125',
            'languages': ['Español', 'Inglés'],
            'city': 'Buenos Aires',
            'is_accepting_patients': True,
        },
    },
]

PATIENTS = [
    {'username': 'paciente_demo', 'first_name': 'Demo', 'last_name': 'Paciente', 'email': 'paciente@self-app.com'},
]


class Command(BaseCommand):
    help = 'Seed database with sample psychologists and a demo patient'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Delete existing seed users first')

    def handle(self, *args, **options):
        if options['clear']:
            emails = [p['email'] for p in PSYCHOLOGISTS] + [p['email'] for p in PATIENTS]
            deleted, _ = User.objects.filter(email__in=emails).delete()
            self.stdout.write(f'Deleted {deleted} existing seed users.')

        created_psychs = 0
        for data in PSYCHOLOGISTS:
            profile_data = data.pop('profile')
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={**data, 'role': User.ROLE_PSYCHOLOGIST},
            )
            if created:
                user.set_password('self1234')
                user.save()
                PsychologistProfile.objects.create(user=user, **profile_data)
                created_psychs += 1
                self.stdout.write(f'  ✓ {user.get_full_name()}')
            else:
                self.stdout.write(f'  – {user.get_full_name()} (ya existe)')

        created_patients = 0
        for data in PATIENTS:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={**data, 'role': User.ROLE_PATIENT},
            )
            if created:
                user.set_password('self1234')
                user.save()
                created_patients += 1
                self.stdout.write(f'  ✓ paciente: {user.username}')

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed completo: {created_psychs} psicólogos, {created_patients} pacientes creados.'
        ))
        self.stdout.write('Contraseña de todos: self1234')
