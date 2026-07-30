import ast
import subprocess
import tempfile
import os
import sys

FORBIDDEN_IMPORTS = {'os', 'sys', 'subprocess', 'urllib', 'urllib2', 'requests', 'socket', 'builtins', 'shutil'}
FORBIDDEN_CALLS = {'open', 'eval', 'exec', 'compile', '__import__'}

class ASTValidator(ast.NodeVisitor):
    def __init__(self):
        self.errors = []

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name.split('.')[0] in FORBIDDEN_IMPORTS:
                self.errors.append(f"Importing '{alias.name}' is blocked.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module and node.module.split('.')[0] in FORBIDDEN_IMPORTS:
            self.errors.append(f"Importing from '{node.module}' is blocked.")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_CALLS:
                self.errors.append(f"Calling built-in '{node.func.id}()' is blocked.")
        self.generic_visit(node)

class CodeExecutionService:
    def execute_code(self, source_code: str, timeout_seconds: int = 5):
        # 1. AST Validation
        try:
            tree = ast.parse(source_code)
        except SyntaxError as e:
            return {
                "stdout": "",
                "stderr": f"SyntaxError: {e.msg} at line {e.lineno}",
                "exit_code": 1
            }

        validator = ASTValidator()
        validator.visit(tree)
        if validator.errors:
            return {
                "stdout": "",
                "stderr": "Security Error:\n" + "\n".join(validator.errors),
                "exit_code": 1
            }

        # 2. Write code to temp file and run it
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode='w', encoding='utf-8') as f:
            f.write(source_code)
            temp_path = f.name
            
        try:
            # We must use sys.executable to use the same venv
            result = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )
            stdout = result.stdout
            stderr = result.stderr
            exit_code = result.returncode
        except subprocess.TimeoutExpired as e:
            stdout = e.stdout.decode('utf-8') if e.stdout else ""
            stderr = f"Execution Timeout: Code took too long to run (Limit: {timeout_seconds}s)"
            exit_code = 124
        except Exception as e:
            stdout = ""
            stderr = f"Execution failed: {str(e)}"
            exit_code = 1
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        return {
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": exit_code
        }

code_execution_service = CodeExecutionService()
