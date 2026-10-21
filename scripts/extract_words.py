"""Extract source cells without supplying missing vocabulary information.

Requires pdfplumber. Run from any working directory; outputs go to data/.
"""
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ('word', 'ipa', 'pos', 'meaning_vi', 'example', 'topic')


def compact(value):
    return re.sub(r'\s+', ' ', value or '').strip() or None


def parse_cells(cells):
    raw_word = compact(cells[1])
    if not raw_word:
        raise ValueError(f'Empty word: {cells!r}')
    match = re.fullmatch(r'(.+?)\s*\((n|v|adj|adv|a|prep|conj|pron)([\w, .]*)\)', raw_word)
    if match:
        word = match[1].strip()
        parts = [p.strip().rstrip('.') for p in (match[2] + match[3]).split(',')]
        if any(p not in ('n', 'v', 'adj', 'adv', 'a', 'prep', 'conj', 'pron') for p in parts):
            raise ValueError(f'Unknown part of speech: {raw_word}')
        pos = ', '.join('adj' if p == 'a' else p for p in parts)
    else:
        word, pos = raw_word, None
    return {'word': word, 'ipa': compact(cells[2]), 'pos': pos,
            'meaning_vi': compact(cells[3]), 'example': None}


def source_ipa(page_text, cells):
    """Use PDF text order for IPA: geometry sorting displaces combining marks."""
    start = re.search(r'(?m)^\s*' + re.escape(cells[0]) + r'\s+', page_text)
    if not start:
        raise ValueError(f'Cannot cross-check source row {cells[0]}')
    remaining = compact(page_text[start.end():])
    head, meaning = compact(cells[1]), compact(cells[3])
    if not remaining.startswith(head):
        raise ValueError(f'Word column differs between PDF readers: {cells[1]}')
    body = remaining[len(head):].lstrip()
    end = body.find(meaning)
    if end < 0:
        raise ValueError(f'Meaning column differs between PDF readers: {cells[1]}')
    ipa = compact(body[:end])
    if Counter(re.sub(r'\s', '', ipa or '')) != Counter(re.sub(r'\s', '', cells[2] or '')):
        raise ValueError(f'IPA characters differ between PDF readers: {cells[1]}')
    return ipa


def merge_entries(entries):
    grouped = defaultdict(list)
    for entry in entries:
        grouped[entry['word'].casefold()].append(entry)
    words = []
    duplicates = []
    for group in grouped.values():
        word = {}
        for field in FIELDS:
            values = list(dict.fromkeys(e[field] for e in group if e[field] is not None))
            if field == 'pos':
                values = list(dict.fromkeys(part for value in values for part in value.split(', ')))
                word[field] = ', '.join(values) or None
            else:
                word[field] = ' | '.join(values) or None
        word['order_index'] = len(words) + 1
        words.append(word)
        if len(group) > 1:
            duplicates.append({'word': word['word'], 'occurrences': [
                {key: e[key] for key in ('order_index', 'source_number', 'page', 'topic', 'pos', 'ipa', 'meaning_vi')}
                for e in group]})
    return words, duplicates


