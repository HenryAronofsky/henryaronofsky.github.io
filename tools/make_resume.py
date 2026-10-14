#!/usr/bin/env python3
"""Generate Henry Aronofsky's resume as a single-page PDF with reportlab.

Content is sourced from the site's own content/*.html fragments, so the
resume and the site never disagree. Re-run after editing those fragments.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.lib.styles import ParagraphStyle

INK = HexColor("#1B1A17")
INK_SOFT = HexColor("#4A4740")
ACCENT = HexColor("#2E5E8C")
LINE = HexColor("#A29C8E")

OUT_PATH = "Henry_Aronofsky_Resume.pdf"

styles = {
    "name": ParagraphStyle(
        "name", fontName="Helvetica-Bold", fontSize=22, leading=24,
        textColor=INK, spaceAfter=2,
    ),
    "role": ParagraphStyle(
        "role", fontName="Helvetica", fontSize=11.5, leading=14,
        textColor=ACCENT, spaceAfter=6,
    ),
    "contact": ParagraphStyle(
        "contact", fontName="Helvetica", fontSize=9.5, leading=12,
        textColor=INK_SOFT,
    ),
    "section": ParagraphStyle(
        "section", fontName="Helvetica-Bold", fontSize=11, leading=13,
        textColor=INK, spaceBefore=14, spaceAfter=4, tracking=0.5,
    ),
    "entry_head": ParagraphStyle(
        "entry_head", fontName="Helvetica-Bold", fontSize=10.5, leading=13,
        textColor=INK,
    ),
    "entry_sub": ParagraphStyle(
        "entry_sub", fontName="Helvetica-Oblique", fontSize=10, leading=13,
        textColor=INK_SOFT,
    ),
    "entry_date": ParagraphStyle(
        "entry_date", fontName="Helvetica", fontSize=9.5, leading=13,
        textColor=INK_SOFT, alignment=2,  # right
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName="Helvetica", fontSize=10, leading=13.5,
        textColor=INK, leftIndent=14, bulletIndent=2, spaceAfter=2,
    ),
    "body": ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10, leading=13.5,
        textColor=INK, spaceAfter=2,
    ),
}


def section(title):
    return [
        Paragraph(title.upper(), styles["section"]),
        HRFlowable(width="100%", thickness=1, color=LINE, spaceAfter=6, spaceBefore=0),
    ]


def entry_row(head, date):
    t = Table(
        [[Paragraph(head, styles["entry_head"]), Paragraph(date, styles["entry_date"])]],
        colWidths=[5.1 * inch, 1.6 * inch],
    )
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    return t


def bullets(items):
    return [Paragraph(f"&bull;&nbsp;&nbsp;{item}", styles["bullet"]) for item in items]


doc = SimpleDocTemplate(
    OUT_PATH, pagesize=letter,
    leftMargin=0.75 * inch, rightMargin=0.75 * inch,
    topMargin=0.6 * inch, bottomMargin=0.6 * inch,
    title="Henry Aronofsky — Resume",
    author="Henry Aronofsky",
)

story = []

# --- Header -----------------------------------------------------------
story.append(Paragraph("Henry Aronofsky", styles["name"]))
story.append(Paragraph("Mechanical Engineering Undergrad at Harvard University", styles["role"]))
story.append(Paragraph(
    "Cambridge, MA &nbsp;|&nbsp; henryaronofsky@gmail.com &nbsp;|&nbsp; "
    "linkedin.com/in/haronofsky &nbsp;|&nbsp; github.com/HenryAronofsky",
    styles["contact"],
))
story.append(Spacer(1, 4))
story.append(HRFlowable(width="100%", thickness=1.4, color=INK, spaceAfter=2))

# --- Education ----------------------------------------------------------
story += section("Education")
story.append(entry_row("Harvard University — B.S. in Mechanical Engineering", "Aug 2024 – Feb 2028 (expected)"))
story.append(Paragraph("Cumulative GPA: 3.9 &nbsp;|&nbsp; Cambridge, MA", styles["body"]))
story.append(Spacer(1, 4))
story.append(entry_row("Saint Ann's School — High School Diploma", "Sep 2009 – Jul 2024"))

# --- Experience ---------------------------------------------------------
story += section("Experience")

experience = [
    dict(role="Q&amp;A Engineering Intern", org="Divergent", date="May 2026 – Sep 2026", bullets=[]),
    dict(role="Researcher", org="Harvard Microrobotics Laboratory", date="Aug 2025 – Present", bullets=[
        "Design and optimize ocean exploration and bio-data recovery tools and systems",
    ]),
    dict(role="Course Assistant", org="Harvard SEAS", date="Jan 2025 – Apr 2025", bullets=[
        "Advised and taught students on their projects and homework, and helped run labs and office hours with the teaching staff",
        "Operated lathes, CNC machines, and other machine shop equipment",
    ]),
    dict(role="Design Engineering Intern", org="Nanotronics", date="May 2021 – Sep 2023", bullets=[
        "Designed and implemented software solutions and visualizations for bespoke product lines",
        "Developed a factory-efficiency tracking interface that was deployed at scale to clients",
    ]),
    dict(role="Software Intern", org="Nebula", date="Mar 2019 – Mar 2021", bullets=[
        "Developed full-stack web applications",
    ]),
    dict(role="Summer Camp Counselor", org="Tivoli Sailing Company", date="Jan 2018 – Jul 2023", bullets=[]),
]

for i, job in enumerate(experience):
    story.append(entry_row(f"{job['role']} — {job['org']}", job["date"]))
    story += bullets(job["bullets"])
    if i < len(experience) - 1:
        story.append(Spacer(1, 6))

# --- Projects -------------------------------------------------------------
story += section("Selected Projects")

projects = [
    ("Bumblebee", "Competition robot built with a team of five for Harvard ES51's Turf Wars; completed two full rounds with no technical failures."),
    ("EuroRackingIt", "Fully analog 12-note piano built with a teammate for Harvard ES50 — no microcontroller, pure analog signal path from keyboard to audio output."),
    ("Jellyfish Motion Rig", "Stepper-motor-driven rig built at the Harvard Microrobotics Laboratory to observe and record jellyfish movement for ocean-exploration research."),
]
for name, desc in projects:
    story.append(Paragraph(f"<b>{name}</b> — {desc}", styles["body"]))
    story.append(Spacer(1, 3))

# --- Skills ---------------------------------------------------------------
story += section("Skills")
story.append(Paragraph("<b>Software:</b> Python, HTML/CSS, JavaScript, Angular", styles["body"]))
story.append(Paragraph("<b>Engineering:</b> OnShape, SolidWorks, COMSOL, milling, lathing", styles["body"]))

# --- Activities -------------------------------------------------------------
story += section("Leadership &amp; Activities")
story.append(entry_row("Double Bassist — Harvard Jazz Orchestra", "Sep 2026 – Present"))
story.append(Spacer(1, 4))
story.append(entry_row("Theater Technician — Harvard-Radcliffe Dramatic Club", "Feb 2024 – Present"))

doc.build(story)
print(f"wrote {OUT_PATH}")
