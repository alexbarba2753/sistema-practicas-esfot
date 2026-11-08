import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { errorHttp } from '../../domain/utils/errorHttp.js';
import { limpiarTextoParaExcel } from './asistenteIaService.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'documentacion');
const DESCARGAS_DIR = path.join(process.cwd(), 'archivos_descargados');
const PLANTILLA_LABORAL = path.join(TEMPLATES_DIR, 'f_aa_119_informe_de_practicas_preprofesionales_1.xlsx');
const PLANTILLA_COMUNITARIO = path.join(TEMPLATES_DIR, 'fcp_001a_informe_convalidacion_reconocimiento_pp.xlsx');

function guardarCopiaLocal(filename, buffer) {
  try {
    if (!fs.existsSync(DESCARGAS_DIR)) {
      fs.mkdirSync(DESCARGAS_DIR, { recursive: true });
    }
    const rutaDestino = path.join(DESCARGAS_DIR, filename);
    fs.writeFileSync(rutaDestino, buffer);
    console.log(`[excelService] Archivo generado y guardado localmente en: ${rutaDestino}`);
  } catch (err) {
    console.error(`[excelService] No se pudo guardar la copia local:`, err.message);
  }
}

export const excelService = {
  /**
   * Genera en memoria el archivo Excel F_AA_119 para Prácticas Laborales
   */
  async generarExcelInformeLaboral({ aula, estudiante, docente, formularioPendiente }) {
    if (!fs.existsSync(PLANTILLA_LABORAL)) {
      throw errorHttp('No se encontró el archivo de plantilla oficial F_AA_119 en el servidor', 500);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(PLANTILLA_LABORAL);

    const worksheet = workbook.getWorksheet('FORMULARIO') || workbook.worksheets[0];
    if (!worksheet) {
      throw errorHttp('La plantilla no contiene la hoja FORMULARIO reglamentaria', 500);
    }

    const nombreCompletoEstudiante = `${estudiante?.nombres || ''} ${estudiante?.apellidos || ''}`.trim();
    const nombreCompletoDocente = docente ? `${docente?.nombres || ''} ${docente?.apellidos || ''}`.trim() : '';
    const entidad = formularioPendiente?.entidadReceptora || {};
    const contenido = formularioPendiente?.contenidoIa || {};

    // 1. DATOS DE LA ENTIDAD RECEPTORA (Celdas amarillas)
    if (entidad.razonSocial) worksheet.getCell('D10').value = entidad.razonSocial;
    if (entidad.ruc) worksheet.getCell('D11').value = entidad.ruc;
    if (entidad.direccion) worksheet.getCell('D12').value = entidad.direccion;
    if (entidad.correo) worksheet.getCell('D13').value = entidad.correo;
    if (entidad.ciudad) worksheet.getCell('C14').value = entidad.ciudad;
    if (entidad.telefono) worksheet.getCell('H14').value = entidad.telefono;
    if (entidad.celular) worksheet.getCell('J14').value = entidad.celular;
    if (entidad.tipoEntidad) worksheet.getCell('E15').value = entidad.tipoEntidad;
    if (entidad.responsable) worksheet.getCell('E16').value = entidad.responsable;
    if (entidad.tutorEmpresarial) {
      worksheet.getCell('E17').value = entidad.tutorEmpresarial;
      worksheet.getCell('E18').value = entidad.tutorEmpresarial;
    }

    // 2. DATOS DEL PRACTICANTE (Celdas amarillas)
    worksheet.getCell('E21').value = nombreCompletoEstudiante;
    worksheet.getCell('E22').value = estudiante?.cedula || '';
    worksheet.getCell('E23').value = 120; // Créditos promedio de carrera técnica

    // 3. RESPONSABILIDAD DE LA INFORMACIÓN Y CONSENTIMIENTO
    worksheet.getCell('B26').value = nombreCompletoEstudiante;
    worksheet.getCell('I26').value = estudiante?.cedula || '';

    // 4. INFORMACIÓN SOBRE LAS PRÁCTICAS
    if (nombreCompletoDocente) worksheet.getCell('D33').value = nombreCompletoDocente;
    if (contenido.asignaturasUtilidad) {
      const cellA43 = worksheet.getCell('A43');
      cellA43.value = limpiarTextoParaExcel(contenido.asignaturasUtilidad);
      cellA43.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
      cellA43.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }

    // 5. ACTIVIDADES REALIZADAS
    worksheet.getCell('D47').value = entidad.areaAsignada || 'Desarrollo de Software / TI';
    if (aula?.fechaInicio) {
      worksheet.getCell('E49').value = new Date(aula.fechaInicio).toLocaleDateString('es-EC');
    }
    if (aula?.fechaFin) {
      worksheet.getCell('H49').value = new Date(aula.fechaFin).toLocaleDateString('es-EC');
    }

    // Horario semanal (Lunes a Viernes y Total Horas Semanales)
    const horario = formularioPendiente?.horarioSemanal || {};
    const horaIni = horario.horaInicio || '08:00';
    const horaFin = horario.horaFin || '16:30';
    const horasSem = horario.horasSemanales || 40;

    ['B51', 'C51', 'D51', 'E51', 'F51'].forEach((ref) => {
      const c = worksheet.getCell(ref);
      c.value = horaIni;
      c.font = { name: 'Tahoma', size: 8, bold: true, color: { argb: 'FF000000' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    ['B52', 'C52', 'D52', 'E52', 'F52'].forEach((ref) => {
      const c = worksheet.getCell(ref);
      c.value = horaFin;
      c.font = { name: 'Tahoma', size: 8, bold: true, color: { argb: 'FF000000' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const cellHorasSem = worksheet.getCell('I52');
    cellHorasSem.value = horasSem;
    cellHorasSem.font = { name: 'Tahoma', size: 9, bold: true, color: { argb: 'FF000000' } };
    cellHorasSem.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.getCell('I54').value = formularioPendiente?.totalHoras || aula?.horasRequeridas || 240;

    // Escribir en la celda maestra A56 (A56:J56 merged)
    if (contenido.principalesActividades) {
      const cellA56 = worksheet.getCell('A56');
      cellA56.value = limpiarTextoParaExcel(contenido.principalesActividades);
      cellA56.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
      cellA56.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }

    // Escribir en la celda maestra A58 (A58:J58 merged)
    if (contenido.habilidadesAdquiridas) {
      const cellA58 = worksheet.getCell('A58');
      cellA58.value = limpiarTextoParaExcel(contenido.habilidadesAdquiridas);
      cellA58.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
      cellA58.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }

    // Observaciones o temas no cubiertos (A62:J62 merged) con fuente negra normal
    const cellA62 = worksheet.getCell('A62');
    cellA62.value = limpiarTextoParaExcel(
      contenido.observacionesTemas ||
        'Durante la práctica se complementaron los conocimientos académicos con estándares de desarrollo ágil y arquitectura en la nube.'
    );
    cellA62.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
    cellA62.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };

    // 6. FIRMAS TUTOR ACADÉMICO
    if (nombreCompletoDocente) worksheet.getCell('H103').value = nombreCompletoDocente;
    if (docente?.cedula) worksheet.getCell('H104').value = docente.cedula;

    const buffer = await workbook.xlsx.writeBuffer();
    const safeCedula = (estudiante?.cedula || 'ESTUDIANTE').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `F_AA_119_Informe_Practicas_Laborales_${safeCedula}.xlsx`;

    guardarCopiaLocal(filename, buffer);

    return { buffer, filename };
  },

  /**
   * Genera en memoria el archivo Excel FCP_001A para Convalidación / Servicio Comunitario
   */
  async generarExcelInformeComunitario({ aula, estudiante, docente, formularioPendiente }) {
    if (!fs.existsSync(PLANTILLA_COMUNITARIO)) {
      throw errorHttp('No se encontró el archivo de plantilla oficial FCP_001A en el servidor', 500);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(PLANTILLA_COMUNITARIO);

    const worksheet = workbook.getWorksheet('FORMULARIO') || workbook.worksheets[0];
    if (!worksheet) {
      throw errorHttp('La plantilla no contiene la hoja FORMULARIO reglamentaria', 500);
    }

    const nombreCompletoEstudiante = `${estudiante?.nombres || ''} ${estudiante?.apellidos || ''}`.trim();
    const nombreCompletoDocente = docente ? `${docente?.nombres || ''} ${docente?.apellidos || ''}`.trim() : '';
    const entidad = formularioPendiente?.entidadReceptora || {};
    const contenido = formularioPendiente?.contenidoIa || {};

    // 2. ACTIVIDADES PARA LAS QUE SOLICITA LA CONVALIDACIÓN (Actividades solidarias y de cooperación)
    worksheet.getCell('F18').value = 'X';

    // 3. DATOS DEL ESTUDIANTE
    worksheet.getCell('C26').value = nombreCompletoEstudiante;
    worksheet.getCell('C27').value = estudiante?.cedula || '';
    worksheet.getCell('C28').value = estudiante?.correo || '';
    worksheet.getCell('H28').value = estudiante?.telefono || '';
    worksheet.getCell('J28').value = estudiante?.telefono || '';

    // 4. DOCUMENTACIÓN DE SOPORTE ADJUNTA
    worksheet.getCell('A31').value = 'Bitácoras aprobadas en plataforma digital, registro de beneficiarios comunitarios y memoria de impacto social.';

    // 5. INFORMACIÓN DE LA INSTITUCIÓN
    if (entidad.razonSocial) worksheet.getCell('C34').value = entidad.razonSocial;
    if (entidad.ruc) worksheet.getCell('C35').value = entidad.ruc;
    if (entidad.direccion) worksheet.getCell('C36').value = entidad.direccion;
    if (entidad.ciudad) worksheet.getCell('C37').value = entidad.ciudad;
    if (entidad.telefono) worksheet.getCell('H37').value = entidad.telefono;
    if (entidad.correo) worksheet.getCell('C38').value = entidad.correo;
    if (entidad.tipoEntidad) worksheet.getCell('C39').value = entidad.tipoEntidad;

    // 6. ACTIVIDADES REALIZADAS (Celdas maestras combinadas A48, A50, A52, A54)
    if (contenido.resumenActividades) {
      const cell = worksheet.getCell('A48');
      cell.value = limpiarTextoParaExcel(contenido.resumenActividades);
      cell.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
      cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }
    if (contenido.contribucionConocimientos) {
      const cell = worksheet.getCell('A50');
      cell.value = limpiarTextoParaExcel(contenido.contribucionConocimientos);
      cell.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
      cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }
    if (contenido.resultadosAprendizaje) {
      const cell = worksheet.getCell('A52');
      cell.value = limpiarTextoParaExcel(contenido.resultadosAprendizaje);
      cell.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
      cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }
    if (contenido.asignaturasMalla) {
      const cell = worksheet.getCell('A54');
      cell.value = limpiarTextoParaExcel(contenido.asignaturasMalla);
      cell.font = { name: 'Tahoma', size: 9, color: { argb: 'FF000000' } };
      cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }

    // 7. INFORMACIÓN ADICIONAL
    if (aula?.fechaInicio) {
      worksheet.getCell('C58').value = new Date(aula.fechaInicio).toLocaleDateString('es-EC');
    }
    if (aula?.fechaFin) {
      worksheet.getCell('H58').value = new Date(aula.fechaFin).toLocaleDateString('es-EC');
    }
    worksheet.getCell('C59').value = formularioPendiente?.totalHoras || aula?.horasRequeridas || 96;

    // 8. RESPONSABILIDAD
    worksheet.getCell('B63').value = nombreCompletoEstudiante;
    worksheet.getCell('I63').value = estudiante?.cedula || '';
    worksheet.getCell('B65').value = new Date().toLocaleDateString('es-EC');

    // 9. INFORME DEL TUTOR EPN
    if (nombreCompletoDocente) worksheet.getCell('C68').value = nombreCompletoDocente;
    worksheet.getCell('H68').value = 'ESFOT';
    worksheet.getCell('H69').value = 'X';
    worksheet.getCell('H70').value = 'X';
    worksheet.getCell('H71').value = 'X';
    worksheet.getCell('F74').value = formularioPendiente?.totalHoras || aula?.horasRequeridas || 96;

    const buffer = await workbook.xlsx.writeBuffer();
    const safeCedula = (estudiante?.cedula || 'ESTUDIANTE').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `FCP_001A_Informe_Convalidacion_Comunitario_${safeCedula}.xlsx`;

    guardarCopiaLocal(filename, buffer);

    return { buffer, filename };
  }
};
