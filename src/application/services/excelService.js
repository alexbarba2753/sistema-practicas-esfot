import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { errorHttp } from '../../domain/utils/errorHttp.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'documentacion');
const PLANTILLA_LABORAL = path.join(TEMPLATES_DIR, 'f_aa_119_informe_de_practicas_preprofesionales_1.xlsx');
const PLANTILLA_COMUNITARIO = path.join(TEMPLATES_DIR, 'fcp_001a_informe_convalidacion_reconocimiento_pp.xlsx');

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
    if (contenido.asignaturasUtilidad) worksheet.getCell('A43').value = contenido.asignaturasUtilidad;

    // 5. ACTIVIDADES REALIZADAS
    worksheet.getCell('D47').value = entidad.areaAsignada || 'Desarrollo de Software / TI';
    if (aula?.fechaInicio) {
      worksheet.getCell('E49').value = new Date(aula.fechaInicio).toLocaleDateString('es-EC');
    }
    if (aula?.fechaFin) {
      worksheet.getCell('H49').value = new Date(aula.fechaFin).toLocaleDateString('es-EC');
    }
    worksheet.getCell('I54').value = formularioPendiente?.totalHoras || aula?.horasRequeridas || 240;

    if (contenido.principalesActividades) worksheet.getCell('B56').value = contenido.principalesActividades;
    if (contenido.habilidadesAdquiridas) worksheet.getCell('B58').value = contenido.habilidadesAdquiridas;
    if (contenido.observacionesTemas) worksheet.getCell('A62').value = contenido.observacionesTemas;

    // 6. FIRMAS TUTOR ACADÉMICO
    if (nombreCompletoDocente) worksheet.getCell('H103').value = nombreCompletoDocente;
    if (docente?.cedula) worksheet.getCell('H104').value = docente.cedula;

    const buffer = await workbook.xlsx.writeBuffer();
    const safeCedula = (estudiante?.cedula || 'ESTUDIANTE').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `F_AA_119_Informe_Practicas_Laborales_${safeCedula}.xlsx`;

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

    // 3. DATOS DEL ESTUDIANTE
    worksheet.getCell('C26').value = nombreCompletoEstudiante;
    worksheet.getCell('C27').value = estudiante?.cedula || '';
    worksheet.getCell('C28').value = estudiante?.correo || '';
    worksheet.getCell('H28').value = estudiante?.telefono || '';
    worksheet.getCell('J28').value = estudiante?.telefono || '';

    // 5. INFORMACIÓN DE LA INSTITUCIÓN
    if (entidad.razonSocial) worksheet.getCell('C34').value = entidad.razonSocial;
    if (entidad.ruc) worksheet.getCell('C35').value = entidad.ruc;
    if (entidad.direccion) worksheet.getCell('C36').value = entidad.direccion;
    if (entidad.ciudad) worksheet.getCell('C37').value = entidad.ciudad;
    if (entidad.telefono) worksheet.getCell('H37').value = entidad.telefono;
    if (entidad.correo) worksheet.getCell('C38').value = entidad.correo;
    if (entidad.tipoEntidad) worksheet.getCell('C39').value = entidad.tipoEntidad;

    // 6. ACTIVIDADES REALIZADAS
    if (contenido.resumenActividades) worksheet.getCell('A48').value = contenido.resumenActividades;
    if (contenido.contribucionConocimientos) worksheet.getCell('A50').value = contenido.contribucionConocimientos;
    if (contenido.resultadosAprendizaje) worksheet.getCell('A52').value = contenido.resultadosAprendizaje;
    if (contenido.asignaturasMalla) worksheet.getCell('A54').value = contenido.asignaturasMalla;

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

    // 9. TUTOR EPN
    if (nombreCompletoDocente) worksheet.getCell('C68').value = nombreCompletoDocente;

    const buffer = await workbook.xlsx.writeBuffer();
    const safeCedula = (estudiante?.cedula || 'ESTUDIANTE').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `FCP_001A_Informe_Convalidacion_Comunitario_${safeCedula}.xlsx`;

    return { buffer, filename };
  }
};
