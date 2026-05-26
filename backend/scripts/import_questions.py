"""
Importa questões do questions.json para o banco de dados (PostgreSQL ou SQLite).

Uso:
    cd backend
    python scripts/import_questions.py                  # produção (usa .env)
    python scripts/import_questions.py --dry-run        # simula sem inserir
    python scripts/import_questions.py --arquivo scripts/questions.json

Para importar em produção, defina DATABASE_URL no ambiente ou use .env.production:
    set DATABASE_URL=postgresql://...
    python scripts/import_questions.py
"""

import argparse
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

# ── Carrega .env ───────────────────────────────────────────────────────────────

def _load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

BACKEND_DIR = Path(__file__).parent.parent
env_vars = _load_env(BACKEND_DIR / ".env")

DATABASE_URL = (
    os.environ.get("DATABASE_URL_SYNC")
    or env_vars.get("DATABASE_URL_SYNC")
    or os.environ.get("DATABASE_URL")
    or env_vars.get("DATABASE_URL", "")
).replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg2://", "postgresql://")

IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_POSTGRES = "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL

if not DATABASE_URL:
    print("ERRO: DATABASE_URL não encontrada.")
    print("Defina no .env ou como variável de ambiente.")
    sys.exit(1)

# ── Importa driver de banco ────────────────────────────────────────────────────

if IS_POSTGRES:
    try:
        import psycopg2
    except ImportError:
        print("ERRO: psycopg2 não instalado. Rode: pip install psycopg2-binary")
        sys.exit(1)
elif IS_SQLITE:
    import sqlite3
    _sqlite_path = DATABASE_URL.replace("sqlite:///", "")
    if not Path(_sqlite_path).is_absolute():
        _sqlite_path = str(BACKEND_DIR / _sqlite_path)
else:
    print(f"ERRO: banco não suportado: {DATABASE_URL[:40]}")
    sys.exit(1)


def _connect():
    if IS_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    conn = sqlite3.connect(_sqlite_path)
    conn.row_factory = sqlite3.Row
    return conn


def _ph() -> str:
    return "%s" if IS_POSTGRES else "?"


# ── Importação ─────────────────────────────────────────────────────────────────

VALID_SUBJECTS = {"linguagens", "matematica", "cn", "ch"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def import_questions(arquivo: Path, dry_run: bool) -> None:
    with open(arquivo, encoding="utf-8") as f:
        questions: list[dict] = json.load(f)

    print(f"Questões no arquivo: {len(questions)}")
    print(f"Banco: {'SQLite (local)' if IS_SQLITE else 'PostgreSQL (produção)'}")
    print(f"Modo:  {'DRY RUN — nada será inserido' if dry_run else 'INSERÇÃO REAL'}")
    print()

    conn = _connect()
    ph = _ph()
    cur = conn.cursor()
    inserted = skipped = errors = 0

    try:
        for idx, q in enumerate(questions, 1):
            # Validações mínimas
            if not q.get("statement") or len(q["statement"]) < 15:
                skipped += 1
                continue
            if not q.get("correct_answer"):
                skipped += 1
                continue
            opts = q.get("options", [])
            if len(opts) < 2:
                skipped += 1
                continue
            if q.get("subject") not in VALID_SUBJECTS:
                skipped += 1
                continue

            difficulty = q.get("difficulty", "medium")
            if difficulty not in VALID_DIFFICULTIES:
                difficulty = "medium"

            if not dry_run:
                try:
                    q_id = str(uuid.uuid4())
                    now = str(datetime.utcnow())

                    cur.execute(
                        f"""
                        INSERT INTO questions
                            (id, source, subject, topic, subtopic, difficulty, year,
                             statement, correct_answer, explanation, image_url,
                             time_estimate_seconds, tri_weight,
                             total_attempts, correct_percentage, times_answered_correctly,
                             created_at, updated_at)
                        VALUES
                            ({ph},{ph},{ph},{ph},{ph},{ph},{ph},
                             {ph},{ph},{ph},{ph},
                             180, 1.0,
                             0, 0, 0,
                             {ph},{ph})
                        """,
                        (
                            q_id,
                            q.get("source", f"enem_{q.get('year')}"),
                            q["subject"],
                            q.get("topic"),
                            q.get("subtopic"),
                            difficulty,
                            q.get("year"),
                            q["statement"],
                            q["correct_answer"],
                            q.get("explanation"),
                            q.get("image_url"),
                            now, now,
                        ),
                    )

                    for pos, opt in enumerate(opts[:5], 1):
                        cur.execute(
                            f"""
                            INSERT INTO question_options
                                (id, question_id, letter, text, position, created_at)
                            VALUES ({ph},{ph},{ph},{ph},{ph},{ph})
                            """,
                            (str(uuid.uuid4()), q_id, opt["letter"], opt["text"], pos, now),
                        )

                    conn.commit()
                    inserted += 1
                    if inserted % 200 == 0:
                        print(f"  {inserted} questões inseridas...")

                except Exception as e:
                    conn.rollback()
                    errors += 1
                    if errors <= 5:
                        print(f"  ERRO (questão #{idx}): {e}")
            else:
                inserted += 1

        if not dry_run:
            conn.commit()

    finally:
        cur.close()
        conn.close()

    print()
    print("=" * 50)
    if dry_run:
        print("DRY RUN concluído — nenhuma alteração no banco.")
    print(f"Inseridas: {inserted}")
    print(f"Puladas:   {skipped}  (sem gabarito, enunciado curto ou subject inválido)")
    print(f"Erros:     {errors}")


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Importa questões do ENEM para o banco")
    parser.add_argument(
        "--arquivo",
        default="scripts/questions.json",
        help="Caminho para o questions.json (padrão: scripts/questions.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula a importação sem inserir no banco",
    )
    args = parser.parse_args()

    arquivo = Path(args.arquivo)
    if not arquivo.is_absolute():
        arquivo = BACKEND_DIR / arquivo

    if not arquivo.exists():
        print(f"ERRO: arquivo não encontrado → {arquivo}")
        sys.exit(1)

    import_questions(arquivo, dry_run=args.dry_run)
