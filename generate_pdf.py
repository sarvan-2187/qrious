import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

pdf_dir = r"D:\RIT - Quantathon\Quantathon\qrious\frontend\public\slides"
os.makedirs(pdf_dir, exist_ok=True)
pdf_path = os.path.join(pdf_dir, "qubits_superposition_notes.pdf")

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)

styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=24,
    leading=28,
    textColor=colors.HexColor('#0F172A'),
    spaceAfter=6
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=11,
    leading=15,
    textColor=colors.HexColor('#64748B'),
    spaceAfter=15
)

h2_style = ParagraphStyle(
    'SectionHeader',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=15,
    leading=19,
    textColor=colors.HexColor('#1E293B'),
    spaceBefore=14,
    spaceAfter=8
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=10,
    leading=14,
    textColor=colors.HexColor('#334155'),
    spaceAfter=6
)

bullet_style = ParagraphStyle(
    'BulletCustom',
    parent=body_style,
    leftIndent=15,
    firstLineIndent=-10,
    spaceAfter=4
)

callout_style = ParagraphStyle(
    'CalloutText',
    parent=styles['Normal'],
    fontName='Helvetica-Oblique',
    fontSize=10,
    leading=14,
    textColor=colors.HexColor('#0F52BA'),
)

story = []

# Title Banner
story.append(Paragraph("Qubits &amp; Superposition — Study Notes", title_style))
story.append(Paragraph("A concise, visual introduction to the qubit, superposition, measurement, and practical context — designed for undergraduate learners.", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=15))

# Section 1
story.append(Paragraph("1. Why Qubits Matter", h2_style))
story.append(Paragraph("Classical bits encode a single deterministic value (0 or 1). Qubits encode quantum information and can exist in linear combinations of 0 and 1 simultaneously. That extra flexibility is the foundation for quantum speedups and new algorithms.", body_style))
story.append(Paragraph("• <b>Fundamental unit:</b> A qubit is the basic unit of quantum information.", bullet_style))
story.append(Paragraph("• <b>Non-classical behavior:</b> Superposition and entanglement enable phenomena with no classical analogue.", bullet_style))
story.append(Paragraph("• <b>Algorithmic potential:</b> Qubits underlie algorithms like Shor's and Grover's that outperform classical approaches for specific problems.", bullet_style))

# Section 2
story.append(Paragraph("2. What Is a Qubit?", h2_style))
story.append(Paragraph("Computational basis states are represented in column vector notation:<br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>|0⟩ = [1, 0]ᵀ</b> and <b>|1⟩ = [0, 1]ᵀ</b><br/>These form an orthonormal basis for a single qubit system.", body_style))
story.append(Paragraph("General state of a qubit:<br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>|ψ⟩ = α|0⟩ + β|1⟩</b><br/>where <b>α</b> and <b>β</b> are complex probability amplitudes. The amplitudes encode the likelihoods of outcomes when measured.", body_style))

# Callout box
callout_table = Table([[Paragraph("💡 <b>Key Concept:</b> Think of α and β as directional weights — both magnitude and phase matter in quantum behavior.", callout_style)]], colWidths=[530])
callout_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#93C5FD')),
    ('PADDING', (0,0), (-1,-1), 8),
]))
story.append(Spacer(1, 4))
story.append(callout_table)
story.append(Spacer(1, 10))

# Section 3
story.append(Paragraph("3. Normalization &amp; Probabilities", h2_style))
story.append(Paragraph("The complex amplitudes α and β satisfy the fundamental normalization condition:<br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>|α|² + |β|² = 1</b>", body_style))
story.append(Paragraph("Measurement in the computational basis yields a classical result with probabilities:<br/>&nbsp;&nbsp;&nbsp;&nbsp;• <b>P(0) = |α|²</b><br/>&nbsp;&nbsp;&nbsp;&nbsp;• <b>P(1) = |β|²</b>", body_style))
story.append(Paragraph("After measurement, the qubit collapses to the observed basis state and loses its prior superposition.", body_style))

# Section 4
story.append(Paragraph("4. Superposition — Intuition &amp; Example", h2_style))
story.append(Paragraph("Superposition means the qubit simultaneously encodes components of |0⟩ and |1⟩ until observed.", body_style))
story.append(Paragraph("<b>Example: Equal Superposition State</b><br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>|ψ⟩ = (1/√2)|0⟩ + (1/√2)|1⟩</b> → Equal probability of measuring 0 or 1 (50% each).", body_style))
story.append(Paragraph("• <b>Key Implication:</b> Quantum parallelism allows a single qubit (and multi-qubit registers) to represent many possibilities at once.", bullet_style))
story.append(Paragraph("• <b>Limit:</b> Measurement yields only one outcome per run. Algorithms use quantum interference across amplitudes to amplify desired results.", bullet_style))

# Section 5
story.append(Paragraph("5. Bloch Sphere — Geometric View", h2_style))
story.append(Paragraph("The Bloch sphere represents any single-qubit pure state as a point on a 3D unit sphere. Coordinates (θ, φ) map to:<br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩</b><br/>Phases (φ) are physically important for interference but invisible to measurement probabilities alone.", body_style))

# Section 6
story.append(Paragraph("6. Physical Implementations &amp; Applications", h2_style))
story.append(Paragraph("Common physical qubit platforms include <b>superconducting circuits, trapped ions, photons, quantum dots, neutral atoms,</b> and <b>nuclear spins</b>. Each platform trades off coherence time, control precision, and scalability.", body_style))
story.append(Paragraph("Key application domains: <b>Quantum Cryptography &amp; Secure Communication, Drug Discovery &amp; Molecular Simulation, Optimization (logistics, finance),</b> and <b>Quantum Machine Learning</b>.", body_style))

doc.build(story)
print("Generated PDF successfully at:", pdf_path)
