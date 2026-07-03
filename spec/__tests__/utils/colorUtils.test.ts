import {numericScoreGradientColor} from '../../src/utils/colorUtils';

describe('numericScoreGradientColor', () => {
  it('score 0 → rouge pur rgb(178,34,34)', () => {
    expect(numericScoreGradientColor(0)).toBe('rgb(178,34,34)');
  });

  it('score 10 → vert pur rgb(0,128,0)', () => {
    expect(numericScoreGradientColor(10)).toBe('rgb(0,128,0)');
  });

  it('score 5 → jaune pur rgb(238,210,2)', () => {
    expect(numericScoreGradientColor(5)).toBe('rgb(238,210,2)');
  });

  it('score 2.5 → mi-chemin rouge→jaune', () => {
    // t = 0.25 → lerp(RED, YELLOW, 0.5)
    // r = round(178 + 0.5*(238-178)) = 208
    // g = round(34  + 0.5*(210-34))  = 122
    // b = round(34  + 0.5*(2-34))    = 18
    expect(numericScoreGradientColor(2.5)).toBe('rgb(208,122,18)');
  });

  it('score 7.5 → mi-chemin jaune→vert', () => {
    // t = 0.75 → lerp(YELLOW, GREEN, 0.5)
    // r = round(238 + 0.5*(0-238))   = 119
    // g = round(210 + 0.5*(128-210)) = 169
    // b = round(2   + 0.5*(0-2))     = 1
    expect(numericScoreGradientColor(7.5)).toBe('rgb(119,169,1)');
  });

  it('score négatif → clampé à 0 (rouge pur)', () => {
    expect(numericScoreGradientColor(-1)).toBe('rgb(178,34,34)');
  });

  it('score > 10 → clampé à 10 (vert pur)', () => {
    expect(numericScoreGradientColor(11)).toBe('rgb(0,128,0)');
  });
});
