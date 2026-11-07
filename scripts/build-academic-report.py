"""Create the single academic hand-in from computed TypeScript data and real build captures."""

import json
import math
import subprocess
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts/qa-final"
OUTPUT = ROOT / "output/pdf/T4F-Performance-Projeto-Integrador-V-Entrega.pdf"
SITE = "https://thiago-code-lab.github.io/Dashboards-Tour4Friends/"
REPO = "https://github.com/Thiago-code-lab/Dashboards-Tour4Friends"
BRANCH = "feature/final-quality-and-delivery-v1"
MEMBERS = [
    "Daniel Fernando dos Santos",
    "Lucas Antonio Evangelista dos Santos",
    "Pablo Roberto da Silva Costa",
    "Thiago Cardoso Davi",
    "William Nunes Vilany",
]
INK = colors.HexColor("#23374c")
MUTED = colors.HexColor("#52677f")
BLUE = colors.HexColor("#8FA6DE")
SAGE = colors.HexColor("#7F9A80")
GREY = colors.HexColor("#4A4A4A")
LIGHT = colors.HexColor("#f1f4f9")
WIDTH, HEIGHT = A4
LEFT = 43
RIGHT = WIDTH - LEFT
BODY = RIGHT - LEFT


def fonts() -> None:
    options = [
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ),
        (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/segoeuib.ttf")),
    ]
    for normal, bold in options:
        if normal.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("Body", str(normal)))
            pdfmetrics.registerFont(TTFont("Strong", str(bold)))
            pdfmetrics.registerFontFamily(
                "Body", normal="Body", bold="Strong", italic="Body", boldItalic="Strong"
            )
            return
    raise RuntimeError(
        "Instale DejaVu Sans ou disponibilize Segoe UI para gerar o documento."
    )


def number(value: float | None, decimals: int = 1) -> str:
    if value is None:
        return "—"
    return (
        f"{value:,.{decimals}f}".replace(",", "_").replace(".", ",").replace("_", ".")
    )


def paragraph(
    c: canvas.Canvas,
    text: str,
    y: float,
    size: float = 10.4,
    width: float = BODY,
    x: float = LEFT,
    bold: bool = False,
) -> float:
    style = ParagraphStyle(
        "body",
        fontName="Strong" if bold else "Body",
        fontSize=size,
        leading=size * 1.5,
        textColor=INK,
        spaceAfter=0,
    )
    block = Paragraph(text, style)
    _, height = block.wrap(width, HEIGHT)
    if y - height < 45:
        raise ValueError(f"Conteúdo excedeu a página: {text[:65]}")
    block.drawOn(c, x, y - height)
    return y - height - 12


def link(
    c: canvas.Canvas, text: str, url: str, x: float, y: float, size: float = 8.2
) -> None:
    c.setFont("Body", size)
    c.setFillColor(MUTED)
    c.drawString(x, y, text)
    c.linkURL(
        url,
        (
            x,
            y - 2,
            min(RIGHT, x + pdfmetrics.stringWidth(text, "Body", size)),
            y + size + 3,
        ),
        relative=0,
        thickness=0,
    )


def header(
    c: canvas.Canvas, page: int, title: str, subtitle: str, revision: str
) -> float:
    c.setFillColor(BLUE)
    c.rect(LEFT, HEIGHT - 43, 32, 3, fill=1, stroke=0)
    c.setFont("Body", 8)
    c.setFillColor(MUTED)
    c.drawString(LEFT + 43, HEIGHT - 43, "T4F PERFORMANCE · PROJETO INTEGRADOR V")
    c.setFont("Strong", 22)
    c.setFillColor(INK)
    c.drawString(LEFT, HEIGHT - 82, title)
    y = paragraph(c, subtitle, HEIGHT - 97, 9.2)
    c.setStrokeColor(colors.HexColor("#dce3ed"))
    c.line(LEFT, 38, RIGHT, 38)
    c.setFont("Body", 7)
    c.setFillColor(MUTED)
    c.drawString(LEFT, 24, f"Versão candidata · dados sintéticos · revisão {revision}")
    c.drawRightString(RIGHT, 24, f"{page} / 8")
    return y - 5


