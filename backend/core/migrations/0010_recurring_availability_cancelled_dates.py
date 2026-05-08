from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_calendar_v2'),
    ]

    operations = [
        migrations.AddField(
            model_name='recurringavailability',
            name='cancelled_dates',
            field=models.JSONField(default=list),
        ),
    ]
