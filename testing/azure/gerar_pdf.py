"""Gera o PDF de entrega de Testing a partir de conteudo.py e dos prints em testing/evidencias/.

Uso: python testing/azure/gerar_pdf.py [--video URL]
Saída: testing/Sonora-Testing-RM556931.pdf
"""
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from conteudo import FEATURES  # noqa: E402

AZURE = "https://dev.azure.com/sonona-gs/Sonora"
REPO = "https://github.com/peguidotte/sonora"
OUT = HERE.parent / "Sonora-Testing-RM556931.pdf"
PRINTS = HERE.parent / "evidencias"
EQUIPE = [("Leonardo Correa de Mello", "555573"), ("Felipe Soares Xavier", "556931"),
          ("Pedro Visconti Guidotte", "556630"), ("Herbert de Sousa Vilela", "555701"),
          ("Gabriel Figueira Flora", "556476")]
LEGENDAS = {
    "01": "Lista das Features no Azure Boards",
    **{f"{i + 2:02d}": f"Detalhe da Feature F0{i + 1}: descrição e critérios de aceite" for i in range(8)},
    "10": "Lista dos Test Cases no Azure Boards",
    "11": "Definição de Test Case positivo (objetivo, preparação, entradas, saída e passos)",
    "12": "Definição de Test Case negativo (objetivo, preparação, entradas, saída e passos)",
    "13": "Professor adicionado como administrador do projeto",
}

ss = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=ss["Heading1"], fontSize=16, spaceAfter=8, textColor=colors.HexColor("#1f3a5f"))
H2 = ParagraphStyle("h2", parent=ss["Heading2"], fontSize=12.5, spaceBefore=10, spaceAfter=4,
                    textColor=colors.HexColor("#1f3a5f"))
P = ParagraphStyle("p", parent=ss["BodyText"], fontSize=9.5, leading=13)
SMALL = ParagraphStyle("s", parent=P, fontSize=8.5, leading=11)
CAP = ParagraphStyle("cap", parent=P, fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor("#444444"))
TITLE = ParagraphStyle("t", parent=H1, fontSize=24, alignment=TA_CENTER, spaceAfter=6)
SUB = ParagraphStyle("sub", parent=P, fontSize=12, alignment=TA_CENTER, leading=16)


def link(url, text=None):
    return f'<link href="{url}" color="blue"><u>{text or url}</u></link>'


def table(rows, widths, header=True):
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#b0b7c3")),
             ("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a5f")),
                  ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    t.setStyle(TableStyle(style))
    return t


def cell(text, style=SMALL):
    return Paragraph(text, style)


def capa(video):
    s = [Spacer(1, 3 * cm), Paragraph("Sonora", TITLE),
         Paragraph("Contexto acústico para decisões imobiliárias", SUB), Spacer(1, 0.6 * cm),
         Paragraph("<b>Testing, Compliance &amp; Quality Assurance</b><br/>FIAP · Global Solution 2026.2 · CitizenTech", SUB),
         Spacer(1, 1.5 * cm)]
    rows = [[cell("<b>Integrante</b>", P), cell("<b>RM</b>", P)]] + [[cell(n, P), cell(r, P)] for n, r in EQUIPE]
    s.append(table(rows, [9 * cm, 3 * cm]))
    s += [Spacer(1, 1.2 * cm),
          Paragraph(f"<b>Azure DevOps (Boards):</b> {link(AZURE)}", P),
          Paragraph(f"<b>VIDEO PITCH GS (YouTube):</b> {link(video) if video else 'informado na descrição da entrega no Teams'}", P),
          Paragraph(f"<b>Repositório:</b> {link(REPO)}", P),
          Paragraph("<b>Responsável pela matéria:</b> Felipe Soares Xavier (RM556931)", P),
          PageBreak()]
    return s


