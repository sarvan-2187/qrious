import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfgen import canvas

PDF_PATH = r"d:\RIT - Quantathon\Qrious\frontend\public\slides\review-linear-algebra.pdf"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        page_w, page_h = landscape(letter)
        
        # Header banner
        self.setFillColor(colors.HexColor("#0F172A")) # slate-900
        self.rect(0, page_h - 40, page_w, 40, fill=1, stroke=0)
        
        # Accent emerald line
        self.setFillColor(colors.HexColor("#10B981")) # emerald-500
        self.rect(0, page_h - 43, page_w, 3, fill=1, stroke=0)
        
        # Header text
        self.setFillColor(colors.HexColor("#10B981"))
        self.setFont("Helvetica-Bold", 9)
        self.drawString(30, page_h - 18, "QRIOUS • QUANTUM ACADEMY")
        
        self.setFillColor(colors.white)
        self.setFont("Helvetica-Bold", 13)
        self.drawString(30, page_h - 32, "Review of Linear Algebra")
        
        self.setFillColor(colors.HexColor("#94A3B8"))
        self.setFont("Helvetica", 9)
        self.drawRightString(page_w - 30, page_h - 26, f"Slide {self._pageNumber} of {page_count}  •  PDF Slide Deck")
        
        # Footer
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.8)
        self.line(30, 30, page_w - 30, 30)
        
        self.setFillColor(colors.HexColor("#94A3B8"))
        self.setFont("Helvetica", 8)
        self.drawString(30, 16, "Review of Linear Algebra • Verified Qrious Educational Content")
        self.drawRightString(page_w - 30, 16, f"Page {self._pageNumber} of {page_count}")
        
        self.restoreState()

