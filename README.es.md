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
- **Origen:** cada aviso muestra el logotipo de la integración de origen (si no, el icono de la fuente). Un clic abre la ventana con la tarjeta de la integración (si existe) y «Abrir integración»
- **Asignar tú los niveles:** en el engranaje decides por tipo de aviso si es crítico, advertencia, info o correcto. **Importación:** reglas y el servicio `notification_center.report` convierten integraciones sin interfaz propia en fuentes, p. ej. Watchman
- **Entradas (asignación):** tú decides qué campo de otra integración es título, texto, clave y nivel. Así se conecta cualquier integración que dispare un evento o llame a una acción
- **Agrupar:** además de ordenar, las listas se pueden agrupar, p. ej. los avisos por integración, urgencia o tipo de aviso. Los grupos se pueden plegar
- **Tarjeta emergente en YAML:** pega simplemente el código del editor de tarjetas, sin necesidad de JSON

## Requisitos

- Home Assistant 2025.6 o posterior
- HACS (recomendado) o instalación manual
- Opcional: las integraciones hermanas en versión 1.0.0 para que lleguen mensajes

## Instalación

**HACS:** añade el repositorio personalizado `https://github.com/Meine-smarte-Welt/notification_center` (categoría *Integración*), instala «Notification Center» y reinicia Home Assistant.

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
| `show_group_by` / `default_group_by` | Mostrar la selección de agrupación; agrupación predeterminada (`none`, `integration`, `severity`, `type`, según la lista) |
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

`notification_center.report` crea o actualiza un aviso (misma `key` = mismo aviso); con `state: resolved` se cierra. Cualquier automatización, script o integración que pueda llamar a una «acción» puede informar así.

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
- El registro puede incluir opcionalmente `domain` (dominio de la integración para el logotipo) y `card` (configuración de tarjeta Lovelace para la ventana, máx. 4 KB). Una tarjeta que escribas en el engranaje tiene prioridad.

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

## Importación: conectar cualquier integración (p. ej. Watchman)

Las integraciones que no hablan por sí mismas con Notification Center se conectan de tres maneras. Todas crean avisos normales con nivel, historial, confirmación y push.

1. **Regla de importación (engranaje → Importaciones):** convierte cualquier entidad en un aviso. Modo *número mayor que 0* (contador) o *el estado es uno de …*. El título y el mensaje son plantillas opcionales como en Home Assistant (`{{ state }}`, `{{ name }}`, `{{ attrs.xyz }}`). Cuando la condición vuelve a ser falsa, el aviso se cierra solo. Un aviso que ya existe al arrancar no dispara push.
2. **Servicio `notification_center.report`:** para el texto que una integración envía por sí misma. Muchas integraciones pueden llamar a cualquier acción como destino; escribe ahí `notification_center.report` y el texto llega como aviso a Notification Center.
3. **Eventos (esquema 1):** la vía limpia para integraciones que quieran admitir Notification Center (ver arriba). El registro puede incluir opcionalmente `domain` (para el logotipo) y `card` (tarjeta Lovelace para la ventana).

**Ejemplo Watchman:** en el engranaje, en *Importaciones* → *Nueva regla* → *Plantilla de Watchman*. Vigila `sensor.watchman_missing_entities` (número de entidades que faltan) y crea o cierra el aviso. Crea la misma regla para `sensor.watchman_missing_actions`. El informe detallado en texto se obtiene así:

```yaml
action: watchman.report
data:
  create_file: false
  action: notification_center.report
  data:
    source: Watchman
    title: Watchman
    severity: warning
    key: report
```

Según la documentación de Watchman, `watchman.report` acepta cualquier acción de notificación (`action`) con datos adicionales (`data`). Que Watchman pase `message` y `title` como espera `notification_center.report` **no está probado con una instalación real de Watchman**. Si no te funciona, la regla de importación para el contador sigue siendo la vía segura. Los informes largos se pueden dividir en Watchman con `chunk_size`.

```yaml
action: notification_center.report
data:
  source: My script            # shown as the source; also decides the logo
  title: Backup
  message: The backup failed.
  severity: critical           # critical | warning | info | ok
  key: backup                  # same key = the same message is updated
  # state: resolved            # closes the message again
```

## Entradas: asignar tú mismo título, texto y nivel

Si no sabes (o no estás seguro) qué campos envía una integración, asígnalos tú: engranaje → **Entradas** → *Nueva regla*.

1. **Elegir el disparador:** cualquier **evento** de Home Assistant (escribe su nombre) o una **llamada de servicio** a `notification_center.inbound` con el campo `rule`.
2. **Ver el último contenido:** en cuanto llegue algo, la regla muestra el último contenido recibido («Último contenido»). Ahí ves los nombres reales de los campos.
3. **Asignar los campos:** título, texto y clave son plantillas sobre los campos recibidos, p. ej. `{{ data.message }}`. Sin entrada se muestra el nombre de la regla o el contenido en bruto.
4. **Asignar el nivel:** fijo, o desde un campo mediante una tabla de valores, p. ej. campo `{{ data.level }}` y tabla `error=critical, warning=warning`. Los demás valores reciben el nivel fijo.
5. **Cerrar:** opcionalmente una condición como `{{ data.count | int == 0 }}`; si es verdadera, el aviso se cierra. Misma clave = se actualiza el mismo aviso.