def table(
    c: canvas.Canvas, rows: list[list[str]], widths: list[float], y: float
) -> float:
    style = ParagraphStyle(
        "cell", fontName="Body", fontSize=8.8, leading=12, textColor=INK
    )
    content = [[Paragraph(str(value), style) for value in row] for row in rows]
    widget = Table(content, colWidths=widths)
    widget.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#e1e7ef")),
            ]
        )
    )
    _, height = widget.wrap(BODY, HEIGHT)
    if y - height < 48:
        raise ValueError("Tabela ultrapassou a margem inferior.")
    widget.drawOn(c, LEFT, y - height)
    return y - height - 18


def image(c: canvas.Canvas, path: Path, y: float, max_height: float) -> float:
    asset = ImageReader(str(path))
    width, height = asset.getSize()
    ratio = min(BODY / width, max_height / height)
    rendered_width, rendered_height = width * ratio, height * ratio
    c.drawImage(
        asset,
        LEFT + (BODY - rendered_width) / 2,
        y - rendered_height,
        rendered_width,
        rendered_height,
        mask="auto",
    )
    return y - rendered_height - 10


def forecast_chart(c: canvas.Canvas, forecast: dict, y: float) -> float:
    history = forecast["history"][-18:]
    future = forecast["predictions"]
    points = [row["travelers"] for row in history] + [
        row["predicted"] for row in future
    ]
    maximum = max(
        4,
        math.ceil(
            max(*points, *[row.get("upper", row["predicted"]) for row in future]) / 4
        )
        * 4,
    )
    top, bottom = y, y - 170
    x = lambda i: LEFT + 24 + i * (BODY - 36) / max(1, len(points) - 1)
    value_y = lambda value: bottom + 20 + value / maximum * 135
    c.setFont("Body", 7.5)
    for index in range(5):
        value = maximum * index / 4
        c.setStrokeColor(colors.HexColor("#e5eaf1"))
        c.line(LEFT + 24, value_y(value), RIGHT, value_y(value))
        c.setFillColor(MUTED)
        c.drawRightString(LEFT + 18, value_y(value) - 2, number(value, 0))
    ranged = [
        (len(history) + i, row)
        for i, row in enumerate(future)
        if row.get("lower") is not None
    ]
    if ranged:
        path = c.beginPath()
        path.moveTo(x(ranged[0][0]), value_y(ranged[0][1]["upper"]))
        for index, row in ranged[1:]:
            path.lineTo(x(index), value_y(row["upper"]))
        for index, row in reversed(ranged):
            path.lineTo(x(index), value_y(row["lower"]))
        path.close()
        c.setFillColor(colors.HexColor("#e4e4e4"))
        c.drawPath(path, fill=1, stroke=0)
    for values, offset, color, dashed in [
        ([row["travelers"] for row in history], 0, BLUE, False),
        (
            [history[-1]["travelers"]] + [row["predicted"] for row in future],
            len(history) - 1,
            GREY,
            True,
        ),
    ]:
        c.setStrokeColor(color)
        c.setLineWidth(1.7)
        c.setDash(4, 3) if dashed else c.setDash()
        for index in range(len(values) - 1):
            c.line(
                x(offset + index),
                value_y(values[index]),
                x(offset + index + 1),
                value_y(values[index + 1]),
            )
    c.setDash()
    c.setStrokeColor(MUTED)
    c.setLineWidth(0.6)
    c.line(x(len(history) - 1), bottom + 20, x(len(history) - 1), top - 5)
    months = [row["month"] for row in history + future]
    c.setFont("Body", 7)
    c.setFillColor(MUTED)
    for index in sorted({*range(0, len(months), 3), len(months) - 1}):
        c.drawCentredString(
            x(index), bottom + 4, months[index][5:] + "/" + months[index][2:4]
        )
    c.drawString(
        LEFT + 25,
        top + 7,
        "Azul: observado · cinza: previsão · preenchimento: faixa exploratória",
    )
    return bottom - 14


