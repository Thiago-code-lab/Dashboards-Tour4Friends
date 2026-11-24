"""Build the P2 report from calculated metrics and real local-browser captures."""

import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.doctemplate import BaseDocTemplate

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs/p2-visualizacao"
EVIDENCE = DOCS / "evidencias"
OUTPUT = ROOT / "output/pdf/P2_Visualizacao_de_Dados_T4F_Performance.pdf"
BLUE = colors.HexColor("#1c364b")
MUTED = colors.HexColor("#52677b")
WIDTH = A4[0] - 84
STORY = []
STYLES = getSampleStyleSheet()


def configure_fonts() -> None:
    candidates = [
        (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/segoeuib.ttf")),
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("P2", str(regular)))
            pdfmetrics.registerFont(TTFont("P2Bold", str(bold)))
            pdfmetrics.registerFontFamily(
                "P2", normal="P2", bold="P2Bold", italic="P2", boldItalic="P2Bold"
            )
            return
    raise RuntimeError("Disponibilize Segoe UI ou DejaVu Sans para gerar o PDF.")


def configure_styles() -> None:
    definitions = {
        "BodyP2": (10, 15, "P2", BLUE),
        "SmallP2": (8, 11, "P2", MUTED),
        "TitleP2": (27, 33, "P2Bold", BLUE),
        "HeadP2": (19, 25, "P2Bold", BLUE),
        "SubP2": (12, 18, "P2Bold", BLUE),
    }
    for name, (size, leading, font, color) in definitions.items():
        STYLES.add(
            ParagraphStyle(
                name,
                fontName=font,
                fontSize=size,
                leading=leading,
                textColor=color,
                spaceAfter=9,
                splitLongWords=True,
            )
        )


def p(text: str, style: str = "BodyP2") -> None:
    STORY.append(Paragraph(text, STYLES[style]))


def heading(index: int, title: str, subtitle: str) -> None:
    if STORY:
        STORY.append(PageBreak())
    p(f"P2 / VISUALIZAÇÃO DE DADOS / {index:02}", "SmallP2")
    p(title, "HeadP2")
    p(subtitle, "SmallP2")
    STORY.append(Spacer(1, 7))


def picture(filename: str, caption: str, width: float = WIDTH) -> None:
    path = DOCS / filename
    image = Image(str(path))
    image.drawHeight *= width / image.drawWidth
    image.drawWidth = width
    STORY.append(image)
    STORY.append(Spacer(1, 6))
    p(caption, "SmallP2")


def table(rows: list[list[str]], widths: list[float]) -> None:
    cells = [
        [Paragraph(escape(str(cell)), STYLES["SmallP2"]) for cell in row]
        for row in rows
    ]
    result = Table(cells, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef5")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f5f7fa")],
                ),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    STORY.extend([result, Spacer(1, 12)])


def num(value: float, places: int = 2) -> str:
    return f"{value:,.{places}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def cover() -> None:
    p("FATEC IPIRANGA - PASTOR ENÉAS TOGNINI", "SmallP2")
    p("Big Data para Negócios | Visualização de Dados - P2", "SmallP2")
    STORY.append(Spacer(1, 82))
    p("T4F Performance", "TitleP2")
    p("Ocupação e experiência para orientar decisões", "HeadP2")
    p("Tour4Friends | Relatório acadêmico", "SubP2")
    p(
        "Planejamento, dashboard interativo, técnicas visuais, análises e validação preparada."
    )
    STORY.append(Spacer(1, 42))
    for name in [
        "Daniel Fernando dos Santos",
        "Lucas Antonio Evangelista dos Santos",
        "Pablo Roberto da Silva Costa",
        "Thiago Cardoso Davi",
        "William Nunes Vilany",
    ]:
        p(name)
    STORY.append(Spacer(1, 32))
    checked = json.loads((EVIDENCE / "verificacao.json").read_text(encoding="utf8"))
    p(f"Verificação técnica: {checked['date']} | São Paulo", "SmallP2")
    p(
        "<b>Dados sintéticos. Build local para revisão. Avaliação da Tour4Friends pendente.</b>"
    )
    p(
        "O documento oficial P2_VD2026.docx não estava disponível. Este relatório atende ao roteiro textual fornecido; correspondência literal aos seis entregáveis aguarda conferência do DOCX.",
        "SmallP2",
    )


