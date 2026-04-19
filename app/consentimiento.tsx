// ==========================================
// 🔒 PANTALLA DE CONSENTIMIENTO BIOMÉTRICO
// ==========================================
// Con modal informativo previo

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import {
  obtenerAlumnoBasico,
  guardarConsentimiento,
  verificarConsentimiento,
  solicitarPermisoUbicacion,
  obtenerUbicacionCompleta,
  solicitarVerificacion,
  verificarCodigo,
  TEXTOS_LEGALES,
  PARENTESCOS,
  DatosTutor,
  AlumnoBasico,
  UbicacionConsentimiento,
} from '../services/consentimiento';

const { width } = Dimensions.get('window');

// ==========================================
// MODAL INFORMATIVO PREVIO
// ==========================================
function ModalInformativo({
  visible,
  onAceptar,
  onVerMas,
  onCancelar,
}: {
  visible: boolean;
  onAceptar: () => void;
  onVerMas: () => void;
  onCancelar: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const beneficios = [
    'Verificación de identidad del padre o tutor',
    'Protección de la información de los alumnos',
    'Uso responsable y seguro de tecnologías del sistema',
  ];

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icono principal */}
          <View style={styles.modalIconContainer}>
            <View style={styles.modalIconBg}>
              <Feather name="users" size={40} color="#0ea5e9" />
            </View>
            <View style={styles.modalShield}>
              <Feather name="shield" size={20} color="#10b981" />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.modalTitle}>
            Tu privacidad y la seguridad de tu familia son importantes
          </Text>

          {/* Mensaje principal */}
          <Text style={styles.modalMessage}>
            Antes de continuar, queremos informarte que el siguiente paso incluye el registro de datos del padre o tutor y la aceptación de políticas necesarias para el funcionamiento seguro del sistema escolar.
          </Text>

          <Text style={styles.modalMessageSecondary}>
            Esta información se utiliza únicamente con fines de seguridad, verificación de acceso y protección de los alumnos.
          </Text>

          {/* Lista de beneficios */}
          <View style={styles.beneficiosList}>
            {beneficios.map((item, index) => (
              <View key={index} style={styles.beneficioItem}>
                <View style={styles.checkIcon}>
                  <Feather name="check" size={14} color="white" />
                </View>
                <Text style={styles.beneficioText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Texto legal pequeño */}
          <Text style={styles.modalLegal}>
            Cumplimos con la Ley Federal de Protección de Datos Personales en México.
          </Text>

          {/* Botones */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={onAceptar}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={20} color="white" />
              <Text style={styles.btnPrimaryText}>Aceptar y continuar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={onVerMas}
              activeOpacity={0.8}
            >
              <Feather name="info" size={18} color="#0ea5e9" />
              <Text style={styles.btnSecondaryText}>Ver más información</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnTertiary}
              onPress={onCancelar}
              activeOpacity={0.8}
            >
              <Text style={styles.btnTertiaryText}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ==========================================
// MODAL DE POLÍTICAS
// ==========================================
function ModalPoliticas({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.politicasContainer}>
        <View style={styles.politicasHeader}>
          <Text style={styles.politicasTitle}>Aviso de Privacidad</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={24} color="#f1f5f9" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.politicasContent}>
          <Text style={styles.politicasSection}>1. RESPONSABLE</Text>
          <Text style={styles.politicasText}>
            CBTis No. 011, con domicilio en Fresnillo, Zacatecas, es responsable del tratamiento de sus datos personales.
          </Text>

          <Text style={styles.politicasSection}>2. DATOS QUE RECOPILAMOS</Text>
          <Text style={styles.politicasText}>
            • Datos biométricos faciales (reconocimiento facial){'\n'}
            • Registros de asistencia (fecha y hora){'\n'}
            • Datos de identificación (nombre, número de control){'\n'}
            • Datos del tutor (nombre, teléfono, correo)
          </Text>

          <Text style={styles.politicasSection}>3. FINALIDAD</Text>
          <Text style={styles.politicasText}>
            • Control de acceso seguro al plantel{'\n'}
            • Registro automático de asistencia{'\n'}
            • Notificaciones en tiempo real a padres{'\n'}
            • Seguridad de los estudiantes
          </Text>

          <Text style={styles.politicasSection}>4. BASE LEGAL</Text>
          <Text style={styles.politicasText}>
            • Ley Federal de Protección de Datos Personales (LFPDPPP) - Arts. 5, 7, 8, 9{'\n'}
            • Ley General de Derechos de Niñas, Niños y Adolescentes{'\n'}
            • Código Civil Federal - Art. 23
          </Text>

          <Text style={styles.politicasSection}>5. DERECHOS ARCO</Text>
          <Text style={styles.politicasText}>
            Usted tiene derecho a:{'\n'}
            • Acceder a sus datos{'\n'}
            • Rectificar datos inexactos{'\n'}
            • Cancelar el tratamiento{'\n'}
            • Oponerse al uso de datos{'\n\n'}
            Contacto: privacidad@keyon.app
          </Text>

          <Text style={styles.politicasSection}>6. AUTORIDAD</Text>
          <Text style={styles.politicasText}>
            Instituto Nacional de Transparencia (INAI){'\n'}
            www.inai.org.mx | Tel: 800 835 4324
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>

        <TouchableOpacity style={styles.politicasCloseBtn} onPress={onClose}>
          <Text style={styles.politicasCloseBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

// ==========================================
// PANTALLA PRINCIPAL
// ==========================================
export default function ConsentimientoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alumnoId = params.id as string;

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alumno, setAlumno] = useState<AlumnoBasico | null>(null);
  const [yaAceptado, setYaAceptado] = useState(false);

  // Modales
  const [showModalInfo, setShowModalInfo] = useState(true);
  const [showModalPoliticas, setShowModalPoliticas] = useState(false);
  const [formularioVisible, setFormularioVisible] = useState(false);

  // Ubicación e IP
  const [ubicacion, setUbicacion] = useState<UbicacionConsentimiento | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [showParentescoPicker, setShowParentescoPicker] = useState(false);

  // Checkboxes
  const [checks, setChecks] = useState([false, false, false, false]);
  const [firmaDigital, setFirmaDigital] = useState(false);

  // Firma Digital Canvas
  const [signaturePaths, setSignaturePaths] = useState<string[]>([]);
  const [currentSignaturePath, setCurrentSignaturePath] = useState<string>('');
  const signatureCanvasRef = useRef<{ width: number; height: number } | null>(null);

  // Verificación por código (WhatsApp)
  const [showModalVerificacion, setShowModalVerificacion] = useState(false);
  const [codigoVerificacion, setCodigoVerificacion] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [alumnoId]);

  const cargarDatos = async () => {
    if (!alumnoId) {
      Alert.alert('Error', 'No se especificó el alumno');
      router.back();
      return;
    }

    setLoading(true);
    try {
      const tieneConsentimiento = await verificarConsentimiento(alumnoId);
      setYaAceptado(tieneConsentimiento);

      if (!tieneConsentimiento) {
        const datosAlumno = await obtenerAlumnoBasico(alumnoId);
        setAlumno(datosAlumno);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers del modal informativo
  const handleAceptarModal = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setShowModalInfo(false);
    setObteniendoUbicacion(true);

    // Solicitar permiso y obtener ubicación
    const permisoOk = await solicitarPermisoUbicacion();
    
    if (permisoOk) {
      const { ubicacion: ubi, ip: ipAddr } = await obtenerUbicacionCompleta();
      setUbicacion(ubi);
      setIp(ipAddr);
    } else {
      // Si no da permiso, solo obtener IP
      const { ip: ipAddr } = await obtenerUbicacionCompleta();
      setIp(ipAddr);
    }

    setObteniendoUbicacion(false);
    setFormularioVisible(true);
  };

  const handleVerMas = () => {
    setShowModalPoliticas(true);
  };

  const handleCancelarModal = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Registro necesario',
      'El registro y el consentimiento son necesarios para usar la plataforma y recibir notificaciones sobre la asistencia de tu hijo/a.\n\n¿Deseas continuar más tarde?',
      [
        { text: 'Volver al inicio', onPress: () => router.back() },
        { text: 'Continuar aquí', style: 'cancel' },
      ]
    );
  };

  const toggleCheck = (index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newChecks = [...checks];
    newChecks[index] = !newChecks[index];
    setChecks(newChecks);
  };

  // ========================================
  // FUNCIONES DE FIRMA DIGITAL CANVAS
  // ========================================
  const handleTouchStart = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentSignaturePath(`M${locationX.toFixed(2)},${locationY.toFixed(2)}`);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentSignaturePath(prev => `${prev} L${locationX.toFixed(2)},${locationY.toFixed(2)}`);
  };

  const handleTouchEnd = () => {
    if (currentSignaturePath) {
      setSignaturePaths(prev => [...prev, currentSignaturePath]);
      setCurrentSignaturePath('');
      setFirmaDigital(true);
    }
  };

  const handleClearSignature = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSignaturePaths([]);
    setCurrentSignaturePath('');
    setFirmaDigital(false);
  };

  // Obtener firma como Base64 SVG
  const getSignatureBase64 = (): string | null => {
    if (signaturePaths.length === 0) return null;
    
    const width = signatureCanvasRef.current?.width || 300;
    const height = signatureCanvasRef.current?.height || 150;
    
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="white"/>
        ${signaturePaths.map(p => `<path d="${p}" stroke="#1e3a5f" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
      </svg>
    `.trim();
    
    // Convertir a base64
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  };

  const validarFormulario = (): boolean => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Ingrese su nombre completo');
      return false;
    }
    if (!parentesco) {
      Alert.alert('Campo requerido', 'Seleccione el parentesco');
      return false;
    }
    if (!telefono.trim() || telefono.length < 10) {
      Alert.alert('Campo requerido', 'Ingrese un teléfono válido (10 dígitos)');
      return false;
    }
    if (!checks.every(c => c)) {
      Alert.alert('Aceptación requerida', 'Debe aceptar todas las condiciones');
      return false;
    }
    if (!firmaDigital || signaturePaths.length === 0) {
      Alert.alert('Firma requerida', 'Debe dibujar su firma en el recuadro');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSubmitting(true);
    try {
      const tutor: DatosTutor = {
        nombre: nombre.trim(),
        parentesco,
        telefono: telefono.trim(),
        email: email.trim() || undefined,
      };

      // Solicitar verificación (el admin enviará el código por WhatsApp)
      const result = await solicitarVerificacion(alumnoId, tutor);

      if (result.success) {
        // Mostrar modal para ingresar código
        setShowModalVerificacion(true);
        setCodigoVerificacion('');
        setErrorVerificacion('');
      } else {
        Alert.alert('Error', result.message || 'No se pudo procesar la solicitud');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al procesar');
    } finally {
      setSubmitting(false);
    }
  };

  // Verificar código ingresado
  const handleVerificarCodigo = async () => {
    if (codigoVerificacion.length !== 6) {
      setErrorVerificacion('Ingresa los 6 dígitos del código');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setVerificando(true);
    setErrorVerificacion('');

    try {
      const result = await verificarCodigo(alumnoId, codigoVerificacion);

      if (result.valid) {
        // ✅ Código válido - guardar consentimiento
        setShowModalVerificacion(false);

        const tutor: DatosTutor = {
          nombre: nombre.trim(),
          parentesco,
          telefono: telefono.trim(),
          email: email.trim() || undefined,
        };

        const aceptaciones = {
          tratamientoDatos: checks[0],
          reconocimientoFacial: checks[1],
          revocacion: checks[2],
          notificaciones: checks[3],
        };

        const userAgent = `Mozilla/5.0 (${Platform.OS === 'ios' ? 'iPhone' : 'Android'}; KeyonPadresApp/1.0)`;

        // Obtener firma digital como base64
        const firmaBase64 = getSignatureBase64();

        const saveResult = await guardarConsentimiento(
          alumnoId,
          tutor,
          aceptaciones,
          userAgent,
          ubicacion,
          ip,
          firmaBase64  // ✅ Firma digital incluida
        );

        if (saveResult.success) {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert(
            '✅ Consentimiento Registrado',
            'El consentimiento ha sido guardado exitosamente. Gracias por autorizar el uso del sistema.',
            [
              {
                text: 'Continuar',
                onPress: () => router.replace('/(tabs)/inicio'),
              },
            ]
          );
        } else {
          Alert.alert('Error', saveResult.error || 'No se pudo guardar el consentimiento');
        }
      } else {
        // ❌ Código incorrecto
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setErrorVerificacion(result.message);
        setCodigoVerificacion('');
      }
    } catch (error: any) {
      setErrorVerificacion('Error de conexión');
    } finally {
      setVerificando(false);
    }
  };

  // PANTALLA DE CARGA
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // PANTALLA DE YA ACEPTADO
  if (yaAceptado) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check-circle" size={60} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Consentimiento Activo</Text>
          <Text style={styles.successText}>
            Este alumno ya tiene un consentimiento biométrico registrado y activo.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => router.replace('/(tabs)/inicio')}
          >
            <Text style={styles.successBtnText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // PANTALLA PRINCIPAL CON FORMULARIO
  return (
    <SafeAreaView style={styles.container}>
      {/* Modal Informativo */}
      <ModalInformativo
        visible={showModalInfo && !yaAceptado}
        onAceptar={handleAceptarModal}
        onVerMas={handleVerMas}
        onCancelar={handleCancelarModal}
      />

      {/* Modal Políticas */}
      <ModalPoliticas
        visible={showModalPoliticas}
        onClose={() => setShowModalPoliticas(false)}
      />

      {/* Modal Verificación por Código */}
      <Modal visible={showModalVerificacion} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 380 }]}>
            {/* Icono */}
            <View style={styles.modalIconContainer}>
              <View style={[styles.modalIconBg, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
                <Feather name="message-circle" size={40} color="#22c55e" />
              </View>
            </View>

            {/* Título */}
            <Text style={styles.modalTitle}>¡Solicitud Enviada!</Text>
            <Text style={styles.modalMessage}>
              Un administrador te enviará un código de verificación por WhatsApp al número:
            </Text>

            {/* Teléfono */}
            <View style={{
              backgroundColor: 'rgba(34,197,94,0.1)',
              borderRadius: 12,
              padding: 16,
              marginVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <View style={{
                width: 44,
                height: 44,
                backgroundColor: '#25D366',
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather name="message-circle" size={24} color="white" />
              </View>
              <View>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Recibirás el código en:</Text>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
                  {telefono.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}
                </Text>
              </View>
            </View>

            {/* Instrucciones */}
            <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
              Espera el mensaje de WhatsApp e ingresa el código de 6 dígitos aquí:
            </Text>

            {/* Input código */}
            <TextInput
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 2,
                borderColor: codigoVerificacion.length === 6 ? '#22c55e' : '#334155',
                borderRadius: 12,
                padding: 16,
                fontSize: 28,
                color: 'white',
                textAlign: 'center',
                letterSpacing: 12,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              }}
              value={codigoVerificacion}
              onChangeText={(text) => {
                setCodigoVerificacion(text.replace(/\D/g, '').substring(0, 6));
                setErrorVerificacion('');
              }}
              placeholder="------"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {/* Error */}
            {errorVerificacion ? (
              <Text style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                {errorVerificacion}
              </Text>
            ) : null}

            {/* Tiempo */}
            <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
              ⏱️ El código expira en 30 minutos
            </Text>

            {/* Botones */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  backgroundColor: '#334155',
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={() => setShowModalVerificacion(false)}
              >
                <Text style={{ color: 'white', fontSize: 15 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  backgroundColor: codigoVerificacion.length === 6 ? '#22c55e' : '#334155',
                  borderRadius: 12,
                  alignItems: 'center',
                  opacity: verificando ? 0.7 : 1,
                }}
                onPress={handleVerificarCodigo}
                disabled={verificando || codigoVerificacion.length !== 6}
              >
                {verificando ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>Verificar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Ayuda */}
            <TouchableOpacity
              style={{ marginTop: 16 }}
              onPress={() => Alert.alert(
                '¿No recibiste el código?',
                '1. Verifica que el número de teléfono sea correcto\n2. Revisa tus mensajes de WhatsApp\n3. Espera unos minutos, el administrador debe enviarlo\n4. Si el problema persiste, contacta a la escuela\n\n📞 Teléfono: (493) 188 7739'
              )}
            >
              <Text style={{ color: '#06b6d4', fontSize: 13, textAlign: 'center' }}>
                ¿No recibiste el código?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Obteniendo ubicación */}
      {obteniendoUbicacion && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingOverlayText}>Preparando registro...</Text>
            <Text style={styles.loadingOverlaySubtext}>Obteniendo ubicación</Text>
          </View>
        </View>
      )}

      {/* Formulario */}
      {formularioVisible && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Feather name="shield" size={32} color="white" />
              </View>
              <View>
                <Text style={styles.headerTitle}>{TEXTOS_LEGALES.titulo}</Text>
                <Text style={styles.headerSubtitle}>{TEXTOS_LEGALES.subtitulo}</Text>
              </View>
            </View>

            {/* Info Alumno */}
            {alumno && (
              <View style={styles.alumnoCard}>
                <View style={styles.alumnoAvatar}>
                  <Text style={styles.alumnoInitials}>
                    {alumno.nombre.charAt(0)}{alumno.apellidos.charAt(0)}
                  </Text>
                </View>
                <View style={styles.alumnoInfo}>
                  <Text style={styles.alumnoNombre}>
                    {alumno.nombre} {alumno.apellidos}
                  </Text>
                  <Text style={styles.alumnoDetalle}>
                    No. Control: {alumno.id} · {alumno.grado}° {alumno.grupo}
                  </Text>
                </View>
              </View>
            )}

            {/* Indicador de ubicación */}
            <View style={styles.ubicacionIndicator}>
              <Feather 
                name={ubicacion ? "check-circle" : "alert-circle"} 
                size={16} 
                color={ubicacion ? "#10b981" : "#f59e0b"} 
              />
              <Text style={[styles.ubicacionText, { color: ubicacion ? "#10b981" : "#f59e0b" }]}>
                {ubicacion 
                  ? `Ubicación: ${ubicacion.ciudad || 'Obtenida'}, ${ubicacion.region || ubicacion.pais}`
                  : 'Ubicación no disponible (se usará IP)'}
              </Text>
            </View>

            {/* Secciones Legales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{TEXTOS_LEGALES.seccion1.titulo}</Text>
              {TEXTOS_LEGALES.seccion1.items.map((item, i) => (
                <Text key={i} style={styles.sectionItem}>
                  • <Text style={styles.bold}>{item.label}</Text> {item.desc}
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{TEXTOS_LEGALES.seccion2.titulo}</Text>
              {TEXTOS_LEGALES.seccion2.items.map((item, i) => (
                <Text key={i} style={styles.sectionItem}>✓ {item}</Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{TEXTOS_LEGALES.seccion3.titulo}</Text>
              {TEXTOS_LEGALES.seccion3.items.map((item, i) => (
                <Text key={i} style={styles.sectionItemSmall}>• {item}</Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{TEXTOS_LEGALES.seccion4.titulo}</Text>
              <Text style={styles.sectionItem}>{TEXTOS_LEGALES.seccion4.descripcion}</Text>
              <Text style={styles.sectionItemSmall}>
                Contacto: {TEXTOS_LEGALES.seccion4.contacto}
              </Text>
            </View>

            {/* Formulario */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>👤 Datos del Padre/Madre/Tutor</Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre completo *"
                placeholderTextColor="#64748b"
                value={nombre}
                onChangeText={setNombre}
              />

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.input, styles.picker]}
                  onPress={() => setShowParentescoPicker(!showParentescoPicker)}
                >
                  <Text style={parentesco ? styles.pickerText : styles.pickerPlaceholder}>
                    {parentesco || 'Parentesco *'}
                  </Text>
                  <Feather name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Teléfono *"
                  placeholderTextColor="#64748b"
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {showParentescoPicker && (
                <View style={styles.pickerOptions}>
                  {PARENTESCOS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={styles.pickerOption}
                      onPress={() => {
                        setParentesco(p.value);
                        setShowParentescoPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Correo electrónico (opcional)"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Checkboxes */}
            <View style={styles.checksSection}>
              {TEXTOS_LEGALES.checkboxes.map((text, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.checkRow}
                  onPress={() => toggleCheck(i)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, checks[i] && styles.checkboxChecked]}>
                    {checks[i] && <Feather name="check" size={14} color="white" />}
                  </View>
                  <Text style={styles.checkText}>{text}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Firma Digital - Canvas */}
            <View style={styles.firmaCanvasSection}>
              <View style={styles.firmaHeader}>
                <View style={styles.firmaTitleRow}>
                  <Feather name="edit-3" size={18} color="#f59e0b" />
                  <Text style={styles.firmaTitle}>✍️ Firma Digital</Text>
                </View>
                <TouchableOpacity 
                  style={styles.firmaClearBtn} 
                  onPress={handleClearSignature}
                >
                  <Feather name="trash-2" size={16} color="#ef4444" />
                  <Text style={styles.firmaClearText}>Limpiar</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.firmaInstructions}>
                Dibuje su firma en el recuadro con el dedo
              </Text>

              {/* Canvas SVG */}
              <View 
                style={[
                  styles.firmaCanvas,
                  signaturePaths.length > 0 && styles.firmaCanvasSigned
                ]}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onLayout={(e) => {
                  signatureCanvasRef.current = {
                    width: e.nativeEvent.layout.width,
                    height: e.nativeEvent.layout.height,
                  };
                }}
              >
                <Svg width="100%" height={150}>
                  {signaturePaths.map((path, idx) => (
                    <Path
                      key={idx}
                      d={path}
                      stroke="#1e3a5f"
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {currentSignaturePath && (
                    <Path
                      d={currentSignaturePath}
                      stroke="#1e3a5f"
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </Svg>

                {/* Placeholder */}
                {signaturePaths.length === 0 && !currentSignaturePath && (
                  <View style={styles.firmaPlaceholder} pointerEvents="none">
                    <Feather name="edit-2" size={28} color="#cbd5e1" />
                    <Text style={styles.firmaPlaceholderText}>Firme aquí</Text>
                  </View>
                )}

                {/* Línea de firma */}
                <View style={styles.firmaLine} pointerEvents="none" />
              </View>

              {/* Estado */}
              <View style={styles.firmaStatus}>
                {signaturePaths.length > 0 ? (
                  <>
                    <Feather name="check-circle" size={14} color="#10b981" />
                    <Text style={[styles.firmaStatusText, { color: '#10b981' }]}>
                      Firma registrada
                    </Text>
                  </>
                ) : (
                  <>
                    <Feather name="alert-circle" size={14} color="#f59e0b" />
                    <Text style={[styles.firmaStatusText, { color: '#f59e0b' }]}>
                      Firma requerida
                    </Text>
                  </>
                )}
              </View>

              <Text style={styles.firmaLegalText}>
                Esta firma digital tiene validez legal conforme al Art. 8 de la LFPDPPP.
                Al firmar, declaro ser el padre, madre o tutor legal del alumno.
              </Text>
            </View>

            {/* Botones */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => router.back()}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Feather name="check" size={20} color="white" />
                    <Text style={styles.submitBtnText}>Otorgar Consentimiento</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Link políticas */}
            <TouchableOpacity 
              style={styles.policiesLink}
              onPress={() => setShowModalPoliticas(true)}
            >
              <Text style={styles.policiesText}>Ver Políticas de Privacidad Completas</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ==========================================
// ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },

  // Modal Informativo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  modalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalShield: {
    position: 'absolute',
    bottom: -5,
    right: width / 2 - 70,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
  },
  modalMessage: {
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  modalMessageSecondary: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  beneficiosList: {
    marginBottom: 20,
  },
  beneficioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beneficioText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  modalLegal: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  modalButtons: {
    gap: 12,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 14,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  btnSecondaryText: {
    color: '#0ea5e9',
    fontSize: 15,
    fontWeight: '500',
  },
  btnTertiary: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  btnTertiaryText: {
    color: '#64748b',
    fontSize: 14,
  },

  // Modal Políticas
  politicasContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  politicasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  politicasTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeBtn: {
    padding: 8,
  },
  politicasContent: {
    flex: 1,
    padding: 20,
  },
  politicasSection: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0ea5e9',
    marginTop: 20,
    marginBottom: 10,
  },
  politicasText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 22,
  },
  politicasCloseBtn: {
    margin: 20,
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  politicasCloseBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingCard: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingOverlaySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#0ea5e9',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Alumno Card
  alumnoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  alumnoAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alumnoInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  alumnoInfo: {
    flex: 1,
  },
  alumnoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  alumnoDetalle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },

  // Indicador ubicación
  ubicacionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  ubicacionText: {
    fontSize: 13,
  },

  // Sections
  section: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#06b6d4',
    marginBottom: 12,
  },
  sectionItem: {
    fontSize: 14,
    color: '#94a3b8',
    paddingVertical: 4,
  },
  sectionItemSmall: {
    fontSize: 13,
    color: '#64748b',
    paddingVertical: 2,
  },
  bold: {
    fontWeight: '600',
    color: '#cbd5e1',
  },

  // Form
  formSection: {
    backgroundColor: 'rgba(6,182,212,0.1)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.3)',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#06b6d4',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#f1f5f9',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    color: '#f1f5f9',
    fontSize: 15,
  },
  pickerPlaceholder: {
    color: '#64748b',
    fontSize: 15,
  },
  pickerOptions: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerOptionText: {
    color: '#f1f5f9',
    fontSize: 15,
  },

  // Checkboxes
  checksSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#06b6d4',
  },
  checkboxLarge: {
    width: 26,
    height: 26,
    borderColor: '#f59e0b',
  },
  checkboxCheckedOrange: {
    backgroundColor: '#f59e0b',
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },

  // Firma Digital Canvas
  firmaCanvasSection: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  firmaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  firmaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  firmaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
  },
  firmaClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 8,
  },
  firmaClearText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  firmaInstructions: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  firmaCanvas: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 150,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  firmaCanvasSigned: {
    borderColor: '#f59e0b',
    borderStyle: 'solid',
  },
  firmaPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  firmaPlaceholderText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 8,
  },
  firmaLine: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  firmaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  firmaStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  firmaLegalText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 16,
  },

  // Buttons
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Policies
  policiesLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  policiesText: {
    color: '#06b6d4',
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  successBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
