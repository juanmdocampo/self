from django.db import migrations, models


def migrate_verification_status(apps, schema_editor):
    PsychologistProfile = apps.get_model('core', 'PsychologistProfile')
    PsychologistProfile.objects.filter(is_verified=True).update(verification_status='approved')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_alter_favorite_patient_alter_favorite_psychologist'),
    ]

    operations = [
        # New verification fields
        migrations.AddField(
            model_name='psychologistprofile',
            name='verification_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pendiente de revisión'),
                    ('approved', 'Aprobado'),
                    ('rejected', 'Rechazado'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='psychologistprofile',
            name='rejection_reason',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='psychologistprofile',
            name='document_upload',
            field=models.FileField(blank=True, null=True, upload_to='documents/'),
        ),
        # Migrate existing is_verified=True → approved
        migrations.RunPython(migrate_verification_status, migrations.RunPython.noop),
        # Remove old boolean field
        migrations.RemoveField(
            model_name='psychologistprofile',
            name='is_verified',
        ),
        # Add admin role option to User
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('patient', 'Paciente'),
                    ('psychologist', 'Psicólogo/a'),
                    ('admin', 'Administrador'),
                ],
                default='patient',
                max_length=20,
            ),
        ),
    ]