def planning() -> None:
    heading(
        2,
        "Problema e objetivos",
        "Decisões de capacidade precisam considerar a experiência do viajante.",
    )
    p(
        "Informações comerciais, operacionais e financeiras dispersas dificultam uma leitura conjunta do negócio. A plataforma existente reúne essas dimensões para apoiar gestores da Tour4Friends, comercial, operações, atendimento e financeiro."
    )
    p(
        "O foco de interesse é a análise de peregrinos brasileiros nos Caminhos Francês e Português. A base demonstrativa não identifica nacionalidade e não permite medir esse público real. Filtros por caminho demonstram o método sem fabricar estatísticas brasileiras."
    )
    table(
        [
            ["Indicador prioritário", "Cálculo e interpretação"],
            [
                "Ocupação (%)",
                "100 × vagas-noite comprometidas / capacidade dos mesmos slots de saída, etapa e categoria.",
            ],
            [
                "NPS (pontos)",
                "100 × (promotores 9-10 − detratores 0-6) / respostas. Escala de −100 a 100; informar n.",
            ],
            [
                "Contribuição (BRL)",
                "Receita contratada − custos incluídos. Não equivale a lucro líquido.",
            ],
            [
                "Margem (%)",
                "100 × contribuição / receita contratada. Denominador zero produz ausência.",
            ],
            [
                "Cancelamentos (%)",
                "100 × canceladas / reservas do recorte. Distinguir histórico e compromissos futuros.",
            ],
        ],
        [130, WIDTH - 130],
    )
    p(
        "<b>Objetivos:</b> priorizar ocupação e NPS; permitir filtros consistentes; detalhar gargalos e amostras; documentar atualização, limitações e fonte; compartilhar decisões por CSV e PDF."
    )
    p(
        "Metas de validação: dez capítulos navegáveis, indicadores derivados dos registros carregados e evidências reproduzíveis. A aprovação empresarial exige avaliação real."
    )
    p(
        "Detalhamento de público por KPI, fórmulas e trade-offs: docs/p2-visualizacao/planejamento.md.",
        "SmallP2",
    )


def narrative() -> None:
    heading(
        3,
        "Planejamento e storytelling",
        "Situação → Problema → Evidência → Insight → Ação recomendada",
    )
    p(
        "A visão executiva inicia a narrativa. Cada capítulo expõe uma pergunta, contexto, evidência do recorte e orientação de investigação. A navegação anterior/próximo preserva filtros; a narrativa é recolhível para manter os indicadores visíveis."
    )
    table(
        [
            ["Capítulo", "Contribuição para a decisão"],
            ["01 Visão geral", "Situar ocupação, NPS, conversão e contribuição."],
            [
                "02 Demanda e previsões",
                "Planejar volume com erro de previsão e incerteza explícitos.",
            ],
            [
                "03 Reservas e comercial",
                "Investigar status, canais, coortes e cancelamentos.",
            ],
            ["04 Roteiros e destinos", "Comparar volume, rentabilidade e experiência."],
            ["05 Hospedagens", "Detectar insuficiência por saída, etapa e categoria."],
            ["06 Operações e alertas", "Priorizar pendências e registrar revisão."],
            [
                "07 Experiência do cliente",
                "Interpretar NPS, distribuição, amostra e dimensões.",
            ],
            ["08 Financeiro", "Separar receita, custo e contribuição gerencial."],
            ["09 Relatório executivo", "Comunicar o recorte em documento imprimível."],
            ["10 Sobre e metodologia", "Conferir definições, qualidade e limites."],
        ],
        [145, WIDTH - 145],
    )
    p(
        "O Catálogo e orçamento é complemento documental em EUR para 2027, separado dos dez painéis históricos BRL. Não há migração presumida entre categorias comerciais e históricas."
    )
    p(
        "Análises descritivas e exploratórias orientam investigação; previsões não são compromissos de venda. Não há modelo de linguagem: regras determinísticas e modelos numéricos locais evitam custo de tokens e latência remota.",
        "SmallP2",
    )


