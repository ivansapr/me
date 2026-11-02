export type ClawPosition = { col: number; row: number };
export type ClawDirection = 'left' | 'right' | 'back' | 'front';

export const gridSize = 3;
export const chute: ClawPosition = { col: 0, row: gridSize - 1 };

const deltas: Record<ClawDirection, ClawPosition> = {
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
  back: { col: 0, row: -1 },
  front: { col: 0, row: 1 }
};

const clamp = (value: number) => Math.min(gridSize - 1, Math.max(0, value));

export function moveClaw(
  position: ClawPosition,
  direction: ClawDirection
): ClawPosition {
  const delta = deltas[direction];
  return {
    col: clamp(position.col + delta.col),
    row: clamp(position.row + delta.row)
  };
}

export function isChute(position: ClawPosition): boolean {
  return position.col === chute.col && position.row === chute.row;
}
