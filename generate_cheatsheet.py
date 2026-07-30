import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

pdf_dir = r"D:\RIT - Quantathon\Quantathon\qrious\frontend\public\slides"
os.makedirs(pdf_dir, exist_ok=True)
pdf_path = os.path.join(pdf_dir, "quantum_foundations_cheatsheet.pdf")

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=35,
    leftMargin=35,
    topMargin=35,
    bottomMargin=35
)

styles = getSampleStyleSheet()

# Styles
title_style = ParagraphStyle(
    'MainTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=22,
    leading=26,
    textColor=colors.HexColor('#0F172A'),
    spaceAfter=12
)

col_title_style = ParagraphStyle(
    'ColTitle',
    parent=styles['Heading3'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=12,
    textColor=colors.HexColor('#1E293B'),
    spaceAfter=4
)

col_body_style = ParagraphStyle(
    'ColBody',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11.5,
    textColor=colors.HexColor('#334155')
)

section_head = ParagraphStyle(
    'SecHead',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=15,
    textColor=colors.HexColor('#0F172A'),
    spaceAfter=6
)

bullet_item = ParagraphStyle(
    'BulletItem',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor('#334155'),
    leftIndent=8
)

box_title = ParagraphStyle(
    'BoxTitle',
    parent=styles['Heading4'],
    fontName='Helvetica-Bold',
    fontSize=9.5,
    leading=12,
    textColor=colors.HexColor('#1E293B'),
    spaceAfter=4
)

box_body = ParagraphStyle(
    'BoxBody',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8,
    leading=11,
    textColor=colors.HexColor('#475569')
)

story = []

# Title
story.append(Paragraph("Quantum Computing — At a Glance", title_style))
story.append(Spacer(1, 4))

# Top 6 Columns Table
col1 = [Paragraph("<b>Qubit &amp; Superposition</b>", col_title_style), Paragraph("Qubit: α|0⟩ + β|1⟩ — superposition enables parallelism.<br/>|α|² + |β|² = 1", col_body_style)]
col2 = [Paragraph("<b>Entanglement</b>", col_title_style), Paragraph("Qubits become strongly correlated.<br/>Example Bell state:<br/>(|00⟩ + |11⟩)/√2 — enables teleportation, QKD, networks.", col_body_style)]
col3 = [Paragraph("<b>Measurement</b>", col_title_style), Paragraph("Measure |ψ⟩ = α|0⟩ + β|1⟩<br/>→ P(0)=|α|², P(1)=|β|².<br/>State collapses to |0⟩ or |1⟩.", col_body_style)]
col4 = [Paragraph("<b>No-Cloning &amp; Security</b>", col_title_style), Paragraph("Unknown states cannot be perfectly copied — foundation for QKD and secure quantum comms.", col_body_style)]
col5 = [Paragraph("<b>Matrices &amp; Gates</b>", col_title_style), Paragraph("Unitary: U†U=I (reversible gates).<br/>Hermitian: H†=H (observables).<br/>Examples: I, X, Y, Z, H.", col_body_style)]
col6 = [Paragraph("<b>Key Gates</b>", col_title_style), Paragraph("I (identity), X (bit flip), Y (bit+phase), Z (phase flip), H (creates superposition).", col_body_style)]

top_table = Table([[col1, col2, col3, col4, col5, col6]], colWidths=[90, 92, 88, 90, 90, 90])
top_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('PADDING', (0,0), (-1,-1), 6),
    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
]))

story.append(top_table)
story.append(Spacer(1, 14))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=14))

# Middle Section: 2 Columns
# Left Column
left_content = [
    Paragraph("Foundations", section_head),
    Paragraph("• Quantum info uses quantum mechanics", bullet_item),
    Paragraph("• Computational basis: |0⟩ = [1 0]ᵀ, |1⟩ = [0 1]ᵀ", bullet_item),
    Paragraph("• Hilbert space: complete vector space with inner product", bullet_item),
    Spacer(1, 10),
    Paragraph("Linear Algebra Notes", section_head),
    Paragraph("• Inner product ⟨φ|ψ⟩ — positivity, linearity, conjugate symmetry", bullet_item),
    Paragraph("• Outer product |ψ⟩⟨φ|", bullet_item),
    Paragraph("• Normal matrices: N N† = N† N", bullet_item),
]

# Right Column
right_content = [
    Paragraph("Advantages &amp; Limits", section_head),
    Paragraph("• Quantum parallelism → speedups (Shor, Grover)", bullet_item),
    Paragraph("• Cannot clone unknown states (No-Cloning theorem)", bullet_item),
    Paragraph("• Measurement destroys superposition", bullet_item),
    Spacer(1, 10),
    Paragraph("Applications", section_head),
    Paragraph("• Quantum Cryptography / QKD", bullet_item),
    Paragraph("• Quantum Algorithms (Shor, Grover)", bullet_item),
    Paragraph("• Drug discovery, materials, optimization, finance, AI, simulation", bullet_item),
]

mid_table = Table([[left_content, right_content]], colWidths=[265, 275])
mid_table.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('PADDING', (0,0), (-1,-1), 0),
]))
story.append(mid_table)
story.append(Spacer(1, 14))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=14))

# Bottom 3 Cards
card1 = [
    Paragraph("Core Equations", box_title),
    Paragraph("|ψ⟩ = α|0⟩ + β|1⟩  ·  |α|² + |β|² = 1  ·  U†U = I  ·  H† = H", box_body)
]
card2 = [
    Paragraph("Classical vs Quantum", box_title),
    Paragraph("Classical: bits, copy freely, sequential.<br/>Quantum: qubits, no cloning, superposition, entanglement, parallelism.", box_body)
]
card3 = [
    Paragraph("Quick Visuals", box_title),
    Paragraph("Bloch sphere • Bell pair • Gate matrices • Measurement collapse", box_body)
]

cards_table = Table([[card1, card2, card3]], colWidths=[175, 185, 175])
cards_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFBEB')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FDE68A')),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('PADDING', (0,0), (-1,-1), 8),
    ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor('#FDE68A')),
]))

story.append(cards_table)
story.append(Spacer(1, 12))

# Bottom Footer Callout
footer_callout = Table([[Paragraph("💡 <b>Study Tip:</b> Keep slides concise — speak to equations, gates, and applications. Use visuals above as anchors.", ParagraphStyle('FooterText', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8.5, leading=11, textColor=colors.HexColor('#475569')))]], colWidths=[540])
footer_callout.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ('PADDING', (0,0), (-1,-1), 6),
]))
story.append(footer_callout)

doc.build(story)
print("Generated Cheatsheet PDF successfully at:", pdf_path)
