import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

pdf_dir = r"D:\RIT - Quantathon\Quantathon\qrious\frontend\public\slides"
os.makedirs(pdf_dir, exist_ok=True)
pdf_path = os.path.join(pdf_dir, "bloch_sphere_geometry_deck.pdf")

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)

styles = getSampleStyleSheet()

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
    fontSize=14,
    leading=18,
    textColor=colors.HexColor('#1E293B'),
    spaceBefore=14,
    spaceAfter=8
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13.5,
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
    fontSize=9.5,
    leading=13.5,
    textColor=colors.HexColor('#0F52BA'),
)

story = []

# Title Banner
story.append(Paragraph("Bloch Sphere Geometry — Lecture Slide Deck", title_style))
story.append(Paragraph("Comprehensive visual guide to single-qubit state representations, polar/azimuthal angles, and quantum gate rotations.", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#8B5CF6'), spaceAfter=15))

# Section 1: What is the Bloch Sphere?
story.append(Paragraph("1. What is the Bloch Sphere?", h2_style))
story.append(Paragraph("The Bloch Sphere is a geometric representation of the state of a single qubit. Each point on the sphere's surface corresponds to a pure quantum state; interior points represent mixed states. The sphere makes superposition, relative phase, and single-qubit rotations visually intuitive.", body_style))
story.append(Paragraph("• <b>Visual intuition:</b> Maps complex probability amplitudes to polar and azimuthal angles on a unit sphere for easier reasoning.", bullet_style))
story.append(Paragraph("• <b>Gate representation:</b> Single-qubit unitary quantum gates appear as 3D rotations about specific axes on the sphere.", bullet_style))
story.append(Paragraph("• <b>Teaching tool:</b> Commonly used to introduce qubit behavior, phase shifts, and measurement projection.", bullet_style))

# Section 2: Sphere Structure — Axes and Poles
story.append(Paragraph("2. Sphere Structure — Axes and Poles", h2_style))
story.append(Paragraph("The Bloch sphere is a unit sphere (radius r = 1) centered at the origin. The canonical axes are defined as:", body_style))
story.append(Paragraph("• <b>Z-axis:</b> Computational basis with <b>|0⟩</b> at the North Pole (θ = 0) and <b>|1⟩</b> at the South Pole (θ = π).", bullet_style))
story.append(Paragraph("• <b>X-axis:</b> Corresponds to the <b>|+⟩ = (|0⟩+|1⟩)/√2</b> and <b>|-⟩ = (|0⟩-|1⟩)/√2</b> basis.", bullet_style))
story.append(Paragraph("• <b>Y-axis:</b> Corresponds to phase-shifted <b>|+i⟩ = (|0⟩+i|1⟩)/√2</b> and <b>|-i⟩ = (|0⟩-i|1⟩)/√2</b> states.", bullet_style))
story.append(Paragraph("Points along the equator represent equal-amplitude superpositions differing only by relative phase φ.", body_style))

# Section 3: Qubit Parametric Representation
story.append(Paragraph("3. Qubit Parametric Representation", h2_style))
story.append(Paragraph("Any pure single-qubit state vector can be written parametrically as:<br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩</b>", body_style))
story.append(Paragraph("• <b>θ (theta):</b> Polar angle (0 ≤ θ ≤ π) — controls the relative weights/probabilities between |0⟩ and |1⟩.", bullet_style))
story.append(Paragraph("• <b>φ (phi):</b> Azimuthal angle (0 ≤ φ &lt; 2π) — encodes the relative quantum phase between amplitudes.", bullet_style))

# Callout box
callout_table = Table([[Paragraph("💡 <b>Remember:</b> Global phase is physically irrelevant, but relative phase (φ) directly changes quantum interference patterns and measurement outcomes in X/Y bases.", callout_style)]], colWidths=[530])
callout_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F3E8FF')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#C084FC')),
    ('PADDING', (0,0), (-1,-1), 8),
]))
story.append(Spacer(1, 4))
story.append(callout_table)
story.append(Spacer(1, 10))

# Section 4: Quantum Gates as Rotations
story.append(Paragraph("4. Quantum Gates as Rotations", h2_style))
story.append(Paragraph("Unitary single-qubit gates correspond to 3D rotations on the Bloch sphere surface:", body_style))
story.append(Paragraph("• <b>Pauli-X Gate:</b> π (180°) rotation about the X-axis. Swaps |0⟩ and |1⟩ (bit flip).", bullet_style))
story.append(Paragraph("• <b>Pauli-Y Gate:</b> π rotation about the Y-axis. Bit flip plus phase shift (complex sign changes).", bullet_style))
story.append(Paragraph("• <b>Pauli-Z Gate:</b> π rotation about the Z-axis. Phase flip — leaves computational basis probabilities unchanged.", bullet_style))
story.append(Paragraph("• <b>Hadamard (H) Gate:</b> Rotation that maps poles to the equator, creating equal superposition states and mixing X/Z bases.", bullet_style))

# Section 5: Measurement & Probabilities
story.append(Paragraph("5. Measurement &amp; Probabilities", h2_style))
story.append(Paragraph("For a general state |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩:<br/>&nbsp;&nbsp;&nbsp;&nbsp;• <b>Prob(|0⟩) = |α|² = cos²(θ/2)</b><br/>&nbsp;&nbsp;&nbsp;&nbsp;• <b>Prob(|1⟩) = |β|² = sin²(θ/2)</b><br/>Measurement projects the state to the observed eigenstate; repeated measurements follow the probability distribution set by the polar angle θ.", body_style))

# Section 6: Applications & Limitations
story.append(Paragraph("6. Applications &amp; Limitations", h2_style))
story.append(Paragraph("• <b>Applications:</b> Essential for single-qubit pulse calibration, control debugging, quantum error mitigation, and interactive visual learning.", bullet_style))
story.append(Paragraph("• <b>Limitations:</b> Directly represents only single-qubit pure states. Mixed states require interior points (r &lt; 1) with density matrices. Multi-qubit entanglement cannot be visualized on a single 3D sphere.", bullet_style))

doc.build(story)
print("Generated Bloch Sphere PDF successfully at:", pdf_path)
