import json
import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

def fix_try_it(text):
    if not text:
        return text
    
    # Replace 'Experiment X:' with '\n- **Experiment X**: '
    # If it is already separated by newlines, we can just replace the prefix.
    # To avoid double newlines, we strip existing newlines before replacing.
    
    # Simple regex to find "Experiment N:" or "Experiment N (...):" and format it
    fixed = re.sub(r'Experiment (\d+)(?:\s*\(([^)]+)\))?:', r'\n- **Experiment \1\g<2>:** ', text)
    # The \g<2> might not work if it's empty, so let's use a simpler one.
    
    # First, handle "Experiment N:"
    fixed = re.sub(r'(?<!\*\*)Experiment (\d+):', r'\n- **Experiment \1**:', fixed)
    # Then handle "Experiment N (Some text):"
    fixed = re.sub(r'(?<!\*\*)Experiment (\d+)\s*\(([^)]+)\):', r'\n- **Experiment \1 (\2)**:', fixed)
    
    # Remove any extra leading newlines
    fixed = fixed.strip()
    return fixed

def fix_math(text):
    if not text:
        return text
    
    # Ensure there is a blank line before and after $$ blocks
    # Replace "\n$$" with "\n\n$$" (unless there is already a blank line)
    fixed = re.sub(r'(?<!\n)\n\$\$', r'\n\n$$', text)
    fixed = re.sub(r'\$\$\n(?!\n)', r'$$\n\n', fixed)
    return fixed

def main():
    with open('parsed_algorithms.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for alg in data:
        # Fix GHZ and Bell State circuits
        if alg['id'] == 'ghz-state':
            alg['content']['circuitExplanation'] = """```text
q0: |0⟩ ─ H ─ ■ ───── M
              |
q1: |0⟩ ───── X ─ ■ ─ M
                  |
q2: |0⟩ ───────── X ─ M
```

Alternatively, $q_0$ can act as the control for both CNOTs (a star/fan-out topology), which is mathematically identical but may be compiled differently on physical hardware depending on qubit connectivity."""

        elif alg['id'] == 'bell-state':
            alg['content']['circuitExplanation'] = """```text
q0: |0⟩ ─ H ─ ■ ── M
              |
q1: |0⟩ ───── X ── M
```

The H (Hadamard) gate creates the superposition on the top qubit. The vertical line represents the CNOT gate. It entangles the two wires."""

        elif alg['id'] == 'swap-test':
             alg['content']['circuitExplanation'] = """```text
Ancilla: |0⟩ ─ H ─ ■ ─ H ─ M
                   |
State 1: |ψ⟩ ───── X ─────
                   |
State 2: |φ⟩ ───── X ─────
```

The ancilla is split into |0⟩ and |1⟩. If the ancilla is |0⟩, nothing happens (the states remain |ψ⟩|φ⟩). If the ancilla is |1⟩, the states are swapped (|φ⟩|ψ⟩). The final H gate interferes these two histories. If |ψ⟩ and |φ⟩ were identical, swapping them does absolutely nothing, the interference is perfectly constructive, and the ancilla returns definitively to |0⟩."""
             
        # Global formatting
        if 'content' in alg:
            alg['content']['mathematicalExplanation'] = fix_math(alg['content'].get('mathematicalExplanation', ''))
            alg['content']['tryItYourself'] = fix_try_it(alg['content'].get('tryItYourself', ''))

    with open('parsed_algorithms.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    print("Updating MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client.qrious_db
    collection = db.algorithm_catalog
    
    for alg in data:
        collection.update_one({'id': alg['id']}, {'$set': {'content': alg['content']}})
        
    print("Update complete.")

if __name__ == '__main__':
    main()
