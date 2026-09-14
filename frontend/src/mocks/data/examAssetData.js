// src/mocks/data/examAssetData.js

export const examPackageData = {
  'exam-mtk-1': {
    id: 'exam-mtk-1',
    name: 'Matematika Kelas X',
    media_urls: [
      'https://example.com/images/gaya1.png',
      'https://example.com/images/gaya2.png',
      'https://example.com/audio/audio3.mp3',
    ],
    hashMap: {
      'https://example.com/images/gaya1.png': 'hashA',
      'https://example.com/images/gaya2.png': 'hashB',
      'https://example.com/audio/audio3.mp3': 'hashC',
    },
    hash: 'exam-package-hash-456',
  },
  'exam-indo-1': {
    id: 'exam-indo-1',
    name: 'Bahasa Indonesia Kelas XI',
    media_urls: [],
    hashMap: {},
    hash: 'exam-package-hash-789',
  },
}
