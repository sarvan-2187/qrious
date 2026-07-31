Build a hackathon pitch deck for Qrious, an AI quantum computing education
platform, for Quant-A-Thon judges (quantum-literate audience, 8-12 min pitch).
Pull technical depth from the provided sources — don't ask me for it. You
decide slide count, layout, visuals, and pacing; I'm only giving you the
required beats and the tone, not a template.

Tone: confident and impressive. This is a sales pitch, not an engineering
retrospective — lead with strengths, capabilities, and what makes this
platform genuinely impressive. Do not surface caveats, limitations, risks,
tradeoffs, "not yet done," fallback behavior, or honesty-about-gaps framing
anywhere in the deck. If a source material discusses a limitation alongside
a strength, extract only the strength.

Required beats, in roughly this order:
1. Problem: quantum computing education is stuck between dry math and toy
   simulators with no real hardware path.
2. Qrious in one line: visualize -> code -> simulate -> run on real hardware,
   AI-tutored and gamified end to end.
3. System architecture: one API, three purpose-isolated Docker microservices
   (explain WHY each is isolated, not just that they exist), six-provider
   failover AI gateway.
4. Learning experience surface: roadmap, 3D Bloch sphere, gate playground on
   real Qiskit Aer, algorithm explorer, gamification/analytics.
5. AI content suite (qStudio): 9 output types, plus the RAG source-chat
   pipeline — call out hybrid retrieval + enforced citations specifically.
6. qBook: real ipykernel code execution, not a sandboxed pretend interpreter.
7. QRoute: one circuit, four real hardware vendors.
8. Headline feature — QAOA learning-path optimizer: state the 2^93 problem
   and the two-stage classical-filter-then-quantum design as a genuinely
   novel piece of engineering — a real quantum algorithm solving a real,
   functional problem inside the product itself, not a teaching toy.
9. Close: a fast-fire capability summary (multi-vendor hardware, multi-
   provider AI resilience, real code execution, real quantum optimization)
   that lands the platform as production-grade, not a weekend prototype.

Visual direction: one idea per slide, technical diagrams simplified for a
stage (not dense docs-style flowcharts), a real screenshot/demo placeholder
where it strengthens a claim, consistent dark quantum/circuit visual motif.
Judges should leave remembering 2-3 specific impressive technical details,
not a feature-bullet wall.

Do not include any limitations, caveats, risks, or "future work" content in
the slides.