def visao_geral():
    total = sum(len(f["casos"]) for f in FEATURES)
    pos = sum(c["tipo"] == "Positivo" for f in FEATURES for c in f["casos"])
    s = [Paragraph("1. Visão geral", H1),
         Paragraph(f"O backlog de qualidade do Sonora está no Azure Boards (processo Agile): <b>{len(FEATURES)} Features</b> "
                   f"com descrição em formato de história de usuário, regras de negócio e critérios de aceite "
                   f"(Dado / Quando / Então), e <b>{total} Test Cases funcionais de caixa-preta</b> "
                   f"({pos} positivos e {total - pos} negativos). Cada Test Case registra objetivo, preparação "
                   "(pré-condições), entradas, saída esperada e passos com o resultado esperado de cada passo, e está "
                   "vinculado à sua Feature pelo link <i>Tested By</i>.", P),
         Spacer(1, 6)]
    rows = [[cell("<b>Feature</b>", P), cell("<b>Positivos</b>", P), cell("<b>Negativos</b>", P), cell("<b>Total</b>", P)]]
    for f in FEATURES:
        p = sum(c["tipo"] == "Positivo" for c in f["casos"])
        rows.append([cell(f"{f['codigo']} - {f['titulo']}"), cell(str(p)), cell(str(len(f['casos']) - p)),
                     cell(str(len(f["casos"])))])
    rows.append([cell("<b>Total</b>"), cell(f"<b>{pos}</b>"), cell(f"<b>{total - pos}</b>"), cell(f"<b>{total}</b>")])
    s += [table(rows, [10.5 * cm, 2 * cm, 2 * cm, 2 * cm]), Spacer(1, 8),
          Paragraph("Convenção de títulos no Azure: Features <b>F0X - título</b>; Test Cases <b>F0X-CTnn [Positivo|Negativo] "
                    "título</b>. Tags: <i>Sonora GS</i>, código da Feature, tipo, <i>Caixa-preta</i> e canal (API, Mobile, IoT).", P),
          PageBreak()]
    return s


def features():
    s = [Paragraph("2. Features e critérios de aceite", H1)]
    for f in FEATURES:
        bloco = [Paragraph(f"{f['codigo']} - {f['titulo']}", H2), Paragraph(f["historia"], P),
                 Paragraph("<b>Regras de negócio</b>", P)]
        bloco += [Paragraph(f"• {r}", SMALL) for r in f["regras"]]
        bloco.append(Paragraph("<b>Critérios de aceite</b>", P))
        bloco += [Paragraph(f"{i}. <b>Dado</b> {d}, <b>quando</b> {q}, <b>então</b> {e}.", SMALL)
                  for i, (d, q, e) in enumerate(f["criterios"], 1)]
        s.append(KeepTogether(bloco))
    s.append(PageBreak())
    return s


def casos():
    s = [Paragraph("3. Test Cases (resumo)", H1),
         Paragraph("A definição completa de cada caso (preparação, entradas e passos) está no Azure Boards; "
                   "exemplos aparecem nos prints da seção 4.", P), Spacer(1, 6)]
    rows = [[cell("<b>Caso</b>", P), cell("<b>Tipo</b>", P), cell("<b>Objetivo</b>", P)]]
    for f in FEATURES:
        for n, c in enumerate(f["casos"], 1):
            rows.append([cell(f"{f['codigo']}-CT{n:02d} {c['titulo']}"), cell(c["tipo"]), cell(c["objetivo"])])
    s += [table(rows, [6.3 * cm, 1.8 * cm, 8.4 * cm]), PageBreak()]
    return s


def prints():
    s = [Paragraph("4. Evidências do Azure DevOps", H1)]
    files = sorted(p for p in PRINTS.glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg")) if PRINTS.exists() else []
    if not files:
        s.append(Paragraph("<font color=red>[prints pendentes: salvar em testing/evidencias/]</font>", P))
    max_w, max_h = 17 * cm, 21 * cm
    for p in files:
        w, h = ImageReader(str(p)).getSize()
        k = min(max_w / w, max_h / h)
        legenda = LEGENDAS.get(p.name[:2], p.stem)
        s.append(KeepTogether([Image(str(p), w * k, h * k), Spacer(1, 3), Paragraph(f"Figura: {legenda}", CAP),
                               Spacer(1, 12)]))
    return s


def rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(2 * cm, 1.2 * cm, "Sonora · Testing, Compliance & QA · GS 2026.2")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Página {doc.page}")
    canvas.restoreState()


def main():
    video = sys.argv[sys.argv.index("--video") + 1] if "--video" in sys.argv else None
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm,
                            bottomMargin=2 * cm, title="Sonora - Testing, Compliance & QA",
                            author="Felipe Soares Xavier (RM556931)")
    doc.build(capa(video) + visao_geral() + features() + casos() + prints(), onFirstPage=rodape, onLaterPages=rodape)
    print(f"PDF gerado: {OUT}")


if __name__ == "__main__":
    main()
