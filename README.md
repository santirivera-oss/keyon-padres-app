# 📱 Keyon Padres - App Nativa

App nativa para iOS y Android para padres de familia del sistema Keyon Access.

## 🚀 Características

- ✅ **Estado en tiempo real** - Ve si tu hijo está dentro o fuera del plantel
- ✅ **Historial de asistencia** - Registro completo de entradas y salidas
- ✅ **Estadísticas mensuales** - Días asistidos, faltas, retardos
- ✅ **Notificaciones push** - Alertas cuando tu hijo ingresa/sale
- ✅ **Sincronización en tiempo real** - Actualización automática con Firebase
- ✅ **Diseño nativo** - UI optimizada para cada plataforma
- ✅ **Offline support** - Caché de datos para uso sin conexión

---

## 📋 Requisitos

- **Node.js** 18+ 
- **npm** o **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **EAS CLI** (`npm install -g eas-cli`)
- **Firebase Project** configurado
- **Apple Developer Account** ($99/año) - Para iOS
- **Google Play Developer Account** ($25 único) - Para Android

---

## ⚙️ Instalación

### 1. Clonar e instalar dependencias

```bash
# Navegar al proyecto
cd keyon-padres-app

# Instalar dependencias
npm install
```

### 2. Configurar Firebase

Edita el archivo `constants/Config.ts` con tus credenciales:

```typescript
export const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
};
```

### 3. Configurar identificadores de app

Edita `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.tuempresa.keyonpadres"
    },
    "android": {
      "package": "com.tuempresa.keyonpadres"
    }
  }
}
```

### 4. Agregar archivos de Firebase

**Para Android:**
1. Descarga `google-services.json` de Firebase Console
2. Colócalo en la raíz del proyecto

**Para iOS:**
1. Descarga `GoogleService-Info.plist` de Firebase Console
2. Se agregará automáticamente durante el build

### 5. Crear iconos

Genera los iconos en: https://www.pwabuilder.com/imageGenerator

Coloca en `assets/images/`:
- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024)
- `splash.png` (1284x2778)
- `favicon.png` (48x48)

### 6. Descargar fuentes

Descarga Plus Jakarta Sans de Google Fonts y colócalas en `assets/fonts/`:
- PlusJakartaSans-Regular.ttf
- PlusJakartaSans-Medium.ttf
- PlusJakartaSans-SemiBold.ttf
- PlusJakartaSans-Bold.ttf
- PlusJakartaSans-ExtraBold.ttf

---

## 🏃 Desarrollo

### Iniciar en modo desarrollo

```bash
# Iniciar Expo
npm start

# O directamente en dispositivo
npm run android  # Android
npm run ios      # iOS (requiere Mac)
```

### Probar en dispositivo físico

1. Instala **Expo Go** en tu teléfono
2. Escanea el QR code que aparece en la terminal
3. La app se cargará en tu dispositivo

---

## 📦 Build para Producción

### Configurar EAS

```bash
# Login en Expo
eas login

# Configurar proyecto
eas build:configure
```

### Build para Android (APK de prueba)

```bash
# APK para pruebas internas
eas build --platform android --profile preview
```

### Build para Android (Play Store)

```bash
# AAB para Play Store
eas build --platform android --profile production
```

### Build para iOS

```bash
# Requiere Apple Developer Account
eas build --platform ios --profile production
```

---

## 🚀 Publicar en Tiendas

### Google Play Store

1. Crea cuenta de desarrollador ($25 único)
2. Crea la app en Play Console
3. Sube el AAB generado
4. Completa la información de la tienda
5. Envía a revisión

```bash
# Subir automáticamente
eas submit --platform android
```

### Apple App Store

1. Crea cuenta de desarrollador ($99/año)
2. Crea la app en App Store Connect
3. Configura certificados y perfiles
4. Sube el build

```bash
# Subir automáticamente
eas submit --platform ios
```

---

## 📁 Estructura del Proyecto

```
keyon-padres-app/
├── app/                    # Rutas (Expo Router)
│   ├── (auth)/            # Rutas de autenticación
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/            # Tabs principales
│   │   ├── _layout.tsx
│   │   ├── inicio.tsx
│   │   ├── historial.tsx
│   │   ├── estadisticas.tsx
│   │   └── perfil.tsx
│   └── _layout.tsx        # Layout raíz
├── components/            # Componentes reutilizables
│   ├── ui/               # Botones, Cards, Inputs
│   ├── home/             # Componentes de inicio
│   └── shared/           # Componentes compartidos
├── services/             # Lógica de Firebase
│   ├── firebase.ts
│   ├── auth.ts
│   ├── attendance.ts
│   └── notifications.ts
├── store/                # Estado global (Zustand)
│   └── useStore.ts
├── hooks/                # Custom hooks
├── types/                # TypeScript types
├── constants/            # Colores, configuración
├── assets/               # Imágenes, fuentes
├── app.json              # Configuración Expo
├── eas.json              # Configuración builds
└── package.json
```

---

## 🔧 Configuración Avanzada

### Notificaciones Push

1. Configura Firebase Cloud Messaging
2. Obtén la clave VAPID
3. Actualiza en `services/notifications.ts`

### Cambiar colores

Edita `constants/Colors.ts`:

```typescript
export const Colors = {
  primary: '#06b6d4',      // Tu color primario
  secondary: '#8b5cf6',    // Tu color secundario
  // ...
};
```

### Agregar nuevas pantallas

1. Crea archivo en `app/(tabs)/nueva-pantalla.tsx`
2. Agrega el tab en `app/(tabs)/_layout.tsx`

---

## 📊 Colecciones Firebase Requeridas

### `alumnos`
```javascript
{
  nombre: "Juan",
  apellidos: "Pérez García",
  control: "23310123",
  grado: "3",
  grupo: "A",
  turno: "Matutino"
}
```

### `ingresos_cbtis`
```javascript
{
  identificador: "23310123",
  nombre: "Juan Pérez García",
  tipoPersona: "Alumno",
  tipoRegistro: "Ingreso" | "Salida",
  fecha: "2025-01-04",
  hora: "07:15:30",
  modo: "facial" | "qr" | "barcode",
  timestamp: "2025-01-04T07:15:30.000Z"
}
```

### `padres_codigos` (opcional)
```javascript
{
  alumnoId: "abc123",
  codigo: "123456"
}
```

---

## 🆘 Solución de Problemas

### Error "Unable to resolve module"
```bash
npm start --clear
# o
expo start -c
```

### Error en build de Android
```bash
cd android && ./gradlew clean && cd ..
eas build --platform android --clear-cache
```

### Error en build de iOS
```bash
eas build --platform ios --clear-cache
```

### Notificaciones no funcionan
- Verifica que Firebase esté configurado
- Prueba en dispositivo físico (no simulador)
- Revisa permisos de notificación

---

## 📈 Mejoras Futuras

- [ ] Chat con profesores
- [ ] Ver horarios del alumno
- [ ] Calificaciones en tiempo real
- [ ] Calendario de eventos
- [ ] Justificación de faltas online
- [ ] Múltiples hijos por cuenta
- [ ] Modo claro/oscuro
- [ ] Widgets para iOS/Android
- [ ] Apple Watch companion app

---

## 📄 Licencia

© 2025 Keyon Access System - Todos los derechos reservados.

---

## 🤝 Soporte

- 📧 Email: soporte@keyon.app
- 📞 Teléfono: (+52) 493 188 7739
- 📖 Docs: https://docs.keyon.app