**Ejemplo Watchman:** elige en la regla la *plantilla de Watchman* (disparador servicio, texto `{{ data.message }}`), guarda y llama a `watchman.report` así:

```yaml
action: watchman.report
data:
  create_file: false
  action: notification_center.inbound
  data:
    rule: watchman        # ID of the inbound rule (shown in the list after saving)
```

El contenido recibido se guarda localmente en `.storage` (máx. 1,5 KB por regla) y nunca se escribe en el registro. Los campos que Watchman pasa de verdad los ves tras el primer informe en «Último contenido». **No está probado con una instalación real de Watchman**.

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
- **Retener los push tras un reinicio planificado** (activado por defecto, tiempo de 180 segundos, ajustable de 30 a 900): al iniciar, las integraciones suelen informar brevemente de «sin conexión» (p. ej. Zigbee2MQTT no accesible). Si Home Assistant se apaga de forma controlada (reinicio desde la interfaz, Supervisor, reinicio del host), el Notification Center lo recuerda y no envía ningún push durante ese tiempo tras el inicio. Si un problema sigue existiendo pasado el tiempo, el push se entrega entonces; lo que se haya resuelto entretanto nunca se envía. Tras un **fallo o un corte de luz** (no se detecta un apagado limpio) los mensajes llegan de inmediato como antes. Todo sigue visible en la tarjeta. Interruptor: engranaje → Opciones o Configurar; el tiempo se ajusta en Configurar → Modo silencioso e historial

## Indicación de versión y aviso de actualización

La versión aparece en tres lugares: en el engranaje (Versión de la aplicación), arriba en el editor de la tarjeta (`Tarjeta 1.2.1 · Integración 1.2.1`) y en el diálogo de opciones. La integración consulta `api.github.com` al iniciar y luego cada 12 horas. Nueva versión → aviso naranja, «↑» en el engranaje; tarjeta e integración con versiones distintas (caché del navegador) → también naranja; GitHub inaccesible → «Comprobación no posible», la tarjeta sigue funcionando.

## Ajustes (engranaje)

Orden fijo de los acordeones: **Versión de la aplicación** · **Orígenes** · **Opciones** (modo silencioso, entrega) · **Mantenimiento** (mensaje de prueba, confirmar todo, vaciar historial, cada uno con confirmación de dos clics) · **Eventos** (registro desde el inicio, sin contenido). Solo los administradores pueden cambiar cosas. Además, **Importaciones** (crear, editar y borrar reglas) y, por fuente, la **elección del nivel** por tipo de aviso y la **tarjeta emergente** (tarjeta Lovelace en YAML, pega simplemente el código del editor de tarjetas).

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

- **No probado en una instancia real de Home Assistant ni con teléfonos reales.** Comprobado: la lógica del hub contra un bus de eventos simulado (27 pruebas), la tarjeta en un navegador sin interfaz con datos de prueba (todas las pestañas, ventana, engranaje, cinco idiomas, editor) y sintaxis/JSON. El comportamiento en la interfaz real de Home Assistant está **sin comprobar**.
- **La interacción con las integraciones hermanas está sin comprobar:** solo se usaron eventos simulados, no datos reales de Fritz!Box, Zigbee2MQTT o Matter.
- Que «Urgente» salte realmente el modo silencioso en tu dispositivo depende de los ajustes de Android/iOS (permisos de canal, No molestar, alertas críticas). Pruébalo con el mensaje de prueba.
- Los perfiles de correo se pueden elegir técnicamente para la entrega, pero el correo no forma parte del alcance probado de la 1.0.0.
- No incluido: silenciar dispositivos concretos, horario para el modo silencioso.
- Las notificaciones persistentes se leen de forma defensiva de un almacén interno de Home Assistant; si eso cambia, la categoría queda vacía.
- Las traducciones al neerlandés, francés y español son automáticas y no están revisadas por hablantes nativos - se agradecen correcciones.
- Los scripts y blueprints solo se crean; editar y borrar se hace en Home Assistant.
- **El logotipo de origen, las importaciones y la tarjeta emergente solo están probados con datos simulados** (hub contra el núcleo de Home Assistant, tarjeta en un navegador headless). El logotipo viene del proxy de marcas de Home Assistant (`/api/brands/integration/<domain>/icon.png`); si no hay, se muestra el icono de la fuente. Ninguno de los dos se ha visto en una instancia real.
- La tarjeta emergente se crea con el asistente de tarjetas de Home Assistant. Las tarjetas que necesiten su propio recurso deben estar cargadas en tu panel.
- La importación del informe de Watchman como texto con `notification_center.report` no está probada con una instalación real de Watchman. Las importaciones se limitan a 30 reglas; las plantillas se ejecutan con derechos de administrador.
- **Reglas de entrada solo probadas con datos simulados.** Una regla de entrada necesita una integración que dispare un evento o llame a una acción. Las integraciones que solo trabajan internamente solo se conectan por sus entidades (Importaciones). Limitado a 30 reglas; las plantillas se ejecutan con derechos de administrador.
- **La agrupación, la entrada YAML de la tarjeta emergente y la corrección del desplazamiento (nuevo en 1.2.0) solo están probados con datos simulados.** Que las barras de desplazamiento se queden realmente quietas en tu navegador y panel está sin comprobar. La tarjeta emergente necesita un campo `type` y no puede superar los 4 KB; los anclajes YAML (`&`, `*`) no se aceptan. Las pruebas del hub contra el núcleo de Home Assistant no se repitieron para 1.2.0; el backend solo está comprobado en sintaxis y el analizador YAML se probó por separado.
- **La retención de push tras un reinicio (nuevo en 1.2.1) solo está probada en un entorno simulado,** no en una instancia real de Home Assistant. Que Home Assistant notifique limpiamente el apagado con tu forma de reiniciar (interfaz, Supervisor, parada de Docker) está sin comprobar; en caso de duda, el push llega simplemente como antes. El mensaje de prueba no se retiene.

