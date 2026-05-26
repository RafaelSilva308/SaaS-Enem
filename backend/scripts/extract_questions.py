"""
Extrai questões das provas do ENEM em PDF e gera questions.json.

Uso:
    cd SaaS_Enem                        (raiz do projeto)
    pip install pdfplumber
    python backend/scripts/extract_questions.py

Entrada: Provas_2009-2025/  (pasta na raiz do projeto)
Saída:   backend/scripts/questions.json
"""

import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("ERRO: pdfplumber não instalado.")
    print("Rode: pip install pdfplumber")
    sys.exit(1)

ROOT = Path(__file__).parent.parent.parent
PROVAS_DIR = ROOT / "Provas_2009-2025"
OUTPUT = Path(__file__).parent / "questions.json"

# Questões 1-45 → Linguagens  |  46-90 → CH      (Dia 1)
# Questões 91-135 → CN        |  136-180 → Mat    (Dia 2)
def get_subject(q_num: int, day: int) -> str:
    if day == 1:
        return "linguagens" if q_num <= 45 else "ch"
    else:
        return "cn" if q_num <= 135 else "matematica"


# ── Gabarito ──────────────────────────────────────────────────────────────────

def parse_gabarito(pdf_path: Path) -> dict[int, str]:
    """Lê PDF de gabarito e retorna {numero_questao: letra_correta}."""
    answers: dict[int, str] = {}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages)

        # Formatos comuns no INEP:
        #   "1 C", "01 C", "1. C", "1 - C", "Q1 C"
        for m in re.finditer(r'\b(\d{1,3})\s*[-–.]?\s*([A-E])\b', text):
            q_num = int(m.group(1))
            if 1 <= q_num <= 180:
                answers[q_num] = m.group(2)
    except Exception as e:
        print(f"    Aviso (gabarito): {e}")
    return answers


# ── Detecção de imagem obrigatória ────────────────────────────────────────────

# Frases que indicam que a questão só faz sentido com a imagem
_IMAGE_PHRASES = re.compile(
    r'observ[ea]\s+(a\s+)?(figura|imagem|foto|ilustra[çc][aã]o|charge|tirinha|tabela|quadro|gr[aá]fico|mapa|esquema|diagrama)'
    r'|analis[ea]\s+(a\s+)?(figura|imagem|tabela|gr[aá]fico|mapa|charge|tirinha)'
    r'|de acordo com\s+(a\s+)?(figura|imagem|gr[aá]fico|mapa|tabela|charge)'
    r'|com base n[ao]\s+(figura|imagem|gr[aá]fico|mapa|tabela|charge|texto\s+acima)'
    r'|a\s+(figura|imagem|charge|tirinha|tabela)\s+(a[bc]ima|ao\s+lado|abaixo|seguinte)\s+mostra'
    r'|leia\s+a\s+(charge|tirinha|figura)',
    re.IGNORECASE,
)

def _requires_image(statement: str, options: list[dict]) -> bool:
    """Retorna True se a questão depende de imagem para ser resolvida."""
    if len(options) < 5:
        return True
    if _IMAGE_PHRASES.search(statement):
        return True
    return False


# ── Prova ─────────────────────────────────────────────────────────────────────

# Marcador de início de questão: "QUESTÃO 01", "QUESTÃO 1" etc.
_Q_HEADER = re.compile(r'QUEST[ÃA]O\s+(\d{1,3})', re.IGNORECASE)

# Opções: linha que começa com A) B) C) D) E) — com ou sem parênteses
_OPT_START = re.compile(r'(?m)^\s*([A-E])\s*\)?\s+\S')


def _extract_options(block: str) -> tuple[str, list[dict]]:
    """
    Divide um bloco de texto de questão em (enunciado, opções).
    Retorna (statement_str, [{"letter": "A", "text": "..."}])
    """
    first = _OPT_START.search(block)
    if not first:
        return block.strip(), []

    statement = block[: first.start()].strip()

    # Captura cada opção até a próxima letra ou fim do bloco
    opt_pattern = re.compile(
        r'(?m)^\s*([A-E])\s*\)?\s+(.+?)(?=^\s*[A-E]\s*\)?\s+\S|\Z)',
        re.DOTALL,
    )
    options = []
    for m in opt_pattern.finditer(block[first.start() :]):
        text = re.sub(r'\s+', ' ', m.group(2)).strip()
        if text:
            options.append({"letter": m.group(1), "text": text})

    return statement, options


