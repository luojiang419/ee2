import zipfile

z = zipfile.ZipFile('Empire Earth II/zips_ee2x/EE2X_db.zip', 'r')
csv = z.read('EE2X_db/TechTree/upgrade_unittypes.csv').decode('utf-8')
# Check PC3 E11 and E13 rows
for line in csv.splitlines():
    if 'PC3' in line and 'Upgrade' in line and ('Epoch11' in line or 'Epoch13' in line):
        parts = line.split(',')
        hp = parts[6] if len(parts) > 6 else '?'
        damage = parts[15] if len(parts) > 15 else '?'
        print(f'{parts[0]}: HP={hp} DAMAGE={damage}')

# Check a frigate
for line in csv.splitlines():
    if 'Ch054AUpgradeEpoch14' in line:
        parts = line.split(',')
        hp = parts[6] if len(parts) > 6 else '?'
        print(f'{parts[0]}: HP={hp}')

z.close()
print('Verification done')
