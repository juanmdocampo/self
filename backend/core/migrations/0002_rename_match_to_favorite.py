# Generated migration to rename Match model to Favorite

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Match',
            new_name='Favorite',
        ),
        migrations.AlterField(
            model_name='user',
            name='favorites_as_patient',
            field=models.ManyToOneRel(auto_created=True, field_name='patient', limit_choices_to=None, on_delete=django.db.models.deletion.CASCADE, related_name='favorites_as_patient', to='core.favorite'),
        ),
        migrations.AlterField(
            model_name='user',
            name='favorites_as_psychologist',
            field=models.ManyToOneRel(auto_created=True, field_name='psychologist', limit_choices_to=None, on_delete=django.db.models.deletion.CASCADE, related_name='favorites_as_psychologist', to='core.favorite'),
        ),
    ]
