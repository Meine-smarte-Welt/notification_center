[🇩🇪 Deutsch](README.md) · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md) · 🇪🇸 Español

# Notification Center

<p align="center">
  <img src="https://raw.githubusercontent.com/Meine-smarte-Welt/notification_center/main/custom_components/notification_center/brand/icon.png" width="96" alt="Notification Center">
</p>

Una integración de Home Assistant que reúne los **mensajes de tus integraciones**, las **notificaciones**, las **actualizaciones** y las **reparaciones** en una sola tarjeta del panel - con modo silencioso, entrega push mediante perfiles de destinatario, widget de Android y envío rápido.

## Funciones

- **Mensajes:** las integraciones (p. ej. Fritz!Box, Zigbee2MQTT Manager, Matter Manager) notifican eventos al Notification Center, ordenados por urgencia: crítico, advertencia, info, correcto
- **Modo silencioso:** retiene las notificaciones push; los mensajes siguen visibles en la tarjeta y el widget; los críticos pueden saltárselo
- **Entrega por urgencia:** push mediante tus perfiles de destinatario (cambiar de teléfono = un solo cambio)
- **Resumen de orígenes:** qué integración está registrada, su versión y qué tipos de mensaje tiene desactivados
- **Historial:** mensajes resueltos y confirmados (30 días por defecto, 200 como máximo)
- Cuatro sensores de lista más un sensor de perfiles, widget de plantilla de Android, envío rápido, scripts y blueprints
- Tarjeta con pestañas, chips estadísticos, búsqueda, ordenación, ventana de detalle, banner, confirmación con dos clics y colores libres
- Todo en **cinco idiomas**: alemán, inglés, neerlandés, francés, español

## Requisitos

- Home Assistant 2025.6 o posterior
- HACS (recomendado) o instalación manual
- Opcional: las integraciones hermanas en versión 1.0.0 para que lleguen mensajes

## Instalación

**HACS:** añade el repositorio personalizado `https://github.com/Meine-smarte-Welt/notification_center` (categoría *Integración*), instala «Notification Center» y reinicia Home Assistant. Solo verás las versiones preliminares (beta/RC) si activas «Mostrar versiones beta» en HACS.

**Manual:** copia la carpeta `custom_components/notification_center` en tu directorio `config` y reinicia.

## Configuración

Ajustes → Dispositivos y servicios → **Añadir integración** → «Notification Center». No se necesitan credenciales y solo existe una instancia.

**Perfiles de destinatario:** *Configurar* → *Añadir perfil* (nombre, tipo teléfono/correo, destino `notify`). Si cambias de teléfono, solo cambia el destino del perfil.

**Modo silencioso, entrega, historial:** también en *Configurar* o directamente en la tarjeta (engranaje → Opciones).

## La tarjeta

Las pestañas (orden fijo, la pestaña del engranaje es siempre la última):

- **Mensajes:** mensajes de las integraciones, chips con contador (Crítico/Advertencia/Info), historial, confirmar
- **Notificaciones:** notificaciones persistentes de Home Assistant
- **Actualizaciones:** actualizaciones disponibles, instalar desde la ventana
- **Reparaciones:** reparaciones abiertas
- **Enviar:** envío rápido a un perfil
- **Engranaje:** versión de la aplicación, orígenes, opciones, mantenimiento, eventos

```yaml
type: custom:notification-center-card
title: Notification Center
default_tab: messages
entities:
  messages: sensor.notification_center_meldungen
  notifications: sensor.notification_center_benachrichtigungen
  updates: sensor.notification_center_updates
  repairs: sensor.notification_center_reparaturen
  recipients: sensor.notification_center_profile
```

| Clave | Significado |
|---|---|
| `title / show_title / icon` | Título, mostrar/ocultar título, icono de cabecera |
| `default_tab` | Pestaña inicial (`messages`, `notifications`, `updates`, `repairs`, `send`, `settings`) |
| `default_sort` | Ordenación predeterminada (`default`, `newest`, `oldest`, `title`) |
| `show_messages … show_settings` | Cada categoría se activa/desactiva por separado (al menos una permanece visible) |
| `show_search / show_filter_bar / show_stats` | Campo de búsqueda, selección de orden, chips estadísticos/de filtro |
| `max_rows` | Número máximo de filas (0 = todas) |
| `zoom` | Escala de la tarjeta en porcentaje (50-150) |
| `read_only` | oculta todos los controles que modifican algo |
| `show_builder` | Zona «Scripts & Blueprints» |
| `entities.*` | Sensores (`messages` es nuevo, ID predeterminado `sensor.notification_center_meldungen`) |

## Colores

Todos los colores se ajustan por tarjeta (sección *Colores* del editor). Vacío = predeterminado del tema. Permitidos: hex, `rgb()`, `hsl()` y `var(--…)`.

