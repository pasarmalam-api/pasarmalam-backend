"""Package committed marketplace files for the released Android host."""
import argparse
import difflib
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--reviewed-layout', action='store_true')
parser.add_argument('--seller-root', action='store_true')
parser.add_argument('--cache-patch', action='store_true')
args = parser.parse_args()
layout_files = {'buyer/index.html', 'buyer/buyer-ui.js', 'buyer/badges.js', 'buyer/checkout.html', 'buyer/checkout-payment-methods.js', 'seller/seller-session.js', 'workspace-ui.css'}
revision = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip()
paths = subprocess.check_output(
    ['git', 'ls-tree', '-r', '--name-only', 'HEAD', 'landing-site-v2/'], cwd=ROOT, text=True
).splitlines()
if args.cache_patch:
    chunks = []
    for path in paths:
        if not (path.startswith('landing-site-v2/seller/') and path.endswith('.html')):
            continue
        original = subprocess.check_output(['git', 'show', 'HEAD:' + path], cwd=ROOT).decode('utf-8')
        updated = original.replace('seller-session.js?v=page-audit20261111', 'seller-session.js?v=compact-home20261117')
        chunks.extend(difflib.unified_diff(original.splitlines(True), updated.splitlines(True), fromfile='a/' + path, tofile='b/' + path))
    output = ROOT / 'compact-seller-cache.patch'
    output.write_text(''.join(chunks), encoding='utf-8', newline='\n')
    print(output)
    raise SystemExit(0)
shared = {'workspace-ui.css', 'store-types.js', 'seller-entry-language.js', 'selling-types.js', 'selling-types.css'}
entries = {}
for path in paths:
    relative = path.removeprefix('landing-site-v2/')
    if not (relative.startswith(('buyer/', 'seller/')) or relative in shared):
        continue
    data = subprocess.check_output(['git', 'show', 'HEAD:' + path], cwd=ROOT)
    if args.reviewed_layout:
        if relative in layout_files:
            data = (ROOT / path).read_bytes()
        elif relative.startswith('seller/') and relative.endswith('.html'):
            data = data.replace(b'seller-session.js?v=page-audit20261111', b'seller-session.js?v=compact-home20261117')
    entries[relative] = data
    prefix = 'seller/' if args.seller_root else 'buyer/'
    if relative.startswith(prefix):
        entries[relative.removeprefix(prefix)] = data

assert any(marker in entries['buyer/index.html'] for marker in (b'reference-home20261117', b'compact-home20261117', b'home-fit20261117'))
assert b'--buyer-nav-height' in entries['workspace-ui.css']
assert all(name in entries for name in ['index.html', 'login.html', 'buyer/checkout.html', 'buyer/become-seller.html', 'seller/register.html'])
host = 'seller-host' if args.seller_root else 'android-host'
suffix = '-compact' if args.reviewed_layout else ''
if args.reviewed_layout and b'reference-home20261117' in entries['buyer/index.html']:
    suffix = '-reference'
output = ROOT / 'release-zips' / (host + '-' + revision + suffix + '.zip')
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, data in sorted(entries.items()):
        archive.writestr(name, data)
print(f'{output}\n{len(entries)} files; {output.stat().st_size} bytes; reviewed layout overrides: {args.reviewed_layout}')
