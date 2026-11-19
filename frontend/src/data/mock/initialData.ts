import type {
  CurhatThread,
  MaterialLevel,
  PosterInfo,
  QuizQuestion,
  StudentAccount,
  TeacherAccount,
} from '../../types';

export const MOCK_STUDENTS: StudentAccount[] = [
  { id: 's-1', name: 'Alya Putri', kelas: 2, username: 'alya2' },
  { id: 's-2', name: 'Raka Pratama', kelas: 4, username: 'raka4' },
  { id: 's-3', name: 'Nadia Zahra', kelas: 5, username: 'nadia5' },
];

export const MOCK_TEACHERS: TeacherAccount[] = [
  {
    id: 't-1',
    name: 'Bu Rina Sari',
    subjectOrClass: 'Wali Kelas & Pendamping Siswa',
    accessCode: '482910',
  },
];

export const MOCK_MATERIALS: MaterialLevel[] = [
  {
    id: 'mat-1',
    level: 1,
    title: 'Apa Itu Cyberbullying?',
    summary:
      'Cyberbullying adalah tindakan menyakiti, mengejek, atau mengintimidasi teman lewat pesan, grup chat, atau media sosial.',
    examples: [
      'Mengirim stiker ejekan berulang kali di chat kelas',
      'Membuat panggilan nama buruk di kolom komentar',
    ],
    targetMinClass: 1,
  },
  {
    id: 'mat-2',
    level: 2,
    title: 'Menyebarkan Foto atau Rahasia Teman',
    summary:
      'Mengunggah foto memalukan atau rahasia teman tanpa izin termasuk cyberbullying dan bisa membuat teman sedih atau takut.',
    examples: [
      'Membagikan foto teman saat tersandung ke grup',
      'Menceritakan rahasia pribadi teman di media sosial',
    ],
    targetMinClass: 3,
  },
];

export const MOCK_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-1',
    level: 1,
    scenario:
      'Temanmu mengirim stiker mengejek ke Bima di grup chat, lalu meminta kamu ikut menertawakan. Apa yang sebaiknya kamu lakukan?',
    options: [
      {
        label: 'A',
        text: 'Ikut mengirim stiker tertawa supaya dianggap kompak',
        isCorrect: false,
        consequence:
          'Risiko: Bima merasa dikeroyok secara online dan semakin tertekan, sementara kamu ikut menyakiti teman.',
      },
      {
        label: 'B',
        text: 'Tidak ikut mengejek, simpan bukti, dan beri tahu guru atau orang tua',
        isCorrect: true,
        consequence:
          'Tepat! Kamu tidak memperparah ejekan dan membantu Bima mendapat bantuan dari orang dewasa yang tepat.',
      },
      {
        label: 'C',
        text: 'Membalas mengejek balik pengirim stiker di grup',
        isCorrect: false,
        consequence:
          'Risiko: Pertengkaran di grup bisa membesar dan memicu saling balas ejekan tanpa akhir.',
      },
    ],
  },
];

export const MOCK_CURHATS: CurhatThread[] = [
  {
    id: 'c-1',
    studentId: 's-2',
    studentName: 'Raka Pratama',
    kelas: 4,
    incidentRole: 'korban',
    updatedAt: 'Hari ini, 09.15',
    messages: [
      {
        id: 'm-1',
        senderRole: 'student',
        senderName: 'Raka Pratama',
        text: 'Bu, foto saya waktu jatuh di lapangan diposting ke grup tanpa izin.',
        timestamp: '09.15',
      },
    ],
  },
];

export const MOCK_POSTERS: PosterInfo[] = [
  {
    id: 'p-1',
    title: 'Pikir Sebelum Kirim',
    description: 'Pastikan pesan atau gambar tidak menyakiti perasaan teman.',
    tag: 'Edukasi SD',
  },
];