def architecture() -> None:
    heading(
        4,
        "Arquitetura e integração de dados",
        "O Pages demonstra; o laboratório local comprova persistência relacional.",
    )
    p(
        "<b>Demonstração:</b> arquivos estáticos → JSON validado → contexto React memoizado → filtros e indicadores compartilhados → Recharts/tabelas. React, TypeScript, Vite e Tailwind preservam a arquitetura existente. Zod valida estrutura e vínculos."
    )
    p(
        "<b>Laboratório:</b> cliente autenticado → FastAPI → SQLAlchemy assíncrono/psycopg → PostgreSQL. Alembic cria o modelo relacional; seed importa os mesmos dados sintéticos. Perfis, controle de versão e auditoria restringem e rastreiam gravações."
    )
    table(
        [
            ["Comportamento", "Evidência reproduzida"],
            [
                "Leitura e filtros",
                "Snapshot validado, paridade Python/TypeScript e seleção por caminho, roteiro, modalidade e categoria.",
            ],
            [
                "Atualização",
                "Após escrita; botão manual; foco e intervalo de 30 s quando a janela está visível e sem gravação em curso.",
            ],
            [
                "Persistência",
                "Nova sessão lê alteração; revisão de alerta sobrevive a nova sessão.",
            ],
            [
                "Erros e permissões",
                "401, indisponibilidade, conflitos, perfis e respostas inválidas, sem fallback silencioso.",
            ],
            [
                "Execução local",
                "27 Pytest + 8 testes de navegador conectados com PostgreSQL real; Ruff aprovado; cluster descartável encerrado.",
            ],
        ],
        [125, WIDTH - 125],
    )
    p(
        "Reprodução: <b>python scripts/verify-p2-lab.py --pg-bin &quot;C:/Program Files/PostgreSQL/18/bin&quot;</b>. O runner cria um cluster novo em pasta temporária e banco terminado em _test; não altera o .env ou banco existente."
    )
    p(
        "O GitHub Pages não consulta nem grava PostgreSQL remoto. Na demo, recarga busca JSON versionado sem cache HTTP; importações permanecem em memória. Não há nova API pública ou serviço de nuvem contratado."
    )
    p(
        "Limites: testes funcionais locais não medem carga de produção. Ver integracao-relacional.md e evidencias/laboratorio.json.",
        "SmallP2",
    )


def wireframe() -> None:
    heading(
        5,
        "Wireframe e técnicas visuais",
        "Hierarquia fiel à estrutura do dashboard, sem números inventados.",
    )
    picture(
        "wireframe.png",
        "Wireframe criado por código; representação esquemática, não captura de navegador.",
    )
    p(
        "Linhas preservam a ordem temporal; barras permitem comparar comprimentos em escala comum. Ocupação informa porcentagem e denominador; NPS usa pontos e amostra. Receita, custo e contribuição têm unidades e legenda próprias."
    )
    p(
        "Projeção tracejada e faixa exploratória distinguem futuro de observação. Alertas de regras de negócio ficam separados de anomalias estatísticas. Cor é acompanhada de texto/ícone; tabelas acessíveis complementam gráficos. Tipografia e espaçamento priorizam valores e notas de interpretação."
    )
    p(
        "No celular, menu recolhido e cartões empilhados preservam navegação. Testes automatizados de acessibilidade não equivalem à conformidade WCAG completa. Detalhes em tecnicas-de-visualizacao.md.",
        "SmallP2",
    )