def create_pdf():
    os.makedirs(os.path.dirname(PDF_PATH), exist_ok=True)
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=landscape(letter),
        leftMargin=30,
        rightMargin=30,
        topMargin=55,
        bottomMargin=45
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'SlideTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=8
    )
    
    subtitle_style = ParagraphStyle(
        'SlideSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15
    )
    
    bullet_style = ParagraphStyle(
        'SlideBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )
    
    card_title_style = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#10B981")
    )
    
    card_text_style = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155")
    )
    
    highlight_style = ParagraphStyle(
        'HighlightText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#065F46")
    )
    
    slides_data = [
        {
            "title": "Review of Linear Algebra",
            "subtitle": "A concise journey through vectors, matrices, and the mathematical structures that power modern computing, AI, and engineering.",
            "bullets": [
                "<b>Domain Scope:</b> Mathematics • Computer Science • Engineering • Quantum Computing",
                "<b>Core Focus:</b> Vectors, matrices, linear transformations, and systems of linear equations",
                "<b>Goal:</b> Establishing the linear algebra foundation required for quantum mechanics and state vector manipulations"
            ]
        },
        {
            "title": "What is Linear Algebra?",
            "subtitle": "The mathematical branch studying vectors, matrices, and linear equations — the language of high-dimensional structure.",
            "cards": [
                ("Computer Science", "Algorithms, computer graphics, and complex data structures"),
                ("Artificial Intelligence", "Neural networks, tensor operations, and model optimization"),
                ("Data Science", "Dimensionality reduction, PCA, and high-dimensional statistics"),
                ("Quantum Computing", "State vectors, Hilbert spaces, and unitary operators")
            ]
        },
        {
            "title": "Scalars & Vectors",
            "subtitle": "Fundamental quantities of vector space mathematics.",
            "bullets": [
                "<b>Scalar:</b> A quantity with magnitude only — a single real number (e.g. Temp: 98.6°F, Mass: 5 kg, Time: 12 s).",
                "<b>Vector:</b> A quantity with magnitude and direction — an ordered list of numbers (e.g. Velocity, Force, Displacement).",
                "<b>Example Vector:</b> v = (3, 4)",
                "<b>Magnitude Calculation:</b> |v| = √(3² + 4²) = √25 = 5"
            ],
            "highlight": "Key Takeaway: Vectors represent state direction and length in space. In quantum mechanics, quantum states |ψ⟩ are unit-norm state vectors."
        },
        {
            "title": "Vector Operations",
            "subtitle": "Three core operations forming the backbone of vector algebra.",
            "cards": [
                ("Vector Addition", "Add corresponding components tip-to-tail. Example: (2, 3) + (4, 1) = (6, 4)."),
                ("Scalar Multiplication", "Multiply every component by a scalar value. Example: 3 · (2, 1) = (6, 3)."),
                ("Dot Product", "Multiply corresponding components and sum: (2, 3) · (4, 5) = 8 + 15 = 23.")
            ],
            "highlight": "Key Properties: The dot product is commutative and distributive; vector addition is associative."
        },
        {
            "title": "Matrices & Structural Types",
            "subtitle": "Rectangular arrangements of numbers encoding linear transformations compactly.",
            "bullets": [
                "<b>Definition:</b> A matrix organizes m rows and n columns of numbers to represent linear maps.",
                "<b>Example 2×2 Matrix:</b> A = [[1, 2], [3, 4]]"
            ],
            "cards": [
                ("Row & Column", "Single row [1, 2] or single column [[1], [3]] matrix structures."),
                ("Square Matrix", "n × n dimension matrix (equal rows and columns)."),
                ("Identity Matrix (I)", "Square matrix with diagonal 1s and off-diagonal 0s."),
                ("Zero & Diagonal", "Zero matrix (all 0s) and Diagonal matrix (non-zeros only on main diagonal).")
            ]
        },
        {
            "title": "Matrix Operations",
            "subtitle": "Manipulating matrices for linear transformations.",
            "cards": [
                ("Addition & Subtraction", "Add or subtract corresponding entries. Matrices must share identical dimensions."),
                ("Scalar Multiplication", "Multiply every matrix entry uniformly by a scalar factor."),
                ("Matrix Multiplication", "Dot product of rows with columns. Requires inner dimensions to match: (m×n) · (n×p) = (m×p)."),
                ("Transpose (Aᵀ)", "Flip rows into columns. Example: A = [[1, 2], [3, 4]] ⟹ Aᵀ = [[1, 3], [2, 4]].")
            ]
        },
        {
            "title": "Determinant & Matrix Inverse",
            "subtitle": "Measuring transformation scaling and reversing linear operations.",
            "bullets": [
                "<b>Determinant det(A):</b> For 2×2 matrix A = [[a, b], [c, d]], det(A) = ad - bc.",
                "<b>Meaning:</b> Single scalar measuring area/volume scaling factor and invertibility.",
                "<b>Matrix Inverse A⁻¹:</b> Exists only if det(A) ≠ 0. Satisfies A · A⁻¹ = I.",
                "<b>Solving Linear Systems:</b> Ax = b ⟹ x = A⁻¹b."
            ],
            "highlight": "Invertibility Rule: A matrix is invertible (non-singular) if and only if its determinant is non-zero (det(A) ≠ 0)."
        },
        {
            "title": "Systems of Linear Equations",
            "subtitle": "Solving Ax = b where A is the coefficient matrix, x is the unknown vector, and b is the result vector.",
            "cards": [
                ("1. Substitution", "Solve one equation for a variable and substitute into others."),
                ("2. Elimination", "Combine equations to cancel variables systematically."),
                ("3. Matrix Inverse", "Compute x = A⁻¹b directly when A is non-singular."),
                ("4. Gaussian Elimination", "Row reduction to row echelon form — the workhorse of computational linear algebra.")
            ]
        },
        {
            "title": "Eigenvalues & Eigenvectors",
            "subtitle": "The intrinsic invariant axes of linear transformations: Ax = λx.",
            "bullets": [
                "<b>Eigenvector (x):</b> Non-zero vector whose direction is unchanged when transformed by matrix A.",
                "<b>Eigenvalue (λ):</b> The scaling factor by which the eigenvector is stretched or compressed.",
                "<b>Eigen-equation:</b> Ax = λx",
                "<b>Applications:</b> Quantum Computing, Machine Learning, Face Recognition, Principal Component Analysis (PCA)."
            ],
            "highlight": "Quantum Note: In quantum mechanics, quantum observables are Hermitian operators whose eigenvectors represent measurable state bases and eigenvalues represent measurement outcomes."
        },
        {
            "title": "Why Linear Algebra Matters",
            "subtitle": "The mathematical foundation of quantum mechanics and modern technology.",
            "cards": [
                ("Vectors & Matrices", "Fundamental data structures encoding state and operator logic."),
                ("Operations & Inverses", "Essential algebraic tools for transforming states and solving linear systems."),
                ("Eigenanalysis", "Unlocking energy levels, measurement observables, and data patterns."),
                ("Modern Applications", "Powering AI, neural networks, quantum computing, computer graphics, and physics simulations.")
            ],
            "highlight": "Key Takeaway: Linear Algebra is not just abstract math — it is the operating system of modern technology. Every neural network, quantum simulation, and recommendation engine runs on these foundations."
        }
    ]
    
    story = []
    
    for idx, slide in enumerate(slides_data):
        if idx > 0:
            story.append(PageBreak())
            
        story.append(Paragraph(slide["title"], title_style))
        story.append(Paragraph(slide["subtitle"], subtitle_style))
        
        if "bullets" in slide:
            for bullet in slide["bullets"]:
                story.append(Paragraph(f"•  {bullet}", bullet_style))
            story.append(Spacer(1, 10))
            
        if "cards" in slide:
            card_tables = []
            cards = slide["cards"]
            for c_title, c_text in cards:
                content = [
                    Paragraph(c_title, card_title_style),
                    Spacer(1, 3),
                    Paragraph(c_text, card_text_style)
                ]
                t_box = Table([[content]], colWidths=[340])
                t_box.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
                    ('CORNER-RADIUS', (0,0), (-1,-1), 4),
                    ('TOPPADDING', (0,0), (-1,-1), 8),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                    ('LEFTPADDING', (0,0), (-1,-1), 10),
                    ('RIGHTPADDING', (0,0), (-1,-1), 10),
                ]))
                card_tables.append(t_box)
                
            # Layout cards in 2-column table if 4 cards, else 1 column
            if len(card_tables) >= 4:
                grid_data = [
                    [card_tables[0], card_tables[1]],
                    [card_tables[2], card_tables[3]]
                ]
                grid = Table(grid_data, colWidths=[355, 355])
                grid.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ]))
                story.append(grid)
            else:
                for c_t in card_tables:
                    story.append(c_t)
                    story.append(Spacer(1, 6))
                    
        if "highlight" in slide:
            story.append(Spacer(1, 8))
            hl_p = Paragraph(slide["highlight"], highlight_style)
            hl_table = Table([[hl_p]], colWidths=[710])
            hl_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
                ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#10B981")),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('LEFTPADDING', (0,0), (-1,-1), 12),
                ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ]))
            story.append(hl_table)
            
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF generated successfully at:", PDF_PATH)

if __name__ == "__main__":
    create_pdf()
