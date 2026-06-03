import {ORIENTATION_LABEL, ORIENTATION_FR} from '../../src/utils/orientationUtils';
import {Orientation} from '../../src/types/sector';

const ALL_ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

describe('ORIENTATION_LABEL', () => {
  it.each(ALL_ORIENTATIONS)('orientation %s a une entrée', o => {
    expect(ORIENTATION_LABEL[o]).toBeDefined();
  });

  it.each(ALL_ORIENTATIONS)('le label %s contient la lettre directionnelle', o => {
    expect(ORIENTATION_LABEL[o]).toContain(o);
  });

  it.each<[Orientation, string]>([
    ['N',  '↑'],
    ['NE', '↗'],
    ['E',  '→'],
    ['SE', '↘'],
    ['S',  '↓'],
    ['SW', '↙'],
    ['W',  '←'],
    ['NW', '↖'],
  ])('ORIENTATION_LABEL[%s] contient la flèche %s', (o, arrow) => {
    expect(ORIENTATION_LABEL[o]).toContain(arrow);
  });
});

describe('ORIENTATION_FR', () => {
  it.each(ALL_ORIENTATIONS)('orientation %s a un nom français', o => {
    expect(ORIENTATION_FR[o]).toBeDefined();
  });

  it.each<[Orientation, string]>([
    ['N',  'Nord'],
    ['NE', 'Nord-Est'],
    ['E',  'Est'],
    ['SE', 'Sud-Est'],
    ['S',  'Sud'],
    ['SW', 'Sud-Ouest'],
    ['W',  'Ouest'],
    ['NW', 'Nord-Ouest'],
  ])('ORIENTATION_FR[%s] === "%s"', (o, expected) => {
    expect(ORIENTATION_FR[o]).toBe(expected);
  });
});
