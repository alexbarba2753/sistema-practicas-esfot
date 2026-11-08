import { validarCedula } from '../src/domain/utils/validarCedula.js';

describe('Validación de Cédula Ecuatoriana (Algoritmo Módulo 10)', () => {
  test('debe aceptar cédulas válidas de 10 dígitos', () => {
    expect(validarCedula('1710034065')).toBe(true);
    expect(validarCedula('1720000007')).toBe(true);
  });

  test('debe rechazar cédulas con longitud diferente a 10', () => {
    expect(validarCedula('172999')).toBe(false);
    expect(validarCedula('17299900021')).toBe(false);
  });

  test('debe rechazar cédulas con provincia inválida (> 24 y != 30)', () => {
    expect(validarCedula('5029990002')).toBe(false);
    expect(validarCedula('0029990002')).toBe(false);
  });

  test('debe rechazar tercer dígito mayor o igual a 6 en personas naturales', () => {
    expect(validarCedula('1769990002')).toBe(false);
  });

  test('debe rechazar caracteres no numéricos o vacíos', () => {
    expect(validarCedula('172999000A')).toBe(false);
    expect(validarCedula('')).toBe(false);
    expect(validarCedula(null)).toBe(false);
  });
});
