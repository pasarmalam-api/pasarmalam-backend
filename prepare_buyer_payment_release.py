"""Build a backend patch without including unrelated unfinished changes."""
import ast
import difflib
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
baseline = subprocess.check_output(['git', 'show', 'HEAD:server.py'], cwd=root).decode('utf-8')
working = (root / 'server.py').read_text(encoding='utf-8')
old_lines, new_lines = baseline.splitlines(True), working.splitlines(True)


def definitions(source):
    tree = ast.parse(source)
    top = {node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)}
    handler = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == 'Handler')
    methods = {node.name: node for node in handler.body if isinstance(node, ast.FunctionDef)}
    return top, methods


old_top, old_methods = definitions(baseline)
new_top, new_methods = definitions(working)
replacements = []
for old, new, names in [
    (old_top, new_top, ('billplz_auth_header', 'post_billplz', 'get_billplz') + (('billplz_profile',) if 'billplz_profile' in old_top else ())),
    (old_methods, new_methods, ('create_billplz_payment', 'billplz_callback', 'verify_billplz_bill') + (('payment_options',) if 'payment_options' in old_methods else ())),
]:
    for name in names:
        before, after = old[name], new[name]
        text = ''.join(new_lines[after.lineno - 1:after.end_lineno])
        added = 'billplz_profile' if name == 'billplz_auth_header' else 'payment_options' if name == 'create_billplz_payment' else None
        if added and added not in old:
            node = new[added]
            text = ''.join(new_lines[node.lineno - 1:node.end_lineno]) + '\n\n' + text
        replacements.append((before.lineno - 1, before.end_lineno, text))
for start, end, text in sorted(replacements, reverse=True):
    old_lines[start:end] = [text]
reviewed = ''.join(old_lines)
anchor = 'BILLPLZ_X_SIGNATURE_KEY = os.environ.get("BILLPLZ_X_SIGNATURE_KEY", "")\n'
if 'BILLPLZ_CARD_API_KEY = ' not in reviewed:
    reviewed = reviewed.replace(anchor, anchor + ''.join(line for line in new_lines if line.startswith(('BILLPLZ_CARD_API_KEY = ', 'BILLPLZ_CARD_COLLECTION_ID = ', 'BILLPLZ_CARD_X_SIGNATURE_KEY = '))), 1)
route = '                "/api/payments/billplz/status": lambda: self.billplz_status(query),\n'
if '"/api/payments/options"' not in reviewed:
    reviewed = reviewed.replace(route, route + '                "/api/payments/options": self.payment_options,\n', 1)
ast.parse(reviewed)
patch = ''.join(difflib.unified_diff(baseline.splitlines(True), reviewed.splitlines(True), fromfile='a/server.py', tofile='b/server.py'))
assert '+import promotions' not in patch and '+    def admin_promotions' not in patch
(root / 'buyer-payment-backend.patch').write_text(patch, encoding='utf-8', newline='\n')
(root / 'reviewed-payment-server.py').write_text(reviewed, encoding='utf-8', newline='\n')
print('Prepared reviewed Billplz-only backend patch. Unrelated backend work excluded.')
