from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_verification_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='city',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='sought_specialties',
            field=models.JSONField(default=list),
        ),
    ]