def cover(c: canvas.Canvas, data: dict, revision: str) -> None:
    c.setFillColor(INK)
    c.rect(0, HEIGHT - 230, WIDTH, 230, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.setFont("Strong", 36)
    c.drawString(LEFT, HEIGHT - 91, "T4F PERFORMANCE")
    c.setFillColor(colors.white)
    c.setFont("Body", 14)
    c.drawString(LEFT, HEIGHT - 125, "Plataforma de Análise de Desempenho Corporativo")
    c.setFont("Body", 12)
    c.drawString(LEFT, HEIGHT - 168, "Projeto Integrador V · Big Data para Negócios")
    y = HEIGHT - 268
    y = paragraph(c, "Fatec Ipiranga “Pastor Enéas Tognini”", y, 16, bold=True)
    y = paragraph(c, "Empresa estudada: <b>Tour4Friends</b>", y, 11)
    y = paragraph(c, "Integrantes", y - 12, 11, bold=True)
    for member in MEMBERS:
        y = paragraph(c, escape(member), y, 11.3)
    y = paragraph(
        c,
        "<b>Dados demonstrativos — cenário acadêmico simulado.</b><br/>Este documento apresenta a versão candidata da Etapa 04. A aplicação pública preservada continua na Etapa 01; a candidata completa pode ser executada pela branch indicada no repositório.",
        y - 14,
        9.5,
    )
    link(c, SITE, SITE, LEFT, 125)
    link(c, REPO, REPO, LEFT, 106)
    c.setFont("Body", 8.2)
    c.setFillColor(MUTED)
    c.drawString(
        LEFT,
        80,
        f"Emitido em {datetime.now():%d/%m/%Y} · referência sintética: {datetime.fromisoformat(data['metadata']['referenceDate']):%d/%m/%Y}",
    )
    c.drawString(LEFT, 62, f"Branch: {BRANCH} · revisão {revision}")
    c.drawRightString(RIGHT, 25, "1 / 8")
    c.showPage()


def context_page(c: canvas.Canvas, data: dict, revision: str) -> None:
    y = header(
        c,
        2,
        "Do dado à decisão",
        "Contexto, problema tratado e proposta desenvolvida.",
        revision,
    )
    for title, body in [
        (
            "Empresa e contexto",
            "A Tour4Friends é a empresa estudada neste projeto de viagens e roteiros. O cenário acadêmico representa uma agência pequena: relaciona contatos comerciais, reservas com múltiplos participantes, saídas programadas, hospedagens e avaliações.",
        ),
        (
            "Problema tratado",
            "O projeto busca centralizar informações que precisam ser analisadas em conjunto. Receita, demanda, disponibilidade por etapa e satisfação têm unidades e momentos diferentes; acompanhá-las isoladamente pode dificultar o planejamento.",
        ),
        (
            "Solução proposta",
            "Dez módulos conectam indicadores comerciais, financeiros e operacionais. Filtros tornam os recortes comparáveis, enquanto previsões avaliadas temporalmente e análises estatísticas apoiam a investigação de padrões.",
        ),
        (
            "Como isso apoia o gestor",
            "O painel ajuda a comparar roteiros, observar a carteira de reservas, identificar compromissos que exigem ação e negociar capacidade com antecedência. Uma previsão orienta planejamento; não equivale a venda ou contrato confirmado.",
        ),
    ]:
        y = paragraph(c, title, y - 10, 12, bold=True)
        y = paragraph(c, body, y)
    counts = data["counts"]
    y = table(
        c,
        [
            ["Base sintética preservada", "Quantidade"],
            [
                "Clientes / reservas / leads",
                f"{counts['customers']} / {counts['bookings']} / {counts['leads']}",
            ],
            [
                "Roteiros / saídas / hospedagens",
                f"{counts['routes']} / {counts['departures']} / {counts['partners']}",
            ],
            [
                "Avaliações / meses completos",
                f"{counts['feedback']} / {data['forecast']['sample']}",
            ],
        ],
        [BODY * 0.68, BODY * 0.32],
        y - 4,
    )
    paragraph(
        c,
        "Os registros foram gerados com seed 42. Não foram importadas operações reais de clientes. As conclusões demonstram a metodologia, sem comprovar o desempenho comercial real da empresa.",
        y,
        9.5,
    )
    c.showPage()


def interface_page(c: canvas.Canvas, data: dict, revision: str) -> None:
    y = header(
        c,
        3,
        "A plataforma em funcionamento",
        "Capturas reais do build da versão candidata, sem sessão autenticada.",
        revision,
    )
    y = image(c, ART / "overview-kpis.png", y, 63)
    y = image(c, ART / "overview-panels.png", y, 220)
    y = paragraph(
        c,
        "Visão Geral: indicadores, histórico e pontos prioritários para análise.",
        y,
        9,
    )
    for route, title in [
        ("reservas", "Reservas e Comercial — carteira, conversão e oportunidades"),
        ("hospedagens", "Hospedagens — compromissos por data, etapa e categoria"),
        ("operacoes", "Operações — regras objetivas antes das próximas viagens"),
    ]:
        y = paragraph(c, title, y - 1, 9.6, bold=True)
        y = image(c, ART / f"{route}-kpis.png", y, 63)
    paragraph(
        c,
        "Os valores ampliados e suas definições aparecem na próxima página. As telas completas estão nas evidências de QA; o link do sistema permite explorar os módulos publicados.",
        y - 2,
        8.8,
    )
    c.showPage()


def kpi_page(c: canvas.Canvas, data: dict, revision: str) -> None:
    k = data["kpis"]
    y = header(
        c,
        4,
        "Indicadores de desempenho",
        f"Recorte: {datetime.fromisoformat(data['filters']['start']):%d/%m/%Y} a {datetime.fromisoformat(data['filters']['end']):%d/%m/%Y} · data da viagem, salvo coorte de leads.",
        revision,
    )
    rows = [
        ["Indicador", "Resultado", "Definição e cuidado de leitura"],
        [
            "Reservas confirmadas",
            str(k["confirmed"]),
            f"Dentro de {k['bookings']} reservas selecionadas; a base completa tem {data['counts']['bookings']}.",
        ],
        [
            "Viajantes atendidos",
            str(k["servedTravelers"]),
            "Participações em viagens concluídas; a pessoa pode viajar mais de uma vez.",
        ],
        [
            "Receita realizada gerencial",
            "R$ " + number(k["realizedRevenue"], 0),
            "Valor das reservas confirmadas em viagens concluídas.",
        ],
        [
            "Receita contratada",
            "R$ " + number(k["totalRevenue"], 0),
            "Inclui viagens futuras; não somar novamente à receita realizada.",
        ],
        [
            "Ticket por reserva",
            "R$ " + number(k["ticket"], 2),
            "Receita contratada dividida por reservas confirmadas, sem duplicar participantes.",
        ],
        [
            "Ocupação agregada",
            number(k["occupancy"]) + "%",
            "Vagas comprometidas / capacidade dos mesmos slots, em vagas-noite.",
        ],
        [
            "NPS",
            number(k["nps"]),
            f"Promotores menos detratores, em pontos percentuais; {k['responses']} respostas.",
        ],
        [
            "Cancelamento",
            number(k["cancellation"]) + "%",
            "Canceladas / todas as reservas no recorte.",
        ],
    ]
    y = table(c, rows, [BODY * 0.29, BODY * 0.22, BODY * 0.49], y)
    y = paragraph(c, "Coerência entre módulos", y, 12, bold=True)
    y = paragraph(
        c,
        f"Há {k['travelers']} participações confirmadas incluindo o futuro, frente a {k['servedTravelers']} atendidas. O financeiro distingue valores contratados, realizados e recebidos. Em Hospedagens, o filtro padrão de próximas viagens pode produzir outra ocupação: o escopo é indicado na tela.",
        y,
    )
    paragraph(
        c,
        "Custos por categoria usam participação na receita da saída. Sem receita confirmada, não existe base de rateio; o custo permanece no consolidado. Faltas de vagas em datas diferentes não se compensam. Esses indicadores são gerenciais e sintéticos, sem caráter de demonstração contábil.",
        y,
        9.5,
    )
    c.showPage()


def forecast_page(c: canvas.Canvas, data: dict, revision: str) -> None:
    f = data["forecast"]
    best_final = min(f["metrics"], key=lambda row: row["mae"])
    score = next(row for row in f["metrics"] if row["modelId"] == f["selectedId"])
    y = header(
        c,
        5,
        "Prever e verificar o erro",
        f"{f['sample']} meses completos · seleção anterior ao teste final · sem dados futuros no treino.",
        revision,
    )
    y = forecast_chart(c, f, y - 12)
    rows = [["Modelo", "MAE validação H=3", "MAE final", "RMSE final"]]
    for row in f["metrics"]:
        validation = next(
            point
            for point in f["validation"]
            if point["modelId"] == row["modelId"] and point["horizon"] == 3
        )
        rows.append(
            [
                row["model"],
                number(validation["mae"], 2),
                number(row["mae"], 2),
                number(row["rmse"], 2),
            ]
        )
    y = table(c, rows, [BODY * 0.36, BODY * 0.25, BODY * 0.19, BODY * 0.20], y)
    y = paragraph(
        c,
        f"<b>{f['selected']}</b> foi selecionado nas {next(row['windows'] for row in f['validation'] if row['modelId'] == f['selectedId'] and row['horizon'] == 3)} origens expansivas de validação a três meses. O teste final de {f['testStart']} a {f['backtest'][-1]['month']} ficou separado. O menor MAE final foi de {best_final['model']}; o método não foi escolhido novamente depois de observar esse teste.",
        y,
        9.8,
    )
    y = paragraph(
        c,
        f"<b>MAE:</b> erro absoluto médio em viajantes por mês. <b>RMSE:</b> penaliza erros grandes. O viés final foi +{number(score['bias'], 2)}: houve superestimação média. O WAPE foi {number(score['wape'], 2)}%.",
        y,
        9.8,
    )
    coverage = f["uncertainty"]["coverage"]
    paragraph(
        c,
        f"A faixa cinza é exploratória, baseada em {min(row['sample'] for row in f['uncertainty']['bands'])} a {max(row['sample'] for row in f['uncertainty']['bands'])} erros de validação por passo. {coverage['hits']}/{coverage['count']} meses finais ficaram nela, sem usar o teste para estimar os quantis. Essa amostra não garante cobertura futura. Previsão não significa reserva confirmada.",
        y,
        9.5,
    )
    c.showPage()


def intelligence_page(c: canvas.Canvas, data: dict, revision: str) -> None:
    y = header(
        c,
        6,
        "Da análise à ação",
        "Estatística descritiva, amostra explícita e investigação sem causalidade automática.",
        revision,
    )
    for title, text in [
        ("Sazonalidade e calendário", data["seasonal"]["conclusion"]),
        ("Cancelamentos e carteira", data["cancellations"]["conclusion"]),
        ("Satisfação e experiência", data["satisfaction"]["conclusion"]),
    ]:
        y = paragraph(c, title, y - 6, 12, bold=True)
        y = paragraph(c, escape(text), y, 10)
    y = paragraph(c, "Alertas, anomalias e hospedagem", y - 4, 12, bold=True)
    first = data["plan"][0]
    y = paragraph(
        c,
        f"O recorte tem <b>{len(data['alerts'])} alertas operacionais</b> e <b>{len(data['anomalies'])} anomalias estatísticas sinalizadas</b>. Isso é coerente: uma regra de contrato ou ficha pode exigir ação mesmo sem um desvio estatístico robusto.",
        y,
    )
    y = paragraph(
        c,
        f"No primeiro mês projetado ({first['month']}), existem {first['committed']} viajantes já confirmados, contra {number(first['predicted'])} previstos pelo histórico. O plano respeita os confirmados. Volume mensal não determina hotel, noite ou simultaneidade: é necessário conferir cada slot por data, etapa e categoria.",
        y,
    )
    paragraph(
        c,
        "Wilson e bootstrap são apresentados com seus pressupostos e limites. Grupos pequenos não autorizam conclusões fortes. O detector de anomalias foi testado com outliers controlados, separados da base principal; não foram fabricados achados para a apresentação.",
        y,
        9.5,
    )
    c.showPage()


def architecture_page(c: canvas.Canvas, data: dict, revision: str) -> None:
    y = header(
        c,
        7,
        "Arquitetura e desenvolvimento",
        "Uma interface, dois modos de dados e a mesma lógica analítica.",
        revision,
    )
    boxes = [
        (LEFT, y - 65, BODY, 52, "React / TypeScript · filtros, gráficos e modelos"),
        (LEFT, y - 166, 230, 65, "Demonstração\nJSON sintético · sem servidor"),
        (
            RIGHT - 230,
            y - 166,
            230,
            65,
            "Laboratório conectado\nFastAPI + autenticação",
        ),
        (RIGHT - 230, y - 260, 230, 55, "PostgreSQL\nPersistência + auditoria"),
    ]
    for x, by, width, height, label in boxes:
        c.setFillColor(LIGHT)
        c.setStrokeColor(BLUE)
        c.roundRect(x, by, width, height, 7, fill=1, stroke=1)
        lines = label.split("\n")
        c.setFont("Strong", 10)
        c.setFillColor(INK)
        for index, line in enumerate(lines):
            c.drawCentredString(x + width / 2, by + height / 2 + 3 - index * 16, line)
    c.setStrokeColor(MUTED)
    c.setLineWidth(1)
    c.line(WIDTH / 2, y - 65, WIDTH / 2, y - 83)
    c.line(LEFT + 115, y - 83, RIGHT - 115, y - 83)
    c.line(LEFT + 115, y - 83, LEFT + 115, y - 101)
    c.line(RIGHT - 115, y - 83, RIGHT - 115, y - 101)
    c.line(RIGHT - 115, y - 166, RIGHT - 115, y - 205)
    y -= 295
    for title, text in [
        (
            "Frontend e inteligência",
            "React 19, TypeScript, Vite, Tailwind CSS e Recharts. Quatro métodos leves executam no navegador; não há chamada externa de IA. A seleção temporal, o cache por snapshot e a atualização dos filtros são reproduzíveis.",
        ),
        (
            "Backend e banco",
            "FastAPI, Pydantic, SQLAlchemy, Alembic e Psycopg. Sessão revogável em memória no cliente, quatro perfis, migrações, seed idempotente, validação e auditoria transacional no PostgreSQL.",
        ),
        (
            "Qualidade e publicação",
            "Testes unitários, de interface e de integração verificam fórmulas, permissões, persistência e ausência de vazamento temporal. O GitHub Actions valida a candidata. O Pages público é estático e continua na versão anterior; a API do laboratório não está publicada externamente.",
        ),
    ]:
        y = paragraph(c, title, y, 11, bold=True)
        y = paragraph(c, text, y, 9.8)
    c.showPage()


def conclusion_page(c: canvas.Canvas, data: dict, revision: str) -> None:
    y = header(
        c,
        8,
        "Contribuição e próximos passos",
        "Uma base para analisar desempenho e planejar com limites transparentes.",
        revision,
    )
    y = paragraph(c, "O que foi demonstrado", y - 5, 13, bold=True)
    y = paragraph(
        c,
        "A plataforma reúne indicadores comerciais, financeiros e operacionais em uma navegação comum. Permite comparar roteiros, acompanhar reservas, revisar compromissos de hospedagem e considerar a experiência dos viajantes. Estatística e previsão acrescentam método à leitura dos números: os resultados podem ser reproduzidos e suas limitações são visíveis.",
        y,
        11,
    )
    y = paragraph(c, "O que ela não permite afirmar", y - 8, 13, bold=True)
    for item in [
        "A base é sintética: resultados não comprovam o desempenho real da Tour4Friends.",
        f"O histórico tem {data['forecast']['sample']} meses, com poucos eventos por roteiro; faixas são exploratórias.",
        "Associações e rankings não comprovam causalidade nem superioridade geral.",
        "Previsões não são vendas confirmadas; planejamento mensal não é contrato de hotel.",
        "A API funciona em laboratório e ainda depende de hospedagem HTTPS e homologação para uso externo.",
    ]:
        y = paragraph(c, "• " + item, y, 10.3)
    y = paragraph(c, "Evolução recomendada", y - 8, 13, bold=True)
    y = paragraph(
        c,
        "Homologar processos e contratos de dados com a agência; manter snapshots históricos; avaliar novos meses sem reescolher modelos pelo teste final; ampliar e qualificar feedbacks; validar backups, controle de acesso e publicação segura antes de operar dados reais.",
        y,
    )
    y = paragraph(c, "Como acessar e avaliar", y - 6, 13, bold=True)
    y = paragraph(
        c,
        "A aplicação pública permite explorar a demonstração atualmente publicada. A versão candidata mais completa e suas instruções de execução estão na branch de entrega. A integração dos PRs e a publicação futura exigem aprovação; não foram executadas automaticamente.",
        y,
    )
    link(c, SITE, SITE, LEFT, y - 3)
    link(
        c,
        "Código e documentação da candidata no GitHub",
        f"{REPO}/tree/{BRANCH}",
        LEFT,
        y - 25,
        9,
    )
    c.showPage()


def main() -> None:
    fonts()
    data = json.loads((ART / "report-data.json").read_text(encoding="utf8"))
    revision = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True
    ).strip()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    document.setTitle("T4F Performance — Projeto Integrador V — Entrega Acadêmica")
    document.setAuthor("Grupo T4F Performance · Fatec Ipiranga")
    for page in [
        cover,
        context_page,
        interface_page,
        kpi_page,
        forecast_page,
        intelligence_page,
        architecture_page,
        conclusion_page,
    ]:
        page(document, data, revision)
    document.save()
    reader = PdfReader(OUTPUT)
    assert len(reader.pages) == 8
    assert all(member in reader.pages[0].extract_text() for member in MEMBERS)
    assert all(page.extract_text().strip() for page in reader.pages)
    assert sum(len(page.get("/Annots", [])) for page in reader.pages) >= 4
    print(
        f"PDF acadêmico verificado estruturalmente: {OUTPUT} (8 páginas). Renderize e inspecione as oito imagens antes de entregar."
    )


if __name__ == "__main__":
    main()
