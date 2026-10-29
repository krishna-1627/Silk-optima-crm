from app.database.session import init_db
try:
    init_db()
    print('init_db ok')
except Exception as exc:
    import traceback
    traceback.print_exc()
