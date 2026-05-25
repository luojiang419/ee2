import zipfile

z = zipfile.ZipFile('Empire Earth II/zips_ee2x/EE2X_db.zip', 'r')
csv = z.read('EE2X_db/TechTree/upgrade_unittypes.csv').decode('utf-8')
lines = csv.splitlines()
header = lines[0].split(',')
for i, col in enumerate(header):
    print(f'  [{i}] {col}')

# Find PC3
print('\n--- PC3 rows ---')
for line in lines:
    if 'PC3Upgrade' in line:
        parts = line.split(',')
        print(f'Name: {parts[0]}')
        for i in range(min(len(parts), 25)):
            print(f'  [{i}] {parts[i]}')

z.close()
