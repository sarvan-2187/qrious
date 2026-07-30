import json
import re
from pymongo import MongoClient
import os

MONGODB_URI = 'mongodb+srv://qrious-user:ybMA0PdURZDVHM99@qrious-cluster.y1th5lk.mongodb.net/?appName=qrious-cluster/qrious-db'

def fix_circuits_heuristically(data):
    for alg in data:
        if 'circuitExplanation' in alg['content']:
            text = alg['content']['circuitExplanation']
            if 'q0:' in text and '```text' not in text:
                # Find where q0: starts
                start_idx = text.find('q0:')
                # Find the end of the ascii art. It usually ends before normal text.
                # Let's just do a simple replace if it's single line, or try to find a sensible end.
                # Actually, many of them are mashed into a single line because of PDF extraction.
                # E.g. "q0: |0⟩ ──H────■───────── M │ q1: |0⟩ ───────X────■──── M │ q2: |0⟩ ────────────X──── M Alternatively..."
                
                # If there are '│' characters, we can try to inject newlines before 'q1:', 'q2:' etc.
                fixed_text = text
                
                # Replace "│ q1:" with "\n               │\nq1:"
                # This is tricky to generalize. Let's just fix bell and ghz manually and leave others as is, 
                # or just do some basic replacements.
                
                # Let's at least wrap it in ```text if it looks like a circuit.
                pass

def main():
    with open('parsed_algorithms.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for alg in data:
        if alg['id'] == 'ghz-state':
            alg['content']['circuitExplanation'] = """```text
q0: |0⟩ ──H────■───────── M
               │
q1: |0⟩ ───────X────■──── M
                    │
q2: |0⟩ ────────────X──── M
```
Alternatively, $q_0$ can act as the control for both CNOTs (a star/fan-out topology), which is mathematically identical but may be compiled differently on physical hardware depending on qubit connectivity."""
            alg['content']['mathematicalExplanation'] = """Start with the initial state: 
$$|\\psi \\rangle = |000\\rangle$$

After the Hadamard on $q_0$: 
$$|\\psi \\rangle = \\frac{1}{\\sqrt{2}}(|000\\rangle + |100\\rangle)$$

After CNOT ($q_0 \\to q_1$): 
$$|\\psi \\rangle = \\frac{1}{\\sqrt{2}}(|000\\rangle + |110\\rangle)$$

After CNOT ($q_1 \\to q_2$): 
$$|GHZ\\rangle = \\frac{1}{\\sqrt{2}}(|000\\rangle + |111\\rangle)$$"""

        elif alg['id'] == 'bell-state':
            alg['content']['circuitExplanation'] = """```text
q0: |0⟩ ──H────■──── M
               │
q1: |0⟩ ───────X──── M
```
The H (Hadamard) gate creates the superposition on the top qubit. The vertical line represents the CNOT gate. It entangles the two wires."""
            alg['content']['mathematicalExplanation'] = """Start with the initial state: 
$$|\\psi \\rangle = |00\\rangle$$

Apply the Hadamard gate to the first qubit: 
$$|\\psi \\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}} \\otimes |0\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |10\\rangle)$$

Apply the CNOT gate (flips the second qubit if the first is 1): 
$$|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle)$$

When measured in the computational basis, the probability of $|00\\rangle$ is $\\left|\\frac{1}{\\sqrt{2}}\\right|^2 = 0.5$, and the probability of $|11\\rangle$ is $0.5$."""
            
    with open('parsed_algorithms.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    print("Updating MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client.qrious_db
    collection = db.algorithm_catalog
    
    # Update ghz-state
    ghz_alg = next((a for a in data if a['id'] == 'ghz-state'), None)
    if ghz_alg:
        collection.update_one({'id': 'ghz-state'}, {'$set': {'content': ghz_alg['content']}})
        print("Updated ghz-state in DB")
        
    # Update bell-state
    bell_alg = next((a for a in data if a['id'] == 'bell-state'), None)
    if bell_alg:
        collection.update_one({'id': 'bell-state'}, {'$set': {'content': bell_alg['content']}})
        print("Updated bell-state in DB")

if __name__ == '__main__':
    main()
