#!/usr/bin/env python3
"""Real ASCII Magic MCP exports. Run with Hermes' managed Python runtime.
Requires authenticated ascii-magic MCP in the active Hermes profile, plus Pillow.
No auth configuration is modified and no paid styles/effects are requested.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'res/images/effects'
SOURCE = ROOT / 'res/images/profile-transparent.webp'
STYLES = [('dither', 'Dither', 'dither', 5), ('dots', 'Dots', 'dots', 13),
          ('voxel', 'Voxel', '3d', 14), ('characters', 'Characters', 'characters', 16),
          ('lines', 'Lines', 'lines', 13), ('cross', 'Cross', 'cross', 14)]
IVORY = (246, 244, 238)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': 'portfolio-asset-export/1.0'})
    with urllib.request.urlopen(req, timeout=180) as response:
        path.write_bytes(response.read())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--finish-only', action='store_true', help='Finish previously downloaded original PNGs without calling service')
    args = parser.parse_args()
    if not args.finish_only:
        sys.path.insert(0, str(Path(os.environ.get('HERMES_AGENT_ROOT', Path.home() / '.hermes/hermes-agent'))))
        import hermes_bootstrap  # Load Hermes managed dependency environment.
    from PIL import Image, ImageDraw
    OUT.mkdir(parents=True, exist_ok=True)
    original = Image.open(SOURCE).convert('RGBA')
    source = Image.new('RGBA', original.size, IVORY + (255,))
    source.alpha_composite(original)
    upload_path = OUT / 'portrait-source-ivory.png'
    source.convert('RGB').save(upload_path)
    meta_path = OUT / 'service-records.json'
    records = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    for record in records.values():
        response = record.get('service_response', '')
        match = re.search(r'^Recipe: (.+)$', response, re.M)
        value = match.group(1) if match else None
        record['recipe'] = value if value and '...' not in value and '*' not in value else None
    if records:
        meta_path.write_text(json.dumps(records, indent=2) + '\n')
    if not args.finish_only:
        home = Path(os.environ.get('HERMES_HOME', Path.home() / '.hermes'))
        sys.path.insert(0, str(Path(os.environ.get('HERMES_AGENT_ROOT', Path.home() / '.hermes/hermes-agent'))))
        import hermes_bootstrap  # noqa: F401
        from tools.mcp_tool_discovery import discover_mcp_tools
        from tools.registry import registry
        discover_mcp_tools(['ascii-magic'])
        def call(name, arguments):
            result = registry.dispatch('mcp__ascii_magic__' + name, arguments)
            if isinstance(result, str):
                result = json.loads(result)
            if result.get('error'):
                raise RuntimeError('MCP call failed: ' + name)
            text = result.get('result', '')
            if not isinstance(text, str):
                text = json.dumps(text)
            return text
        account = call('account_status', {})
        if 'Plan: Free' not in account:
            raise RuntimeError('This export helper requires confirmed Free plan; stopped without rendering.')
        styles = call('list_styles', {'free_only': True})
        (OUT / 'free-styles.txt').write_text(styles)
        for _, _, engine, _ in STYLES:
            if not re.search(r'^\s*' + re.escape(engine) + r'\s+.*\bfree\s+ok\b', styles, re.M):
                raise RuntimeError('Style not confirmed free and accessible: ' + engine)
        upload = call('create_upload', {})
        # Handle MCP upload response as either JSON or human-readable text.
        try:
            data, _ = json.JSONDecoder().raw_decode(upload.lstrip())
        except ValueError:
            data = {}
        if not isinstance(data, dict):
            data = {}
        upload_url = data.get('upload_url')
        image = data.get('image')
        if not upload_url or not image:
            # Print no upload token/URL; diagnose structure without secret values.
            raise RuntimeError('Upload response parser needs adaptation; response field names: ' + ','.join(data.keys()))
        import subprocess
        uploaded = subprocess.run(['curl', '-sS', '-f', '--max-time', '120', '-T', str(upload_path),
                                   '-H', 'content-type: image/png', upload_url], capture_output=True)
        if uploaded.returncode:
            raise RuntimeError('Upload failed via curl, exit code ' + str(uploaded.returncode))
        for slug, label, engine, cell in STYLES:
            params = {'image': image, 'style': engine, 'style_requested_by_user': True,
                      'font_size': cell, 'scale': 2, 'variant': 0,
                      'post_fx': {'charBloom': False, 'scanLines': False}}
            if slug == 'dither':
                params.update(palette='mono', algo='atkinson')
            text = call('stylize_image', params)
            links = re.findall(r'https://[^\s)]+\.png(?:\?[^\s)]*)?', text)
            if not links:
                raise RuntimeError('No downloadable PNG returned for ' + slug + ': ' + text[:250])
            raw = OUT / ('portrait-' + slug + '-service.png')
            download(links[0], raw)  # download before next render; service links expire
            with Image.open(raw) as check:
                check.verify()
            params.pop('image')
            recipe_match = re.search(r'^Recipe: (.+)$', text, re.M)
            recipe_value = recipe_match.group(1) if recipe_match else None
            if recipe_value and ('...' in recipe_value or '*' in recipe_value):
                recipe_value = None  # Hermes redacts long recipe payloads; do not save a broken code.
            records[slug] = {'provider': 'ASCII Magic', 'tool': 'stylize_image',
                             'engine_style_id': engine, 'parameters': params,
                             'service_response': re.sub(r'MEDIA:[^\s]+', '[preview cached outside repository]', text),
                             'recipe': recipe_value,
                             'downloaded_at': datetime.now(timezone.utc).isoformat(),
                             'raw_file': raw.name, 'raw_sha256': sha(raw)}
            meta_path.write_text(json.dumps(records, indent=2) + '\n')
            print('Downloaded real service export:', slug, flush=True)
    # Persist provenance without expiring service URLs or opaque recipe strings.
    for record in records.values():
        record['service_response'] = re.sub(r'https?://[^\s)]+', '[service URL omitted]', record.get('service_response', ''))
        record['service_response'] = re.sub(r'^Recipe:.*$', 'Recipe: [omitted]', record['service_response'], flags=re.M)
        record['recipe'] = None
    meta_path.write_text(json.dumps(records, indent=2) + '\n')
    entries = []
    sheet = Image.new('RGB', (1200, 850), IVORY)
    draw = ImageDraw.Draw(sheet)
    for i, (slug, label, engine, cell) in enumerate(STYLES):
        raw = OUT / ('portrait-' + slug + '-service.png')
        img = Image.open(raw).convert('RGB')
        # Preserve service colours and rendering; only restore source silhouette alpha.
        # Voxel extrusion may extend beyond the source, so retain its service rectangle.
        restored = slug != 'voxel'
        if restored:
            img = img.convert('RGBA')
            img.putalpha(original.getchannel('A').resize(img.size, Image.Resampling.LANCZOS))
        img.thumbnail((1500, 1500), Image.Resampling.LANCZOS)
        target = OUT / ('portrait-' + slug + '.webp')
        img.save(target, format='WEBP', quality=92, method=6)
        thumb = img.copy()
        thumb.thumbnail((370, 370), Image.Resampling.LANCZOS)
        x, y = (i % 3) * 400 + 15, (i // 3) * 425 + 38
        sheet.paste(thumb, (x, y), thumb.getchannel('A') if thumb.mode == 'RGBA' else None)
        draw.text((x, y-24), label + ' / service: ' + engine, fill=(30, 58, 44))
        entries.append({'id': slug, 'label': label, 'engine_style_id': engine,
                        'file': target.name, 'src': '/res/images/effects/' + target.name,
                        'raw_file': raw.name, 'width': img.width, 'height': img.height,
                        'motion_type': 'static', 'animated': False, 'static_fallback': target.name,
                        'alpha_restored': restored, 'sha256': sha(target),
                        'provenance': records[slug]})
    sheet.save(OUT / 'comparison-contact-sheet.jpg', quality=93)
    manifest = {'schema_version': 1, 'provider': 'ASCII Magic', 'plan': 'Free',
                'source': 'res/images/profile-transparent.webp', 'source_sha256': sha(SOURCE),
                'upload_background': '#f6f4ee', 'service_output': 'PNG stills',
                'animation_limitation': 'The exposed stylize_image MCP schema exports a PNG still and has no animation, timeline, frame, GIF, or video parameter. No service animation was generated or simulated.',
                'local_finishing': 'Original source alpha restored to five spatially aligned treatments, no recolouring. Voxel retains opaque service background to preserve extrusion. Downsampled to 1500px WebP.',
                'count': len(entries), 'effects': entries}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    assert len(entries) == 6
    print('Verified six images; manifest:', OUT / 'manifest.json')

if __name__ == '__main__':
    main()
