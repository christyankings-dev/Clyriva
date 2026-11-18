from pathlib import Path
p=Path('/app/servidor.py')
s=p.read_text(encoding='utf-8')
old="'index.html': 'text/html', 'admin.html': 'text/html',"
assert s.count(old)==1, 'Não foi possível encontrar o cadastro de páginas públicas'
s=s.replace(old,"'index.html': 'text/html', 'admin.html': 'text/html', 'admin-setup.html': 'text/html',")
p.write_text(s,encoding='utf-8')