def _extract_page_text(page) -> str:
    """
    Extrai texto de uma página respeitando layout de colunas.
    PDFs antigos do ENEM têm duas questões lado a lado por página.
    Detecta se há 2 colunas e extrai cada metade separadamente.
    """
    words = page.extract_words()
    if not words:
        return ""

    mid_x = page.width / 2
    # Conta palavras claramente na coluna esquerda vs direita (com margem de 10%)
    left_count = sum(1 for w in words if float(w["x1"]) < mid_x * 0.9)
    right_count = sum(1 for w in words if float(w["x0"]) > mid_x * 1.1)

    if left_count > 5 and right_count > 5:
        # Layout de 2 colunas: extrai cada metade e concatena
        left_col = page.crop((0, 0, mid_x, page.height))
        right_col = page.crop((mid_x, 0, page.width, page.height))
        left_text = left_col.extract_text() or ""
        right_text = right_col.extract_text() or ""
        return left_text + "\n" + right_text

    return page.extract_text() or ""


def parse_prova(pdf_path: Path, day: int, year: int, gabarito: dict[int, str]) -> list[dict]:
    """Extrai todas as questões de um PDF de prova."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = "\n".join(_extract_page_text(p) for p in pdf.pages)
    except Exception as e:
        print(f"    ERRO ao ler PDF: {e}")
        return []

    matches = list(_Q_HEADER.finditer(full_text))
    if not matches:
        print(f"    Aviso: nenhuma questão detectada no PDF.")
        return []

    questions = []
    for i, m in enumerate(matches):
        q_num = int(m.group(1))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        block = full_text[start:end]

        statement, options = _extract_options(block)

        # Remove cabeçalho residual do número da questão se ficou no enunciado
        statement = re.sub(r'^\s*\d+\s*', '', statement).strip()
        statement = re.sub(r'\s+', ' ', statement).strip()

        # Filtros de qualidade mínima
        if len(statement) < 15:
            continue
        if len(options) < 2:
            continue

        # Descarta questões com letras de opção duplicadas (artefato de colunas misturadas)
        letters = [o["letter"] for o in options]
        if len(letters) != len(set(letters)):
            continue

        # Descarta questões que dependem de imagem
        if _requires_image(statement, options):
            continue

        questions.append({
            "source": f"enem_{year}",
            "subject": get_subject(q_num, day),
            "topic": None,
            "subtopic": None,
            "difficulty": "medium",
            "year": year,
            "statement": statement,
            "correct_answer": gabarito.get(q_num),
            "explanation": None,
            "image_url": None,
            "options": options[:5],
        })

    return questions


# ── Utilitários de arquivo ─────────────────────────────────────────────────────

def find_prova(pdfs: dict[str, Path], day: int) -> Path | None:
    tag = f"_d{day}_"
    for stem, path in pdfs.items():
        if tag in stem and "gabarito" not in stem:
            return path
    return None


def find_gabarito(pdfs: dict[str, Path], day: int) -> Path | None:
    tag = f"_d{day}"
    for stem, path in pdfs.items():
        if "gabarito" in stem and tag in stem:
            return path
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    if not PROVAS_DIR.exists():
        print(f"ERRO: pasta não encontrada → {PROVAS_DIR}")
        print("Certifique-se de rodar o script a partir da raiz do projeto.")
        sys.exit(1)

    year_dirs = sorted(p for p in PROVAS_DIR.iterdir() if p.is_dir() and p.name.isdigit())
    print(f"Anos encontrados: {[d.name for d in year_dirs]}\n")

    all_questions: list[dict] = []

    for year_dir in year_dirs:
        year = int(year_dir.name)
        print(f"[{year}]")

        # Index de PDFs: stem em minúsculo → Path
        pdfs = {p.stem.lower(): p for p in year_dir.glob("*.pdf")}

        for day in [1, 2]:
            prova_path = find_prova(pdfs, day)
            gab_path = find_gabarito(pdfs, day)

            if not prova_path:
                print(f"  D{day}: prova não localizada, pulando.")
                continue

            gabarito: dict[int, str] = {}
            if gab_path:
                gabarito = parse_gabarito(gab_path)
                print(f"  D{day}: gabarito com {len(gabarito)} respostas  ({gab_path.name})")
            else:
                print(f"  D{day}: gabarito não localizado — correct_answer ficará null")

            qs = parse_prova(prova_path, day, year, gabarito)
            all_questions.extend(qs)
            print(f"  D{day}: {len(qs)} questões aproveitadas  ({prova_path.name})")

        print()

    # Salva JSON
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    total = len(all_questions)
    com_gabarito = sum(1 for q in all_questions if q["correct_answer"])
    sem_gabarito = total - com_gabarito

    print("=" * 50)
    print(f"Total aproveitado:    {total}  (questões 100% texto)")
    print(f"Com resposta correta: {com_gabarito}")
    print(f"Sem resposta (null):  {sem_gabarito}  (gabarito não encontrado)")
    print(f"Descartadas:          questões com imagem obrigatória — ignoradas")
    print(f"Arquivo gerado:       {OUTPUT}")


if __name__ == "__main__":
    main()
