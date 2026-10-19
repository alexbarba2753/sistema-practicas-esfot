/**
 * Validador de cédula de identidad ecuatoriana (Algoritmo Módulo 10)
 * Regla de negocio pura del Dominio
 */
export const validarCedula = (cedula) => {
  if (typeof cedula !== 'string') return false;

  const cedulaLimpia = cedula.trim();

  // Debe tener exactamente 10 dígitos numéricos
  if (!/^\d{10}$/.test(cedulaLimpia)) {
    return false;
  }

  // Código de provincia (dos primeros dígitos): 1 a 24 o 30
  const provincia = parseInt(cedulaLimpia.substring(0, 2), 10);
  if ((provincia < 1 || provincia > 24) && provincia !== 30) {
    return false;
  }

  // Tercer dígito para personas naturales debe ser menor a 6
  const tercerDigito = parseInt(cedulaLimpia.charAt(2), 10);
  if (tercerDigito >= 6) {
    return false;
  }

  // Algoritmo módulo 10
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedulaLimpia.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) {
      valor -= 9;
    }
    suma += valor;
  }

  const digitoVerificadorCalculado = (10 - (suma % 10)) % 10;
  const digitoVerificadorReal = parseInt(cedulaLimpia.charAt(9), 10);

  return digitoVerificadorCalculado === digitoVerificadorReal;
};
