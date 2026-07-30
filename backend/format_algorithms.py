import json
import re

def process_latex(text: str) -> str:
    """
    Manually convert ASCII-style quantum/math notation into LaTeX.
    """
    if not text: return text
    
    # Kets (e.g., |0>, |1>, |psi>, |00>)
    text = re.sub(r'\|([a-zA-Z0-9\+\-]+)\>', r'$|\g<1>\\rangle$', text)
    text = re.sub(r'\|([a-zA-Z0-9\+\-]+)⟩', r'$|\g<1>\\rangle$', text)
    
    # Bras (e.g., <0|, <1|)
    text = re.sub(r'\<([a-zA-Z0-9\+\-]+)\|', r'$\\langle\g<1>|$', text)
    text = re.sub(r'⟨([a-zA-Z0-9\+\-]+)\|', r'$\\langle\g<1>|$', text)
    
    # Specific common terms
    text = text.replace('1/√2', r'$\frac{1}{\sqrt{2}}$')
    text = text.replace('2^n', r'$2^n$')
    text = text.replace('O(sqrt(N))', r'$\mathcal{O}(\sqrt{N})$')
    text = text.replace('O(N)', r'$\mathcal{O}(N)$')
    text = text.replace('O(1)', r'$\mathcal{O}(1)$')
    text = text.replace('O(n^2)', r'$\mathcal{O}(n^2)$')
    text = text.replace('O(n^3)', r'$\mathcal{O}(n^3)$')
    text = text.replace('O(logN)', r'$\mathcal{O}(\log N)$')
    
    # State symbol fix (e.g. |\psi\rangle)
    text = text.replace('$|psi\\rangle$', r'$|\psi\rangle$')
    text = text.replace('$|phi\\rangle$', r'$|\phi\rangle$')
    text = text.replace('$|Phi^+\\rangle$', r'$|\Phi^+\rangle$')

    # Basic tensor product
    text = text.replace(' ⊗ ', r' $\otimes$ ')
    
    # Square root
    text = re.sub(r'sqrt\((.*?)\)', r'$\\sqrt{\g<1>}$', text)

    return text

def main():
    file_path = 'parsed_algorithms.json'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        algorithms = json.load(f)

    # We only care about formatting the 3 UNLOCKED algorithms per level
    # "Coming soon" have no content or are locked, so we skip them.
    
    count = 0
    for algo in algorithms:
        if algo.get('status') == 'locked':
            continue
            
        content = algo.get('content', {})
        if not content:
            continue
            
        print(f"Formatting math for {algo.get('slug')}...")
        count += 1
        
        # Format the math in every field
        for key, value in content.items():
            if isinstance(value, str):
                content[key] = process_latex(value)
                
        # Completely remove circuit explanation if it contains ASCII
        if content.get('circuitExplanation'):
            circ_exp = content['circuitExplanation']
            # Basic heuristic to remove ASCII circuits
            if 'q0 |0>' in circ_exp or 'q1 |0>' in circ_exp or 'q_0:' in circ_exp or '---' in circ_exp:
                # Keep text before the ASCII circuit, usually it starts with some introductory text
                lines = circ_exp.split('\n')
                new_lines = []
                for line in lines:
                    if '---' in line or 'q0' in line or 'q1' in line or 'q_0' in line:
                        continue
                    new_lines.append(line)
                content['circuitExplanation'] = '\n'.join(new_lines).strip()
                
    print(f"\nFormatted {count} algorithms.")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(algorithms, f, indent=4)
        
    print("Saved to parsed_algorithms.json")

if __name__ == '__main__':
    main()
