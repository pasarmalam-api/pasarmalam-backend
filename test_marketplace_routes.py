"""Audit local page destinations and required assets without submitting forms."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import re

ROOT = Path(__file__).parent / 'landing-site-v2'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = []
        self.inline = []
        self.scripts = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        for name in ('href', 'src'):
            if attrs.get(name):
                self.references.append((tag, attrs[name]))
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])
        if attrs.get('onclick'):
            self.inline.append(attrs['onclick'])


def audit():
    results = []
    for folder in ('buyer', 'seller'):
        for path in sorted((ROOT / folder).glob('*.html')):
            content = path.read_text(encoding='utf-8-sig')
            page = Page()
            page.feed(content)
            missing = []
            references = page.references + [('navigation', value) for value in re.findall(
                r'''(?:location(?:\.href)?\s*=|location\.(?:replace|assign)\()\s*['"]([^'"]+)['"]''', content)]
            for tag, reference in references:
                url = urlsplit(reference)
                if url.scheme or url.netloc or not url.path or '${' in reference:
                    continue
                target = ROOT / unquote(url.path.lstrip('/')) if url.path.startswith('/') else path.parent / unquote(url.path)
                if not target.exists():
                    missing.append({'type': tag, 'reference': reference})
            duplicates = sorted({name for name in page.ids if page.ids.count(name) > 1})
            expected = 'buyer-ui.js' if folder == 'buyer' else 'seller-session.js'
            results.append({'page': path.relative_to(ROOT).as_posix(), 'missing': missing,
                            'duplicate_ids': duplicates,
                            'shared_session': any(urlsplit(src).path.endswith(expected) for src in page.scripts),
                            'language_script': any('badges.js' in src or 'seller-entry-language.js' in src for src in page.scripts)})
    return results


if __name__ == '__main__':
    results = audit()
    print(json.dumps({'pages': len(results), 'findings': [r for r in results if r['missing'] or r['duplicate_ids'] or not r['shared_session'] or not r['language_script']]}, indent=2))
