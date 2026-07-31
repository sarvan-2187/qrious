import asyncio
from database import connect_to_mongo, get_db

mapping = {
    "General QAOA": "quantum-approximate-optimization-algorithm-qaoa",
    "Amplitude Estimation (for risk)": "quantum-amplitude-estimation",
    "Amplitude Estimation": "quantum-amplitude-estimation",
    "Grover's Search": "grover-s-search-algorithm",
    "Grover's Algorithm": "grover-s-search-algorithm",
    "Unifies Grover": "grover-s-search-algorithm",
    "Grover's Search Reference: \"Deterministic Quantum Search for Arbitrary Initial Success Probabilities\"  Mishra": "grover-s-search-algorithm",
    "Deutsch": "deutsch-algorithm",
    "Deutsch-Jozsa": "deutsch-jozsa-algorithm",
    "Bernstein-Vazirani": "bernstein-vazirani-algorithm",
    "QPE": "quantum-phase-estimation-qpe",
    "Quantum Phase Estimation": "quantum-phase-estimation-qpe",
    "HHL": "harrow-hassidim-lloyd-hhl-algorithm",
    "VQE": "variational-quantum-eigensolver-vqe",
    "VQE Ansatz preparation": "variational-quantum-eigensolver-vqe",
    "VQE (Alternative)": "variational-quantum-eigensolver-vqe",
    "QAOA": "quantum-approximate-optimization-algorithm-qaoa",
    "VQC": "variational-quantum-classifier-vqc",
    "QNN": "quantum-neural-network-qnn",
    "QSVM": "quantum-support-vector-machine-qsvm",
    "Quantum Support Vector Machines": "quantum-support-vector-machine-qsvm",
    "Quantum K-Means": "quantum-k-means-clustering",
    "QKE": "quantum-kernel-estimation",
    "QPCA": "quantum-principal-component-analysis-qpca",
    "QKNN": "quantum-k-nearest-neighbors-qknn",
    "Quantum Walks": "quantum-walks-1-dimensional",
    "Monte Carlo Simulation": "quantum-amplitude-estimation",
    "Monte Carlo Simulations": "quantum-amplitude-estimation",
    "Shor": "shor-s-algorithm",
    "Shor's Algorithm (Order Finding)": "shor-s-algorithm",
    "Shor's Code": "shor-s-nine-qubit-code",
    "Steane Code": "steane-seven-qubit-code",
    "Toric Code": "surface-code",
    "Repetition Code": "three-qubit-bit-flip-repetition-code",
    "Phase-Flip Code": "three-qubit-phase-flip-repetition-code",
    "Quantum Private Comparison": "quantum-private-comparison-qpc-socialist-millionaire-problem",
    "BB84": "quantum-random-number-generation-qrng", # Proxy
    "Quantum Error Correction": "surface-code",
    "Quantum Error Correction state injection": "surface-code",
    "Quantum Secret Sharing": "entanglement-swapping",
    "Quantum Cryptography": "quantum-random-number-generation-qrng",
    "PageRank": "quantum-walks-1-dimensional",
    "Quantum PageRank": "quantum-walks-1-dimensional",
    "Spatial Search": "grover-s-search-algorithm",
    "Trotterization": "trotter-suzuki-time-evolution-trotterization",
    "Hamiltonian Simulation": "hamiltonian-simulation-parent-topic",
    "Simulation": "hamiltonian-simulation-parent-topic",
    "N-Qubit Teleportation": "n-qubit-quantum-teleportation",
    "Quantum Repeaters": "entanglement-swapping",
    "QSVT": "quantum-singular-value-transformation-qsvt",
    "QSP": "quantum-signal-processing-qsp",
    "State Preparation": "quantum-state-preparation",
    "QML Algorithms": "quantum-perceptron"
}

remove_strings = [
    "Anonymous Voting Reference: Inspired by the research of Satish Kumar",
    "Anirban Pathak",
    "and others in quantum anonymous protocols.",
    "Balasubramanyam & Raghava (arXiv:2505.15512",
    "May 2025)"
]

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find().to_list(100)
    
    name_to_slug = {a['name'].lower(): a['slug'] for a in algs}
    slugs = {a['slug'] for a in algs}
    
    updated_count = 0
    
    for a in algs:
        quick_info = a.get('quickInfo', {})
        related = quick_info.get('relatedAlgorithms', [])
        
        new_related = []
        changed = False
        
        for r in related:
            if r in remove_strings:
                changed = True
                continue
                
            if r in slugs or r.lower() in name_to_slug:
                new_related.append(r)
                continue
                
            if r in mapping:
                new_related.append(mapping[r])
                changed = True
            else:
                # Keep it as is (will show as NOT FOUND)
                new_related.append(r)
                
        # Remove duplicates
        unique_related = []
        for x in new_related:
            if x not in unique_related:
                unique_related.append(x)
                
        if len(unique_related) != len(related):
            changed = True
            
        if changed:
            quick_info['relatedAlgorithms'] = unique_related
            await db.algorithm_catalog.update_one(
                {'_id': a['_id']},
                {'$set': {'quickInfo': quick_info}}
            )
            updated_count += 1
            print(f"Updated {a['slug']}: {related} -> {unique_related}")
            
    print(f"Total updated: {updated_count}")

if __name__ == "__main__":
    asyncio.run(run())