## Solución de problemas

| Problema | Solución |
|---|---|
| La tarjeta muestra «Custom element doesn’t exist» | Vacía la caché del navegador (Ctrl+F5); en modo YAML añade a mano el recurso `/notification_center_files/notification-center-card.js` (tipo `module`). |
| Falta la pestaña «Mensajes» | El sensor `sensor.notification_center_meldungen` solo existe tras reiniciar con la 1.0.0. Revisa la entrada `entities.messages`. |
| No llegan mensajes de una integración | Engranaje → Orígenes: ¿está registrado el origen? La integración debe ser la versión 1.0.0 con «enviar mensajes» activado. |
| Sin push | ¿Está activado el modo silencioso? ¿Sigue en curso el tiempo tras un reinicio (engranaje → Opciones)? ¿Hay un perfil elegido para esa urgencia (engranaje → Opciones)? Compruébalo con el mensaje de prueba. |
| Falla la comprobación de actualización | Home Assistant necesita acceso a Internet a `api.github.com`; la tarjeta sigue funcionando. |

## Integridad de archivos

Cada `.py`, `.js` y `.yaml` empieza con una cabecera SHA256 (contenido desde la línea 2). Comprobar con `tail -n +2 archivo.py | sha256sum`. Las sumas de comprobación de los archivos JSON están en [docs/datei-integritaet.md](docs/datei-integritaet.md).

## Historial de versiones

### 1.2.1

- Corregido: el diálogo de opciones («Configurar») provocaba el error de registro `Failed to format translation for key 'component.notification_center.options.step.init.title'` (falta el marcador `version`). El título es ahora solo «Notification Center»; la versión sigue en la descripción del diálogo
- Nuevo: **retener los push tras un reinicio planificado** (opción, activada por defecto, tiempo de 180 segundos). Tras un apagado controlado no se envían push al iniciar mientras las integraciones informan brevemente de «sin conexión»; lo que siga existiendo después se entrega. Tras un fallo o un corte de luz el push llega de inmediato. Interruptor en la tarjeta (engranaje → Opciones) y en Configurar, tiempo en Configurar
- Tras la actualización, reinicia Home Assistant y vacía la caché del navegador (Ctrl+F5)

### 1.2.0

- Nuevo: **agrupar** además de ordenar: avisos por integración, urgencia o tipo de aviso, actualizaciones por integración, reparaciones por integración o urgencia; los grupos se pueden plegar. Claves de la tarjeta `show_group_by` y `default_group_by`
- Nuevo: **tarjeta emergente en YAML:** pega simplemente el código del editor de tarjetas (el JSON sigue funcionando). El campo muestra también la tarjeta guardada en YAML
- Corregido: las **barras de desplazamiento** de la barra de categorías y de la ventana, y la posición de desplazamiento de la página, ya no saltan atrás. La tarjeta solo se redibuja cuando cambian sus propios sensores
- Nuevo: **origen** de cada aviso (logotipo de la integración), ventana con la **tarjeta de la integración** y «Abrir integración»
- Nuevo: **asignación de nivel** por tipo de aviso en el engranaje (también para push y orden)
- Nuevo: **importación** mediante reglas (engranaje → Importaciones, con plantilla de Watchman) y el servicio `notification_center.report`
- Nuevo: **entradas** (engranaje): un evento o el servicio `notification_center.inbound` se asigna mediante plantillas a título, texto, clave y nivel, con tabla de valores para el nivel, condición de cierre y vista del último contenido recibido
- Nuevo: campos opcionales `domain` y `card` en el registro (el esquema 1 sigue siendo compatible); ejemplo `examples/inbound_watchman.yaml`
- Corregido: los textos largos se cortaban a 200 caracteres al componerlos (ahora 2000)
- Tras la actualización, reinicia Home Assistant y vacía la caché del navegador (Ctrl+F5)

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
