# Generated migration to rename Match model to Favorite

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Match',
            new_name='Favorite',
        ),
    ]