def overview(kpis: dict[str, Any]) -> None:
    heading(
        6,
        "Dashboard executado",
        "Captura real do build local de produção, sem publicação automática.",
    )
    picture(
        "evidencias/visao-geral-desktop.png",
        "Visão geral em 1440 × 1000. Fonte e referência do cenário permanecem explícitas.",
    )
    table(
        [
            ["Recorte padrão", "Resultado calculado"],
            ["Viagens", "01/01/2024 a 31/12/2026; todas as dimensões"],
            [
                "Ocupação",
                f"{kpis['committed']} / {kpis['capacity']} vagas-noite = {num(kpis['occupancy'])}%",
            ],
            ["NPS", f"{num(kpis['nps'])} pontos; {kpis['responses']} respostas"],
            [
                "Reservas",
                f"{kpis['bookings']} no recorte; {kpis['confirmed']} confirmadas",
            ],
        ],
        [135, WIDTH - 135],
    )
    p(
        "O capítulo recolhível explica a decisão sem ocultar os quatro KPIs prioritários. Valores de tela arredondam a apresentação; a evidência JSON preserva precisão. Denominador ausente é exibido como traço, não como desempenho zero."
    )
    p(
        "Demonstração sintética: não representa faturamento, disponibilidade ou experiência real da agência.",
        "SmallP2",
    )


def interactivity() -> None:
    heading(
        7,
        "Filtros e interatividade",
        "Caminho, roteiro, modalidade, categoria e período compartilham o mesmo recorte.",
    )
    picture(
        "evidencias/filtro-portugues.png",
        "Português aplicado: 43,74% de ocupação e NPS de 42,11 pontos (38 respostas).",
        410,
    )
    picture(
        "evidencias/narrativa.png",
        "Narrativa expandida: contexto, problema, evidência, insight e ação. Links percorrem os dez capítulos.",
        410,
    )
    p(
        "Escolha as dimensões e clique Aplicar. Limpar filtros restaura o padrão. Trocar caminho atualiza as opções dependentes. A correção desta P2 faz cancelamentos/satisfação estatísticos respeitarem o mesmo caminho.",
        "SmallP2",
    )


def customer(kpis: dict[str, Any]) -> None:
    heading(
        8,
        "Análises: capacidade e experiência",
        "Pergunta → recorte → indicador → resultado → interpretação → ação → limites",
    )
    picture(
        "evidencias/experiencia.png",
        "Experiência do cliente: distribuição e tamanho da amostra acompanham o NPS.",
    )
    p(
        f"<b>Há capacidade para qualquer saída?</b> No padrão, ocupação de {num(kpis['occupancy'])}% coexiste com {kpis['shortageSlots']} slots insuficientes. A média esconde gargalos por data/etapa. Ação: revisar esses slots antes de ampliar vendas. Limite: não existe inventário real comprovado."
    )
    p(
        f"<b>O que diz o NPS?</b> {kpis['promoters']} promotores e {kpis['detractors']} detratores em {kpis['responses']} respostas resultam em {num(kpis['nps'])} pontos. Francês: 41,67 (n=24); Português: 42,11 (n=38). Não há teste que comprove superioridade entre caminhos. Ação: examinar comentários e ampliar coleta."
    )
    p(
        f"<b>Qual dimensão investigar?</b> Atendimento {num(kpis['service'])}, hospedagem {num(kpis['accommodation'])} e logística {num(kpis['logistics'])}, em 0-10. Hospedagem tem a menor média; não há causa demonstrada. Ação: revisar comentários por etapa. Limites: dados sintéticos e viés de resposta."
    )
    p(
        "Dados, filtros e cálculos não arredondados: evidencias/metricas.json. Achados completos com sete campos: analises-e-insights.md.",
        "SmallP2",
    )


def demand(scope: dict[str, Any]) -> None:
    heading(
        9,
        "Análises: demanda e incerteza",
        "Os métodos existentes são reaproveitados; não se inventam testes nem outliers.",
    )
    picture(
        "evidencias/demanda-serie.png",
        "Série observada e projeção tracejada com faixa exploratória; controles de cenário e horizonte.",
        475,
    )
    p(
        "<b>Padrão temporal:</b> nos 34 meses completos até outubro/2026, junho tem média de 10,67 viajantes (três junhos). Francês concentra maior média em setembro; Português, junho. Ação: conferir vagas antes dessas janelas. Limite: poucos ciclos, sem comprovação inferencial de sazonalidade."
    )
    p(
        "<b>Cancelamentos:</b> card padrão = 16/160 = 10%. Na análise só histórica, Francês de bike = 3/22 (13,64%; Wilson 95% 4,75%-33,33%) e Português de bike = 2/15 (13,33%; 3,74%-37,88%). Ação: investigar motivos/canais. Limite: intervalos amplos e denominadores diferentes do card."
    )
    p(
        "<b>Previsão:</b> Ridge selecionado em validação anterior ao teste final de maio-outubro/2026. MAE 2,56 viajantes; RMSE 2,75; viés +1,38; WAPE 38,35%. Média ponderada obteve MAE 2,13 nesse teste: o selecionado não venceu o conjunto final. Ação: monitorar novas observações, sem seleção retrospectiva."
    )
    p(
        f"Detector existente: {len(scope['anomalies'])} anomalias estatísticas no recorte completo. Alertas operacionais são regras distintas e continuam relevantes. Faixas são exploratórias, sem cobertura garantida. Seis pares no teste limitam a confiança.",
        "SmallP2",
    )


