'use client';
import { useState } from 'react';
import words from '../../data/words.json';
import { createPreviewRepository } from '../lib/study-repository';
import StudyApp from './StudyApp';

export default function PreviewClient() {
  const [repository] = useState(() => createPreviewRepository(words.map(w=>({...w,id:w.order_index}))));
  return <StudyApp repository={repository} userName="Bạn" preview />;
}
