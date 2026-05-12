from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_recurring_availability_cancelled_dates'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='avatar',
            field=models.CharField(blank=True, default='', max_length=500, null=True),
        ),
        migrations.AlterField(
            model_name='psychologistprofile',
            name='document_upload',
            field=models.CharField(blank=True, default='', max_length=500, null=True),
        ),
    ]