def finance(kpis: dict[str, Any]) -> None:
    heading(
        10,
        "Análises: contribuição financeira",
        "Contribuição positiva no cenário não comprova lucro líquido.",
    )
    picture(
        "evidencias/financeiro-serie.png",
        "Receita, custos e contribuição nos 12 meses finais do histórico filtrado; tabela abaixo consolida o recorte completo.",
        440,
    )
    table(
        [
            ["Indicador / recorte padrão", "Resultado"],
            ["Receita contratada", f"R$ {num(kpis['revenue'], 0)}"],
            ["Custos incluídos", f"R$ {num(kpis['cost'], 0)}"],
            [
                "Contribuição",
                f"R$ {num(kpis['contribution'], 0)} ({num(100 * kpis['contribution'] / kpis['revenue'])}%)",
            ],
            ["Receita realizada gerencial", f"R$ {num(kpis['realizedRevenue'], 0)}"],
        ],
        [WIDTH - 160, 160],
    )
    p(
        "<b>Pergunta:</b> quanto resta após os custos incluídos? <b>Interpretação:</b> receita confirmada menos custos operacionais produz resultado parcial. <b>Ação:</b> conferir estimados, contratos futuros e cobertura de despesas antes de decidir preço ou investimento."
    )
    p(
        "Limites: custos não cobrem todas as despesas/tributos de um DRE; filtro de categoria rateia custos pela receita. Moeda histórica BRL é separada das tarifas documentais EUR. A base não foi alterada para produzir resultado positivo.",
        "SmallP2",
    )


def manual() -> None:
    heading(
        11,
        "Manual e comunicação dos resultados",
        "Fluxo de uso verificável no navegador.",
    )
    p(
        "<b>1. Abrir:</b> npm ci; npm run build:demo; npm run preview. A demonstração não exige backend. Conferir fonte e referência do cenário."
    )
    p(
        "<b>2. Navegar:</b> menu lateral ou Anterior/Próximo dos capítulos. No celular, Abrir menu; Escape fecha e devolve foco."
    )
    p(
        "<b>3. Filtrar:</b> preencher datas/dimensões e Aplicar; Limpar filtros retorna ao padrão. Traço/estado vazio não significa zero de desempenho."
    )
    p(
        "<b>4. Exportar:</b> Exportar CSV nas tabelas considera o resultado da busca/filtros. O modelo de importação de reservas é outro formato. Erros preservam a base anterior."
    )
    p(
        "<b>5. Compartilhar:</b> Relatório executivo → Imprimir / salvar PDF → A4, sem cabeçalhos/rodapés do navegador. Esse PDF de recorte difere deste relatório acadêmico."
    )
    picture(
        "evidencias/relatorio.png",
        "Relatório executivo com identificação do grupo e controles de impressão.",
        455,
    )
    p(
        "<b>6. Atualizar:</b> demo relê JSON versionado ao recarregar/restaurar, sem persistir importações. Laboratório atualiza manualmente, após escrita e em intervalo/foco; falhas não mudam a fonte silenciosamente. Manual ilustrado completo: manual-do-usuario.md.",
        "SmallP2",
    )


