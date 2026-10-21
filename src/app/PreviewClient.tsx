'use client';
import { useState } from 'react';
import words from '../../data/words.json';
import examples from '../../data/examples.json';
import corrections from '../../data/word-corrections.json';
import { enrichWordData, normalizeStudyWord } from '../lib/word-examples.mjs';
import { createPreviewRepository } from '../lib/study-repository';
import StudyApp from './StudyApp';

export default function PreviewClient() {
  const [repository] = useState(() => createPreviewRepository(enrichWordData(words,examples,corrections).map(w=>normalizeStudyWord({...w,id:w.order_index}))));
  return <StudyApp repository={repository} userName="Bạn" preview />;
}
