import psycopg
from app.core.config import get_settings

settings = get_settings()
url = settings.DATABASE_URL
print('raw DATABASE_URL=', url)
if url.startswith('postgresql+psycopg://'):
    url = 'postgresql://' + url.split('://', 1)[1]
print('psycopg URL=', url)
with psycopg.connect(url) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;")
        for row in cur.fetchall():
            print(row)