def validation() -> None:
    heading(
        12,
        "Validação, limites e conclusão",
        "Entrega técnica para revisão; validação empresarial e acadêmica integral pendentes.",
    )
    p(
        "<b>Parceiro:</b> avaliação real ainda não recebida. Roteiro preparado em validacao-parceiro.md: clareza dos indicadores, navegação, utilidade, relevância de ocupação/NPS, qualidade visual e sugestões. Não foram inventadas respostas, reuniões ou aprovações."
    )
    checks = json.loads((EVIDENCE / "verificacao.json").read_text(encoding="utf8"))
    table(
        [
            ["Verificação executada", "Resultado"],
            *[[key, str(value)] for key, value in checks["checks"].items()],
        ],
        [205, WIDTH - 205],
    )
    p(
        "<b>Código e publicação:</b> branch feature/p2-visualizacao-2026, baseada no PR #8. PRs #4/#5/#6/#7/#8 permanecem abertos, sem merge. O site público respondeu HTTP 200 e não contém os capítulos P2 nem o catálogo dessas branches. As imagens deste relatório são locais. WIP de hospedagens foi preservado."
    )
    p(
        "<b>Pendências:</b> disponibilizar P2_VD2026.docx para mapear literalmente seus seis entregáveis; realizar avaliação consentida da Tour4Friends e registrar comentários/ajustes; revisar a cadeia de PRs e autorizar eventual integração/publicação."
    )
    p(
        "<b>Conclusão:</b> ocupação e NPS orientam uma jornada de dez capítulos com filtros, dados rastreáveis, análises e integração relacional comprovada localmente. A contribuição não é lucro líquido e a demonstração não representa desempenho real. A evidência permite revisão técnica sem antecipar aprovação humana."
    )
    p(
        "Fontes: auditoria.md, planejamento.md, tecnicas-de-visualizacao.md, analises-e-insights.md, manual-do-usuario.md, integracao-relacional.md, validacao-parceiro.md e checklist-entrega.md, em docs/p2-visualizacao. Métricas e capturas possuem manifestos em evidencias/.",
        "SmallP2",
    )
    p(
        "Repositório: https://github.com/Thiago-code-lab/Dashboards-Tour4Friends<br/>Site: https://thiago-code-lab.github.io/Dashboards-Tour4Friends/",
        "SmallP2",
    )


def footer(canvas: Canvas, document: BaseDocTemplate) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d9e2ea"))
    canvas.line(42, 35, A4[0] - 42, 35)
    canvas.setFont("P2", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(
        42,
        23,
        "T4F Performance | P2 | Dados sintéticos | Avaliação do parceiro pendente",
    )
    canvas.drawRightString(A4[0] - 42, 23, str(document.page))
    canvas.restoreState()


def main() -> None:
    configure_fonts()
    configure_styles()
    data = json.loads((EVIDENCE / "metricas.json").read_text(encoding="utf8"))
    scope = data["scopes"][0]
    cover()
    planning()
    narrative()
    architecture()
    wireframe()
    overview(scope["kpis"])
    interactivity()
    customer(scope["kpis"])
    demand(scope)
    finance(scope["kpis"])
    manual()
    validation()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=42,
        rightMargin=42,
        topMargin=36,
        bottomMargin=47,
        title="P2 - Visualização de Dados - T4F Performance",
        author="Equipe T4F Performance",
    )
    document.build(STORY, onFirstPage=footer, onLaterPages=footer)
    pages = PdfReader(OUTPUT).pages
    if len(pages) != 12 or any(not page.extract_text().strip() for page in pages):
        raise RuntimeError(
            f"Esperadas 12 páginas com texto; geradas {len(pages)}. Revise o layout."
        )
    shutil.copyfile(OUTPUT, DOCS / OUTPUT.name)
    manifest = {
        "generatedAt": datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(),
        "pages": len(pages),
        "datasetSha256": data["datasetSha256"],
        "partnerValidation": "pending",
        "officialRequirementsDocx": "not provided",
        "source": "local production build",
        "pdfSha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
    }
    (EVIDENCE / "relatorio.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf8"
    )
    print(f"Relatório P2 gerado: {len(pages)} páginas.")


if __name__ == "__main__":
    main()