| Clave | Predeterminado |
|---|---|
| `color_message` | `#03a9f4` |
| `color_notification` | `#0288d1` |
| `color_update` | `#fb8c00` |
| `color_repair` | `#e53935` |
| `color_send` | `#03a9f4` |
| `color_error` | `#db4437` |
| `color_warning` | `#ff9800` |
| `color_info` | `#039be5` |
| `color_success` | `#43a047` |

## Servicios

`notification_center.send` envía un mensaje a un perfil de destinatario. «Urgente» salta el modo silencioso en los teléfonos (Android: canal de alarma, iOS: Critical Alert); en el correo se añade un prefijo al asunto.

```yaml
action: notification_center.send
data:
  recipient: Thorsten Handy
  title: Waschmaschine
  message: Die Wäsche ist fertig.
  urgency: normal               # normal | high | critical
```

## Eventos (interfaz para integraciones)

Las integraciones se dirigen al Notification Center mediante el bus de eventos de Home Assistant (sin MQTT). Todos los datos incluyen `schema: 1`. El Notification Center es **opcional** para las integraciones: si no está instalado, allí no pasa nada.

| Evento | Dirección | Finalidad |
|---|---|---|
| `notification_center_register` | Integración → NC | catálogo de tipos de mensaje (urgencia, icono, textos en cinco idiomas, estado del interruptor) |
| `notification_center_report` | Integración → NC | un mensaje: `state` = `active` o `resolved`, `key` estable, `subject`, `placeholders`, `initial` |
| `notification_center_sync` | Integración → NC | qué claves de un tipo resoluble están activas; los demás mensajes abiertos se cierran en silencio |
| `notification_center_ping` | NC → integraciones | al iniciarse el NC; cada integración responde con register y sync |

- Los mensajes solo llevan claves y marcadores. Los textos proceden del catálogo del origen y aparecen en el idioma de Home Assistant (respaldo: inglés).
- `initial: true` (estado inicial tras el arranque/sync) aparece en la tarjeta pero **no** dispara push.
- Los tipos no resolubles (p. ej. llamada perdida) permanecen hasta que los confirmes; la sync nunca los cierra.
- Los números de teléfono, nombres y textos nunca se escriben en el registro.

Ejemplo de un mensaje:

```yaml
event: notification_center_report
event_data:
  schema: 1
  source: meine_integration
  entry_id: beispiel
  type: door_open
  key: haustuer
  state: active
  subject: { id: haustuer, name: Haustür, kind: device }
  placeholders: { name: Haustür }
```

## Sensores

| Sensor | Estado | Atributos |
|---|---|---|
| **Mensajes** | número de mensajes abiertos | `items`, `summary`, `by_severity`, `history`, `sources`, `settings`, `app`, `log` |
| **Notificaciones** | número | `items`, `summary` |
| **Actualizaciones** | número | `items`, `summary` |
| **Reparaciones** | número | `items`, `summary` |
| **Perfiles** | número de perfiles | `items`, `summary` |

Los atributos grandes no se guardan en la base de datos a largo plazo.

## Modo silencioso y entrega

- **Modo silencioso activado:** sin notificaciones push. Los mensajes siguen visibles en la tarjeta y el widget. Un banner en la tarjeta lo indica.
- **Entregar igualmente los críticos** (activado por defecto): `critical` se salta el modo silencioso mediante la función de urgencia de la notificación del teléfono.
- **Entrega por urgencia:** sin elección propia, los mensajes críticos y las advertencias se envían por push a todos los perfiles de teléfono; info y correcto solo aparecen en la tarjeta y el widget.
- **Agrupación:** los 5 primeros mensajes del mismo tipo en 10 segundos salen por separado, los siguientes se unen en **un solo** push («N mensajes más»). Todos los mensajes individuales permanecen en la lista.

## Indicación de versión y aviso de actualización

La versión aparece en tres lugares: en el engranaje (Versión de la aplicación), arriba en el editor de la tarjeta (`Tarjeta 1.0.0 · Integración 1.0.0`) y en el diálogo de opciones. La integración consulta `api.github.com` al iniciar y luego cada 12 horas (con versiones preliminares para beta/RC). Nueva versión → aviso naranja, «↑» en el engranaje; tarjeta e integración con versiones distintas (caché del navegador) → también naranja; GitHub inaccesible → «Comprobación no posible», la tarjeta sigue funcionando.

## Ajustes (engranaje)

Orden fijo de los acordeones: **Versión de la aplicación** · **Orígenes** · **Opciones** (modo silencioso, entrega) · **Mantenimiento** (mensaje de prueba, confirmar todo, vaciar historial, cada uno con confirmación de dos clics) · **Eventos** (registro desde el inicio, sin contenido). Solo los administradores pueden cambiar cosas.

## Widget de Android

