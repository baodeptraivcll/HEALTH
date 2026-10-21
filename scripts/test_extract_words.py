import unittest

from extract_words import merge_entries, parse_cells, source_ipa


class ExtractionTests(unittest.TestCase):
    def test_multiline_cells_and_multiple_parts_of_speech(self):
        word = parse_cells(['3', 'assurance (n, v)', '/əˈʃʊr.əns/', 'sự đảm bảo (n)\nđảm bảo (v)'])
        self.assertEqual(word['word'], 'assurance')
        self.assertEqual(word['pos'], 'n, v')
        self.assertEqual(word['meaning_vi'], 'sự đảm bảo (n) đảm bảo (v)')
        self.assertIsNone(word['example'])

    def test_missing_information_remains_null(self):
        word = parse_cells(['204', 'carrier', '', 'người vận chuyển'])
        self.assertIsNone(word['pos'])
        self.assertIsNone(word['ipa'])

    def test_source_abbreviation_normalization(self):
        self.assertEqual(parse_cells(['140', 'hesitant (a)', '/ˈhez.ɪ.tənt/', 'lưỡng lự'])['pos'], 'adj')

    def test_malformed_ipa_is_not_silently_corrected(self):
        self.assertEqual(parse_cells(['185', 'expand (v)', '/ɪkˈspænd', 'mở rộng'])['ipa'], '/ɪkˈspænd')

    def test_ipa_combining_mark_follows_pdf_text_order(self):
        cells = ['76', 'initiative (n)', '/ɪˈnɪʃ.ə.tɪ̬ v/', 'sáng kiến']
        self.assertEqual(source_ipa('76 initiative (n) /ɪˈnɪʃ.ə.t̬ɪv/ sáng kiến', cells), '/ɪˈnɪʃ.ə.t̬ɪv/')

    def test_cross_check_rejects_different_ipa_characters(self):
        with self.assertRaises(ValueError):
            source_ipa('1 word (n) /wrong/ nghĩa', ['1', 'word (n)', '/different/', 'nghĩa'])

    def test_cross_check_preserves_missing_ipa(self):
        self.assertIsNone(source_ipa('1 word (n) nghĩa', ['1', 'word (n)', '', 'nghĩa']))

    def test_merge_preserves_both_senses_and_topics(self):
        entries = []
        for i, (pos, meaning, topic) in enumerate([('adj', 'nhanh, hỏa tốc', 'THƯ TÍN'), ('v', 'biểu lộ, bày tỏ', 'BẢO TÀNG')], 1):
            entry = parse_cells([str(i), f'express ({pos})', '/ɪkˈspres/', meaning])
            entries.append(dict(entry, topic=topic, order_index=i, source_number=i, page=i))
        words, duplicates = merge_entries(entries)
        self.assertEqual(len(words), 1)
        self.assertEqual(words[0]['pos'], 'adj, v')
        self.assertEqual(words[0]['meaning_vi'], 'nhanh, hỏa tốc | biểu lộ, bày tỏ')
        self.assertEqual(words[0]['topic'], 'THƯ TÍN | BẢO TÀNG')
        self.assertEqual(len(duplicates[0]['occurrences']), 2)


if __name__ == '__main__':
    unittest.main()
