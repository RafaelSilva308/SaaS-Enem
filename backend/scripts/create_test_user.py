"""
Cria um usuário de teste com assinatura premium_1m ativa diretamente no banco.

Uso:
    cd backend
    python scripts/create_test_user.py
    python scripts/create_test_user.py --email meu@email.com --password minhasenha123

Requisitos: psycopg2-binary e bcrypt (já estão no requirements.txt).
"""

import argparse
import os
import sys
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

# ── Carrega .env do backend ────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env"
env_vars: dict[str, str] = {}
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

# Variável de ambiente tem prioridade sobre .env local
DATABASE_URL_SYNC = (
    os.environ.get("DATABASE_URL_SYNC")
    or env_vars.get("DATABASE_URL_SYNC", "")
)
if not DATABASE_URL_SYNC:
    async_url = os.environ.get("DATABASE_URL") or env_vars.get("DATABASE_URL", "")
    DATABASE_URL_SYNC = async_url.replace("postgresql+asyncpg://", "postgresql://")

if not DATABASE_URL_SYNC:
    print("ERRO: DATABASE_URL ou DATABASE_URL_SYNC não encontrada no .env")
    sys.exit(1)

IS_SQLITE = DATABASE_URL_SYNC.startswith("sqlite")
IS_POSTGRES = "postgresql" in DATABASE_URL_SYNC or "postgres" in DATABASE_URL_SYNC

# ── Dependências ───────────────────────────────────────────────────
try:
    import bcrypt
except ImportError as e:
    print(f"ERRO: dependência não encontrada — {e}")
    print("Rode: pip install bcrypt")
    sys.exit(1)

if IS_POSTGRES:
    try:
        import psycopg2
    except ImportError:
        print("ERRO: psycopg2 não encontrado. Rode: pip install psycopg2-binary")
        sys.exit(1)
elif IS_SQLITE:
    import sqlite3
    # Resolve caminho do arquivo sqlite
    sqlite_path = DATABASE_URL_SYNC.replace("sqlite:///", "")
    if not Path(sqlite_path).is_absolute():
        sqlite_path = str(Path(__file__).parent.parent / sqlite_path)
else:
    print(f"ERRO: tipo de banco não suportado: {DATABASE_URL_SYNC}")
    sys.exit(1)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def utcnow() -> datetime:
    return datetime.utcnow()


def _connect():
    if IS_POSTGRES:
        dsn = DATABASE_URL_SYNC.replace("postgresql+psycopg2://", "postgresql://")
        return psycopg2.connect(dsn)
    else:
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn


def _placeholder(is_pg: bool) -> str:
    return "%s" if is_pg else "?"


def create_test_user(email: str, password: str, name: str) -> None:
    conn = _connect()
    ph = _placeholder(IS_POSTGRES)
    cur = conn.cursor()

    try:
        # Verifica se já existe
        cur.execute(f"SELECT id FROM users WHERE email = {ph}", (email,))
        existing = cur.fetchone()
        if existing:
            user_id = existing[0]
            print(f"Usuário já existe: {email} (id={user_id})")
        else:
            user_id = uuid.uuid4()
            now = utcnow()
            email_verified = True if IS_POSTGRES else 1
            cur.execute(
                f"""
                INSERT INTO users
                    (id, name, email, password_hash, date_of_birth,
                     email_verified, account_status, role,
                     created_at, updated_at)
                VALUES
                    ({ph}, {ph}, {ph}, {ph}, {ph},
                     {ph}, 'active', 'student',
                     {ph}, {ph})
                """,
                (str(user_id), name, email, hash_password(password),
                 str(date(2000, 1, 1)), email_verified, str(now), str(now)),
            )
            print(f"Usuário criado: {email} (id={user_id})")

        # Verifica assinatura ativa existente
        cur.execute(
            f"SELECT id, plan_type FROM subscriptions WHERE user_id = {ph} AND status = 'active'",
            (str(user_id),),
        )
        active_sub = cur.fetchone()
        if active_sub:
            print(f"Assinatura ativa já existe: {active_sub[1]}")
        else:
            sub_id = uuid.uuid4()
            now = utcnow()
            end_date = now + timedelta(days=30)
            cur.execute(
                f"""
                INSERT INTO subscriptions
                    (id, user_id, plan_type, status,
                     start_date, end_date,
                     payment_method, amount_paid, auto_renewal,
                     created_at, updated_at)
                VALUES
                    ({ph}, {ph}, 'premium_1m', 'active',
                     {ph}, {ph},
                     'credit_card', 59.90, {ph},
                     {ph}, {ph})
                """,
                (str(sub_id), str(user_id), str(now), str(end_date), True if IS_POSTGRES else 1, str(now), str(now)),
            )
            print(f"Assinatura premium_1m criada: válida até {end_date.strftime('%d/%m/%Y')}")

        conn.commit()

        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        print("\n== Credenciais para login ==")
        print(f"  Email:  {email}")
        print(f"  Senha:  {password}")
        print(f"  Plano:  premium_1m (active, 30 dias)")
        print("=" * 30)

    except Exception as exc:
        conn.rollback()
        print(f"ERRO: {exc}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cria usuário de teste com assinatura premium")
    parser.add_argument("--email", default="teste@saas-enem.com", help="Email do usuário")
    parser.add_argument("--password", default="Teste@123456", help="Senha do usuário")
    parser.add_argument("--name", default="Usuário de Teste", help="Nome do usuário")
    args = parser.parse_args()

    create_test_user(args.email, args.password, args.name)
