export type Prize =
  'gift' | 'heart' | 'star' | 'book' | 'camera' | 'headphones';

export const prizes: readonly Prize[] = [
  'gift',
  'heart',
  'star',
  'book',
  'camera',
  'headphones'
];

export const prizeLabels: Record<Prize, string> = {
  gift: 'a gift',
  heart: 'a heart',
  star: 'a star',
  book: 'a book',
  camera: 'a camera',
  headphones: 'headphones'
};

const shapes: Record<Prize, string> = {
  gift: '<rect x="4" y="10" width="16" height="10" rx="1.5" fill="#ff6b4a"/><rect x="3" y="7" width="18" height="4" rx="1" fill="#ffc247"/><rect x="11" y="7" width="2" height="13" fill="#fff4e0"/><path d="M12 7C9 7 8 3.5 10.5 3.5S12 6 12 7zM12 7c3 0 4-3.5 1.5-3.5S12 6 12 7z" fill="#fff4e0"/>',
  heart:
    '<path d="M12 21C4 15 3 11 3 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 1.5C21 11 20 15 12 21z" fill="#ff4f6d"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.9z" fill="#ffc247"/>',
  book: '<rect x="5" y="3" width="14" height="18" rx="1.5" fill="#4fb6a8"/><rect x="5" y="3" width="3" height="18" fill="#2f8579"/><rect x="10" y="7" width="6" height="2" fill="#fff4e0"/><rect x="10" y="11" width="4" height="2" fill="#fff4e0"/>',
  camera:
    '<rect x="2.5" y="7" width="19" height="13" rx="2.5" fill="#7b6cf6"/><rect x="8" y="4" width="8" height="4" rx="1" fill="#7b6cf6"/><circle cx="12" cy="13.5" r="4" fill="#fff4e0"/><circle cx="12" cy="13.5" r="2" fill="#3b1d0f"/>',
  headphones:
    '<path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="#3b1d0f" stroke-width="2" stroke-linecap="round"/><rect x="2.5" y="14" width="5" height="7" rx="2" fill="#ff6b4a"/><rect x="16.5" y="14" width="5" height="7" rx="2" fill="#ff6b4a"/>'
};

export function prizeSrc(prize: Prize): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128">${shapes[prize]}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
