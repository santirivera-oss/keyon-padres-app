// ==========================================
// 📄 SERVICIO DE EXPORTACIÓN PDF - WEB COMPATIBLE
// ==========================================

import { Platform } from 'react-native';
import { Alumno, RegistroAcceso, EstadisticasMensuales } from '../types';

interface DatosExportacion {
  alumno: Alumno;
  registros: RegistroAcceso[];
  estadisticas: EstadisticasMensuales;
  mes: number;
  año: number;
}

class PDFExportService {
  
  /**
   * Exportar reporte mensual a PDF
   */
  async exportarPDF(datos: DatosExportacion): Promise<{ success: boolean; message?: string }> {
    try {
      const { mes, año } = datos;
      const registros = Array.isArray(datos.registros) ? datos.registros : [];
      
      // Validar alumno
      if (!datos.alumno) {
        return { success: false, message: 'No hay alumno seleccionado' };
      }
      
      const alumno: Alumno = {
        id: datos.alumno.id || '',
        control: datos.alumno.control || '',
        nombre: datos.alumno.nombre || 'Sin nombre',
        apellidos: datos.alumno.apellidos || '',
        grado: datos.alumno.grado || '',
        grupo: datos.alumno.grupo || '',
        turno: datos.alumno.turno || '',
      };
      
      // Validar estadísticas con valores por defecto
      const estadisticas: EstadisticasMensuales = datos.estadisticas || {
        asistencias: 0,
        faltas: 0,
        retardos: 0,
        diasHabiles: 0,
        porcentaje: 0,
        tendencia: 'regular',
        detalleRetardos: [],
      };
      
      // Generar HTML del reporte
      const html = this.generarHTMLReporte(alumno, registros, estadisticas, mes, año);
      
      if (Platform.OS === 'web') {
        // En web: Abrir en nueva ventana para imprimir
        return this.exportarWeb(html, alumno, mes, año);
      } else {
        // En móvil: Usar expo-print
        return this.exportarMovil(html, alumno, mes, año);
      }
      
    } catch (error: any) {
      console.error('Error generando PDF:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Exportar en Web - Abre ventana de impresión
   */
  private exportarWeb(html: string, alumno: Alumno, mes: number, año: number): { success: boolean; message?: string } {
    try {
      const nombreMes = this.getNombreMes(mes);
      const titulo = `Reporte_${alumno.nombre}_${nombreMes}_${año}`;
      
      // Crear ventana nueva con el contenido
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        return { success: false, message: 'No se pudo abrir la ventana. Permite las ventanas emergentes.' };
      }
      
      // Escribir el HTML
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${titulo}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      return { success: true, message: 'Se abrió la ventana de impresión' };
      
    } catch (error: any) {
      console.error('Error en exportar web:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Exportar en Móvil - Usar expo-print y expo-sharing
   */
  private async exportarMovil(html: string, alumno: Alumno, mes: number, año: number): Promise<{ success: boolean; message?: string }> {
    try {
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      
      const nombreMes = this.getNombreMes(mes);
      
      // Generar PDF
      const result = await Print.printToFileAsync({
        html,
        base64: false,
      });
      
      if (!result || !result.uri) {
        return { success: false, message: 'No se pudo generar el PDF' };
      }
      
      // Compartir el archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reporte de ${alumno.nombre} - ${nombreMes} ${año}`,
          UTI: 'com.adobe.pdf',
        });
        return { success: true, message: 'PDF compartido exitosamente' };
      } else {
        return { success: true, message: `PDF guardado en: ${result.uri}` };
      }
      
    } catch (error: any) {
      console.error('Error en exportar móvil:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Generar HTML del reporte
   */
  private generarHTMLReporte(
    alumno: Alumno, 
    registros: RegistroAcceso[], 
    estadisticas: EstadisticasMensuales,
    mes: number,
    año: number
  ): string {
    const nombreMes = this.getNombreMes(mes);
    
    // Validar registros
    const registrosValidos = Array.isArray(registros) ? registros : [];
    
    // Validar estadísticas con valores por defecto
    const stats = {
      asistencias: estadisticas?.asistencias ?? 0,
      faltas: estadisticas?.faltas ?? 0,
      retardos: estadisticas?.retardos ?? 0,
      diasHabiles: estadisticas?.diasHabiles ?? 0,
      porcentaje: estadisticas?.porcentaje ?? 0,
      tendencia: estadisticas?.tendencia ?? 'regular',
      detalleRetardos: estadisticas?.detalleRetardos ?? [],
    };
    
    // Agrupar registros por día
    const registrosPorDia = this.agruparPorDia(registrosValidos);
    
    // Calcular color del porcentaje
    const colorPorcentaje = stats.porcentaje >= 90 ? '#10b981' 
      : stats.porcentaje >= 80 ? '#f59e0b' 
      : '#ef4444';

    return `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fff;
          color: #1e293b;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .logo {
          font-size: 28px;
          font-weight: 700;
          color: #6366f1;
          margin-bottom: 8px;
        }
        
        .titulo {
          font-size: 20px;
          color: #475569;
        }
        
        .fecha-reporte {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 8px;
        }
        
        .info-alumno {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        
        .info-alumno h2 {
          font-size: 22px;
          margin-bottom: 8px;
        }
        
        .info-alumno p {
          opacity: 0.9;
          font-size: 14px;
        }
        
        .estadisticas {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .stat-card {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        
        .stat-valor {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .stat-valor.success { color: #10b981; }
        .stat-valor.danger { color: #ef4444; }
        .stat-valor.warning { color: #f59e0b; }
        
        .stat-label {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        
        .seccion {
          margin-bottom: 24px;
        }
        
        .seccion-titulo {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .tabla {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .tabla th {
          background: #f1f5f9;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .tabla td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .tabla tr:hover td {
          background: #f8fafc;
        }
        
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .badge-ingreso {
          background: #dcfce7;
          color: #166534;
        }
        
        .badge-salida {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .resumen-dia {
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
        }
        
        .resumen-dia-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .resumen-dia-fecha {
          font-weight: 600;
          color: #1e293b;
        }
        
        .resumen-dia-tiempo {
          font-size: 13px;
          color: #6366f1;
        }
        
        .registros-dia {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .registro-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        
        @media print {
          body { padding: 20px; }
          .stat-card { break-inside: avoid; }
        }
      </style>
      
      <div class="header">
        <div class="logo">📚 Keyon Access</div>
        <div class="titulo">Reporte de Asistencia - ${nombreMes} ${año}</div>
        <div class="fecha-reporte">Generado el ${new Date().toLocaleDateString('es-MX', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}</div>
      </div>
      
      <div class="info-alumno">
        <h2>${alumno.nombre} ${alumno.apellidos}</h2>
        <p>${alumno.grado}° ${alumno.grupo} • Turno ${alumno.turno}</p>
        <p>No. Control: ${alumno.control}</p>
      </div>
      
      <div class="estadisticas">
        <div class="stat-card">
          <div class="stat-valor success">${stats.asistencias}</div>
          <div class="stat-label">Asistencias</div>
        </div>
        <div class="stat-card">
          <div class="stat-valor danger">${stats.faltas}</div>
          <div class="stat-label">Faltas</div>
        </div>
        <div class="stat-card">
          <div class="stat-valor warning">${stats.retardos}</div>
          <div class="stat-label">Retardos</div>
        </div>
        <div class="stat-card">
          <div class="stat-valor" style="color: ${colorPorcentaje}">${stats.porcentaje}%</div>
          <div class="stat-label">Asistencia</div>
        </div>
      </div>
      
      <div class="seccion">
        <div class="seccion-titulo">📅 Detalle de Registros</div>
        ${registrosValidos.length === 0 ? `
          <p style="text-align: center; color: #94a3b8; padding: 20px;">
            No hay registros para este mes
          </p>
        ` : `
          <table class="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Modo</th>
              </tr>
            </thead>
            <tbody>
              ${registrosValidos.map(r => `
                <tr>
                  <td>${this.formatearFecha(r.fecha)}</td>
                  <td><strong>${r.hora?.slice(0, 5) || '--:--'}</strong></td>
                  <td>
                    <span class="badge ${r.tipoRegistro === 'Ingreso' ? 'badge-ingreso' : 'badge-salida'}">
                      ${r.tipoRegistro}
                    </span>
                  </td>
                  <td>${this.getModoLabel(r.modo)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      
      ${stats.detalleRetardos && stats.detalleRetardos.length > 0 ? `
        <div class="seccion">
          <div class="seccion-titulo">⚠️ Detalle de Retardos</div>
          <table class="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora de Llegada</th>
              </tr>
            </thead>
            <tbody>
              ${stats.detalleRetardos.map(r => `
                <tr>
                  <td>${this.formatearFecha(r.fecha)}</td>
                  <td style="color: #f59e0b; font-weight: 600;">${r.hora?.slice(0, 5) || '--:--'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Este documento fue generado automáticamente por Keyon Access System</p>
        <p>© ${new Date().getFullYear()} Keyon Access - Sistema de Control de Asistencia Escolar</p>
      </div>
    `;
  }

  /**
   * Helpers
   */
  private agruparPorDia(registros: RegistroAcceso[]): { fecha: string; registros: RegistroAcceso[] }[] {
    if (!registros || !Array.isArray(registros)) {
      return [];
    }
    
    const grupos: Record<string, RegistroAcceso[]> = {};
    
    registros.forEach(reg => {
      if (!grupos[reg.fecha]) {
        grupos[reg.fecha] = [];
      }
      grupos[reg.fecha].push(reg);
    });
    
    return Object.entries(grupos)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, regs]) => ({ 
        fecha, 
        registros: regs.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')) 
      }));
  }

  private formatearFecha(fechaStr: string): string {
    if (!fechaStr) return 'N/A';
    try {
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      return fecha.toLocaleDateString('es-MX', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    } catch {
      return fechaStr;
    }
  }

  private getNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || 'Mes';
  }

  private getModoLabel(modo: string): string {
    const modos: Record<string, string> = {
      facial: 'Facial',
      qr: 'QR',
      barcode: 'Código',
      manual: 'Manual',
    };
    return modos[modo] || modo || 'N/A';
  }
}

// Exportar instancia única
export const pdfService = new PDFExportService();
export default pdfService;