En el editor de la tarjeta (sección *Widgets*) hay un texto fuente listo para un widget de plantilla de la app Companion, por sensor o todos juntos. La app Companion solo muestra HTML sencillo; las líneas separadoras son caracteres «─» (longitud mediante la variable `line`). Activa el acceso a notificaciones para la app Companion; si no, el widget solo se actualiza cada 30 minutos.

## Scripts & Blueprints

Bajo la lista puedes montar scripts, blueprints de script y blueprints de automatización (se necesita administrador). Los scripts existentes nunca se sobrescriben, los blueprints solo tras confirmar.

## Seguridad

- Las acciones de escritura (confirmar, interruptores, mantenimiento, mensaje de prueba, scripts/blueprints) son solo para administradores; las entradas se validan en el backend.
- Todos los textos de la tarjeta se escapan, los valores de color pasan por una lista permitida.
- Los mensajes no contienen credenciales; textos, nombres y números de teléfono no llegan al registro ni al diagnóstico.
- Las acciones arriesgadas piden dos clics en lugar de un diálogo del navegador.
- El enlace de la versión solo se muestra si empieza por `https://github.com/`.

## Limitaciones conocidas

- **No probado en una instancia real de Home Assistant ni con teléfonos reales.** Comprobado: la lógica del hub contra un bus de eventos simulado (14 pruebas), la tarjeta en un navegador sin interfaz con datos de prueba (todas las pestañas, ventana, engranaje, cinco idiomas, editor) y sintaxis/JSON. El comportamiento en la interfaz real de Home Assistant está **sin comprobar**.
- **La interacción con las integraciones hermanas está sin comprobar:** solo se usaron eventos simulados, no datos reales de Fritz!Box, Zigbee2MQTT o Matter.
- Que «Urgente» salte realmente el modo silencioso en tu dispositivo depende de los ajustes de Android/iOS (permisos de canal, No molestar, alertas críticas). Pruébalo con el mensaje de prueba.
- Los perfiles de correo se pueden elegir técnicamente para la entrega, pero el correo no forma parte del alcance probado de la 1.0.0.
- No incluido: silenciar dispositivos concretos, horario para el modo silencioso.
- Las notificaciones persistentes se leen de forma defensiva de un almacén interno de Home Assistant; si eso cambia, la categoría queda vacía.
- Las traducciones al neerlandés, francés y español son automáticas y no están revisadas por hablantes nativos - se agradecen correcciones.
- Los scripts y blueprints solo se crean; editar y borrar se hace en Home Assistant.

## Solución de problemas

| Problema | Solución |
|---|---|
| La tarjeta muestra «Custom element doesn’t exist» | Vacía la caché del navegador (Ctrl+F5); en modo YAML añade a mano el recurso `/notification_center_files/notification-center-card.js` (tipo `module`). |
| Falta la pestaña «Mensajes» | El sensor `sensor.notification_center_meldungen` solo existe tras reiniciar con la 1.0.0. Revisa la entrada `entities.messages`. |
| No llegan mensajes de una integración | Engranaje → Orígenes: ¿está registrado el origen? La integración debe ser la versión 1.0.0 con «enviar mensajes» activado. |
| Sin push | ¿Está activado el modo silencioso? ¿Hay un perfil elegido para esa urgencia (engranaje → Opciones)? Compruébalo con el mensaje de prueba. |
| Falla la comprobación de actualización | Home Assistant necesita acceso a Internet a `api.github.com`; la tarjeta sigue funcionando. |

## Integridad de archivos

Cada `.py`, `.js` y `.yaml` empieza con una cabecera SHA256 (contenido desde la línea 2). Comprobar con `tail -n +2 archivo.py | sha256sum`. Las sumas de comprobación de los archivos JSON están en [docs/datei-integritaet.md](docs/datei-integritaet.md).

## Historial de versiones

### 1.0.0

- Nuevo: **mensajes** de las integraciones (interfaz esquema 1: register, report, sync, ping), urgencia, historial, confirmar, resumen de orígenes
- Nuevo: **modo silencioso**, «entregar igualmente los críticos», **entrega por urgencia**, agrupación, mensaje de prueba
- Nuevo: pestaña de engranaje con versión de la aplicación, orígenes, opciones, mantenimiento, eventos; aviso de actualización vía GitHub
- Nuevo: chips estadísticos, ordenación, banner, toast, ventana con acordeón, `default_tab`, `zoom`, `read_only`, `max_rows`
- Nuevo: **cinco idiomas** en tarjeta, opciones y servicios; logotipo (`logo.png`), descarga de diagnóstico, `LICENSE`
- Cambiado: la pestaña «Mensajes» es la pestaña inicial predeterminada (cambiable con `default_tab`)
- Tras la actualización reinicia Home Assistant y vacía la caché del navegador (Ctrl+F5)

Todas las versiones: [docs/versionshistorie.md](docs/versionshistorie.md)

## Licencia

MIT