def extract(pdf_path):
    entries, topics, anomalies = [], [], []
    adjustments = []
    text_pages = [page.extract_text() for page in PdfReader(pdf_path).pages]
    current_topic = None
    with pdfplumber.open(pdf_path) as pdf:
        page_count = len(pdf.pages)
        for page_number, page in enumerate(pdf.pages, 1):
            lines = page.extract_text_lines()
            events = []
            for index, line in enumerate(lines):
                match = re.match(r'^Chủ đề (\d+)\.\s*(.*)', line['text'])
                if not match:
                    continue
                title = [match[2]]
                # Some topic titles wrap onto a second line above the table.
                for following in lines[index + 1:]:
                    if re.match(r'^(STT|HTTPS:|MS NHI|Chủ đề|\d+\s)', following['text']):
                        break
                    title.append(following['text'])
                topic = {'index': int(match[1]), 'title': compact(' '.join(title)), 'page': page_number}
                topics.append(topic)
                events.append((line['top'], 'topic', topic))
            for table in page.find_tables():
                rows = table.extract()
                # The page number footer also forms a table; only use vocabulary tables.
                if not any(len(row) == 4 and row[0] and row[0].strip().isdigit() for row in rows):
                    continue
                events.append((table.bbox[1], 'table', rows))
            for _, kind, value in sorted(events, key=lambda event: event[0]):
                if kind == 'topic':
                    current_topic = value
                    continue
                for cells in value:
                    if cells[0] == 'STT':
                        continue
                    if len(cells) != 4 or not cells[0] or not cells[0].strip().isdigit():
                        if any(compact(cell) for cell in cells):
                            raise ValueError(f'Unrecognized vocabulary row on page {page_number}: {cells!r}')
                        continue
                    if current_topic is None:
                        raise ValueError('Vocabulary appears before its topic')
                    entry = parse_cells(cells)
                    ipa = source_ipa(text_pages[page_number - 1], cells)
                    if ipa != entry['ipa']:
                        adjustments.append({'word': entry['word'], 'page': page_number,
                                            'field': 'ipa', 'table_text': entry['ipa'], 'pdf_text_order': ipa})
                    entry['ipa'] = ipa
                    entry.update(topic=current_topic['title'], topic_index=current_topic['index'],
                                 order_index=len(entries) + 1, source_number=int(cells[0]), page=page_number,
                                 source_cells=cells)
                    entries.append(entry)
                    if entry['source_number'] != entry['order_index']:
                        anomalies.append({'kind': 'source_number', 'word': entry['word'], 'page': page_number,
                                          'printed': entry['source_number'], 'position': entry['order_index']})
                    ipa = entry['ipa']
                    if ipa and not re.fullmatch(r'/[^/]+/', ipa):
                        anomalies.append({'kind': 'ipa_format', 'word': entry['word'], 'page': page_number, 'raw': ipa})
                    if re.search(r'\(a\)$', compact(cells[1])):
                        anomalies.append({'kind': 'pos_normalization', 'word': entry['word'], 'page': page_number, 'from': 'a', 'to': 'adj'})
    words, duplicates = merge_entries(entries)
    missing = [{'word': e['word'], 'page': e['page'], 'source_order_index': e['order_index'],
                'fields': [field for field in FIELDS if e[field] is None]}
               for e in entries if any(e[field] is None for field in FIELDS)]
    report = {
        'source_file': 'data/toeic600.pdf', 'source_sha256': hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
        'page_count': page_count, 'source_entries': len(entries), 'unique_words': len(words),
        'required_unique_words': 600, 'shortfall': max(0, 600 - len(words)),
        'ready_for_seed': len(words) == 600 and not missing and not anomalies,
        'topic_count': len(topics), 'topics': topics,
        'missing_counts_source': {field: sum(e[field] is None for e in entries) for field in FIELDS},
        'missing_counts_unique': {field: sum(e[field] is None for e in words) for field in FIELDS},
        'duplicates': duplicates, 'anomalies': anomalies, 'missing_fields': missing,
        'extraction_adjustments': adjustments,
        'rules': ['No generated translations, examples, IPA or inferred parts of speech.',
                  'Whitespace is collapsed; source a is normalized to adj.',
                  'Missing source values are null. Malformed IPA is retained and flagged.',
                  'IPA character order is cross-checked with pypdf; original table cells are preserved.',
                  'Repeated words are merged in first-occurrence order; distinct source values use |; parts of speech use commas.',
                  'words-source.json preserves all 600 source rows, senses, topics and page references.'],
    }
    return words, entries, report


def main():
    data = ROOT / 'data'
    words, entries, report = extract(data / 'toeic600.pdf')
    if len(entries) != 600 or len(report['topics']) != 50:
        raise ValueError('Unexpected source structure; review extraction before writing outputs')
    for name, value in [('words.json', words), ('words-source.json', entries), ('words-report.json', report)]:
        (data / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f"Extracted {len(entries)} source rows; {len(words)} unique words; {report['shortfall']} short of 600 unique words.")
    print('Missing source values:', report['missing_counts_source'])
    print('Duplicates:', ', '.join(d['word'] for d in report['duplicates']))
    print('Source anomalies:', len(report['anomalies']))
    print('Data is NOT ready for the requested 600-unique-word seed.' if not report['ready_for_seed'] else 'Data ready.')


if __name__ == '__main__':
    main()
