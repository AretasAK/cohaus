# Cohaus — documentación completa del proyecto

Lee este archivo entero antes de tocar el proyecto. Describe qué es la app, cómo está construida, el esquema de base de datos completo, cada pantalla, cada store, decisiones de diseño y limitaciones conocidas. Se actualiza cada vez que se añade o cambia algo importante.

## Qué es

Cohaus es una app móvil (Android + iOS) de gestión de piso/casa compartida: lista de la compra, gastos compartidos estilo Tricount, despensa con escaneo de tickets, y tareas del hogar. Backend en Supabase (Postgres + Auth + Realtime + Storage + Edge Functions). Cliente en Expo/React Native.

## Stack técnico

- **Expo SDK 57**, managed workflow con dev client nativo (`expo run:android` / `expo run:ios`), no Expo Go. Hay módulos nativos (image-picker, file-system, notifications, device) que requieren un build nativo, no solo JS.
- **IMPORTANTE**: Expo 57 cambió mucho respecto a versiones anteriores. Antes de escribir código que toque APIs de Expo, consultar la doc versionada: https://docs.expo.dev/versions/v57.0.0/. Ejemplo ya vivido: `expo-file-system` ahora expone una API basada en clases (`new File(uri).arrayBuffer()`), no la vieja `readAsStringAsync`.
- **React 19.2.3 / React Native 0.86.0**.
- **TypeScript** estricto (`npx tsc --noEmit` antes de dar nada por terminado).
- **Zustand** para todo el estado global (un store por dominio, ver abajo).
- **React Navigation**: `@react-navigation/native` + `bottom-tabs` + `native-stack`.
- **react-native-reanimated v4** (worklets) para todas las animaciones. Springs con `damping`/`stiffness`. Preferencia de usuario ya validada: `damping` 18–22 sin rebote perceptible; `damping` < 15 se siente "gomoso" y no debe usarse. El usuario pidió movimiento "normal, moderno y simple", no efectos exagerados.
- **react-native-gesture-handler** para swipe-to-delete en filas y drag-to-dismiss en bottom sheets.
- **Supabase JS client** (`@supabase/supabase-js`).
- Package: `com.cohaus.app`. Ver `app.json` para configuración de Expo/EAS.

## Estructura de carpetas

```
src/
  components/     Componentes reutilizables (Button, Card, Input, BottomSheet, Avatar, SwipeableRow, SegmentedTabs, EmptyState, Screen)
  features/
    auth/         LoginScreen, SignUpScreen
    groups/       GroupsScreen (listado), GroupWorkspaceScreen (hub por grupo), PantrySection, TasksSection, GroupInfoSection
    lists/        ListsScreen (listas de la compra, soporta varias por grupo)
    expenses/      ExpensesScreen, BalancesScreen
    pantry/        ScanReceiptScreen (escaneo IA de tickets)
    notifications/ NotificationsScreen
    profile/       ProfileScreen (perfil, tema, cambiar email/contraseña, avatar)
  navigation/     AppNavigator, AuthNavigator, RootNavigator, CustomTabBar
  store/          Un store Zustand por dominio: authStore, groupStore, listStore, expenseStore, taskStore, pantryStore, notificationStore
  theme/          colors.ts (paletas light/dark), ThemeProvider.tsx
  lib/            supabase.ts (cliente), split.ts (reparto de dinero), pushNotifications.ts
android/          Proyecto nativo generado por Expo prebuild (gradle)
supabase/         Edge Functions (parse-receipt)
```

## Navegación (estructura actual — grupo como hub central)

La navegación NO usa tabs separadas para Lista/Gastos. Solo hay **dos tabs inferiores**: **Grupos** y **Perfil** (`CustomTabBar`, con pill animado que se desliza entre tabs).

- **GroupsScreen**: lista de grupos del usuario + FAB "Nuevo grupo" (crear o unirse por código) + campana de notificaciones con badge.
- Al pulsar un grupo → **GroupWorkspaceScreen**: cabecera con nombre del grupo + `SegmentedTabs` (pill deslizante) con 5 secciones: **Lista · Gastos · Despensa · Tareas · Grupo**. Cada sección es un componente separado que recibe `groupId` (y `navigation` si necesita navegar a pantallas hijas como Balances o ScanReceipt).
  - `Lista` → `ListsScreen`
  - `Gastos` → `ExpensesScreen`
  - `Despensa` → `PantrySection`
  - `Tareas` → `TasksSection`
  - `Grupo` → `GroupInfoSection` (miembros, invitar, salir del grupo)
- **BalancesScreen** y **ScanReceiptScreen** y **NotificationsScreen** son pantallas hijas del stack de Grupos (no tabs), se navega con `navigation.navigate(...)`.
- **ProfileScreen**: tema claro/oscuro, avatar, cambiar nombre/email/contraseña, cerrar sesión.

Decisión de diseño (pedida explícitamente por el usuario): el grupo es el centro de todo — al entrar en un grupo aparecen lista, gastos y tareas juntos, no como tabs globales separadas.

## Tema y colores (`src/theme/colors.ts`)

Paleta unificada verde esmeralda/teal en claro y oscuro (el usuario rechazó explícitamente índigo/morado). Modo oscuro es "verde esmeralda sobre negro" (elegido vía pregunta directa al usuario). Reglas de diseño ya fijadas:
- El color primario y el color `success` deben tener tonos claramente distinguibles aunque sean de la misma familia (ej. primary teal-esmeralda vs success verde-lima).
- No dejar restos de la paleta antigua en un tema mientras el otro ya se actualizó — el hue de marca debe ser consistente entre claro y oscuro.

`Theme` type: `bg, bgElevated, card, border, text, textMuted, primary, primaryGradient, primarySoft, primaryText, success, successSoft, danger, dangerSoft, warning, warningSoft, accent, accentSoft, tabBar, overlay, inputBg, shadow`.

`ThemeProvider.tsx` expone `useTheme()` con `{ theme, mode, toggleMode }`, persistido (probablemente en AsyncStorage/perfil).

## Stores (Zustand) — un resumen de qué hace cada uno

### `authStore.ts`
Sesión de Supabase Auth, perfil (`profiles` row). Acciones: login, signup, logout, `updateDisplayName`, `updateEmail`, `updatePassword` (reautentica antes de cambiar contraseña), `uploadAvatar(localUri)` (sube a bucket `avatars` usando `new File(uri).arrayBuffer()`, actualiza `profiles.avatar_url` con URL pública cache-busted).

### `groupStore.ts`
`Group`, `GroupMember` (incluye `avatar_url`, `share_weight`, `display_name`, `email`, `role`). `fetchGroups`, `createGroup` (vía RPC `create_group`, ver más abajo por qué), `fetchMembers` (ordenado por `joined_at asc` para rotación estable de tareas), `createInvite`, `joinByToken`, `leaveGroup`.

### `listStore.ts` — soporta **múltiples listas por grupo** (cambio reciente, tarea #30)
```ts
listsByGroup: Record<groupId, ShoppingList[]>
selectedListByGroup: Record<groupId, listId>   // qué lista está viendo el usuario ahora mismo
itemsByList: Record<listId, ListItem[]>
```
- `fetchLists(groupId)`: trae TODAS las listas del grupo (abiertas y cerradas), ordenadas por `created_at desc`; si la lista seleccionada actual ya no es válida (cerrada o no existe), auto-selecciona la primera abierta.
- `createList(groupId, name)`: inserta, refetch, auto-selecciona la nueva.
- `selectList(groupId, listId)`: cambia qué lista se está viendo.
- `addItem`, `toggleBought`, `updatePrice`, `deleteItem`: operan sobre `list_items` de una lista concreta.
- `closeList(groupId, listId, payerId)`: marca la lista como `closed`, suma los precios de los items, crea un `expenses` row + reparte en `expense_splits` según `share_weight` de cada miembro (usa `splitAmount`). Devuelve `{ total }`.
- Al añadir un item, si el nombre coincide (ilike) con un `products.canonical_name` existente se reutiliza ese producto (categoría autocompletada); si no, se crea un producto nuevo. **Importante**: `custom_name` se guarda SIEMPRE (aunque haya match), porque si no, los items con match no mostraban nombre (bug ya corregido).

### `expenseStore.ts`
`Expense` (incluye `receipt_path` opcional — foto de ticket adjunta), `Balance`, `Transfer`.
- `addExpense(groupId, payerId, amount, description, participants, splitByWeight, receiptPath?)`: reparte con `splitAmount()`, con pesos reales si `splitByWeight`, si no a partes iguales.
- `computeBalances(groupId)`: calcula el neto de cada miembro sumando lo pagado y restando lo que le toca de cada `expense_split` no saldado, **y también aplica los `settlements` registrados** (ver tabla `settlements` más abajo — cuando alguien paga una deuda a otro, se resta del neto). Después simplifica deudas con un algoritmo greedy (deudores ordenados de más a menos deuda emparejados con acreedores) para minimizar el número de transferencias.
- `settleTransfer(groupId, fromUserId, toUserId, amount)`: inserta una fila en `settlements` — así una deuda puede marcarse como pagada sin tocar los `expense_splits` originales (tarea #31).

### `taskStore.ts`
`completeTask(task, groupId, userId, memberOrder)`: registra en `task_log`, rota `assignee_id` al siguiente de `memberOrder` (rotación round-robin basada en el orden de entrada al grupo), actualiza `last_done_at`.

### `pantryStore.ts`
CRUD de `pantry_items` por grupo: `addOrIncrement`, `updateQty`, `setExpiry`, `removeItem`.

### `notificationStore.ts`
`notifyGroup({ groupId, actorId, type, title, body, data })`: inserta una notificación en `notifications` para cada miembro del grupo EXCEPTO el actor, y si tienen `push_token` intenta mandar push. Verificado end-to-end en dispositivo real.

## Base de datos (Supabase, proyecto `qiajhukbcjrnqprlblhy`, región eu-west-1)

Todas las tablas tienen RLS activado. Patrón general: función `is_group_member(group_id)` / `is_group_admin(group_id)` (SECURITY DEFINER, con `GRANT EXECUTE` a `authenticated` — necesario para que las policies puedan invocarlas) usada en casi todas las policies.

### Tablas

- **`profiles`**: `id` (FK a `auth.users`), `email`, `display_name`, `avatar_url`, `push_token`, `created_at`. Se crea automáticamente al registrarse (`handle_new_user` trigger).
- **`groups`**: `id`, `name`, `enabled_modules` (jsonb, por ahora todos activos: lists/tasks/pantry/recipes/expenses — pensado para poder desactivar módulos por grupo en el futuro, no usado activamente todavía), `created_by`, `created_at`.
- **`group_members`**: PK compuesta `(group_id, user_id)`, `role` (`admin`|`member`), `share_weight` (numeric, para repartos ponderados), `joined_at`.
- **`group_invites`**: `token` único (autogenerado), `expires_at` (7 días por defecto), `used_at`.
- **`products`**: catálogo compartido de productos (`canonical_name`, `category`, `aliases`, `default_unit`, `aisle_order`). Se autopobla cuando alguien escribe un producto nuevo en una lista.
- **`lists`**: `group_id`, `name`, `status` (`open`|`closed`), `created_by`, `closed_at`. **Un grupo puede tener varias listas abiertas a la vez** (ej. "Mercadona" y "Lidl").
- **`list_items`**: `list_id`, `product_id` (nullable), `custom_name`, `qty`, `unit`, `price`, `category`, `bought_by`, `bought_at`.
- **`expenses`**: `group_id`, `payer_id`, `amount` (check > 0), `description`, `source_list_id` (si viene de cerrar una lista), `receipt_path` (nullable — ruta en bucket `receipts` de una foto de ticket adjunta al gasto).
- **`expense_splits`**: PK `(expense_id, user_id)`, `share_amount`, `settled` (bool — actualmente no se usa activamente para saldar, se usa la tabla `settlements` en su lugar).
- **`settlements`** (nueva, tarea #31): `group_id`, `from_user_id`, `to_user_id`, `amount` (check > 0), `created_by`. Registra pagos manuales entre miembros para saldar deuda sin tocar los splits originales. `computeBalances` la lee y ajusta los netos.
- **`pantry_items`**: `group_id`, `product_id`, `qty`, `unit`, `expires_at`.
- **`recipes`** / **`recipe_ingredients`**: soporte de recetas (existe en el esquema, apenas usado en la UI todavía — no hay pantalla dedicada).
- **`tasks`**: `group_id`, `title`, `assignee_id`, `rrule` (recurrencia, formato tipo iCal — parseo no implementado aún, es solo texto informativo), `last_done_at`.
- **`task_log`**: histórico de quién completó qué tarea y cuándo.
- **`purchase_cycles`**: `group_id`, `product_id`, `avg_cycle_days`, `last_bought_at` — pensado para predicciones de "te puede faltar esto" a partir del histórico de compras. **Existe la tabla pero no hay lógica todavía que la rellene ni la use** — es la base para la feature de predicción de compras que el usuario pidió como visión a futuro.
- **`notifications`**: `group_id`, `recipient_id`, `actor_id`, `type`, `title`, `body`, `data` (jsonb), `read_at`.

### Gotchas de RLS ya vividos (no repetir estos errores)

1. **INSERT...RETURNING falla si la fila nueva no pasa también la policy de SELECT** en el mismo instante (no solo la de INSERT). Por eso `createGroup` usa una función RPC `create_group(p_name text)` con `SECURITY DEFINER` que inserta el grupo Y la membresía de admin atómicamente como `postgres`, evitando el problema de "insertar un grupo pero todavía no soy miembro para poder verlo".
2. **Las tablas creadas por migración SQL NO heredan GRANTs automáticos** para `authenticated`/`anon` (a diferencia de las creadas desde el dashboard de Supabase). Cada tabla nueva necesita `GRANT SELECT, INSERT, UPDATE, DELETE ON <tabla> TO authenticated` explícito, si no las queries fallan aunque la policy de RLS sea correcta.
3. Las funciones `SECURITY DEFINER` usadas dentro de policies (`is_group_member`, etc.) necesitan `GRANT EXECUTE ... TO authenticated` — si se revoca por error (pasó una vez intentando cerrar un advisory de seguridad) se rompen TODAS las policies que las usan. Ya se corrigió y hay que tener cuidado de no repetirlo.
4. `profiles.push_token` es legible por cualquier usuario autenticado vía la policy `profiles_select_all` (no hay RLS a nivel de columna). Aceptado como riesgo bajo para una app privada/familiar — no es prioritario de arreglar.

## Storage (Supabase Storage)

- **`receipts`** (privado): fotos de tickets. RLS: `authenticated` puede select/insert/delete. Se generan signed URLs (1h) para mostrarlas en la UI (`createSignedUrl`).
- **`avatars`** (lectura pública): fotos de perfil. Insert/update/delete solo en la propia carpeta (`(storage.foldername(name))[1] = auth.uid()::text`).

Para subir binarios desde el dispositivo: **usar siempre `new File(uri).arrayBuffer()`** de `expo-file-system` (API nueva de Expo 57), NUNCA `fetch(uri).blob()` — esto último falla en Android para URIs `file://`/`content://` locales (limitación conocida de React Native, ya confirmada en pruebas reales).

## Edge Functions

- **`parse-receipt`**: recibe `{ path }` de una foto ya subida a `receipts`, llama a la API de visión de Claude si existe el secret `ANTHROPIC_API_KEY`. Si NO está configurada, devuelve `{ configured: false, items: [], message: ... }` de forma controlada (degradación elegante) — el usuario decidió explícitamente dejar esto sin clave por ahora ("Configúralo sin clave por ahora"). Cuando el usuario quiera activar el análisis IA de tickets, solo hay que poner el secret `ANTHROPIC_API_KEY` en el proyecto de Supabase, no hace falta tocar código.

## Reparto de dinero (`src/lib/split.ts`)

`splitAmount(total, weights)`: reparte un importe entre pesos usando el **método del mayor resto** (largest remainder), para que la suma de las partes sea EXACTAMENTE el total en céntimos (nunca se pierde ni sobra un céntimo por redondeo). Usado tanto por `expenseStore.addExpense` como por `listStore.closeList`. Verificado a mano contra un caso de 4 personas con pesos distintos (1, 1, 1.5, 0.5).

`computeBalances` simplifica las deudas resultantes con un algoritmo greedy: ordena deudores (más deuda primero) y acreedores (más crédito primero), y empareja hasta saldar, minimizando el número de transferencias necesarias — no es "cada uno le debe a cada uno", es la versión simplificada tipo Splitwise/Tricount.

"Repartir por peso" (toggle en Nuevo Gasto): si está activo, cada miembro paga proporcional a su `share_weight` de `group_members` (por defecto todos pesan 1 = partes iguales). Si está desactivado, siempre son partes iguales aunque haya pesos distintos configurados. La UI muestra una previsualización en vivo de cuánto paga cada persona (tarea #32) para que quede claro qué significa cada opción — antes esto era confuso porque no explicaba a qué se refería "proporcional al peso".

## Notificaciones

- **In-app**: tabla `notifications`, pantalla `NotificationsScreen`, badge de no leídas en `GroupsScreen`.
- **Push**: `expo-notifications` + `src/lib/pushNotifications.ts`. `registerForPushNotifications(userId)` guarda el token en `profiles.push_token`. Envío directo a `https://exp.host/--/api/v2/push/send` (sin backend intermedio).
- **Limitación conocida**: el registro de push token necesita un `projectId` de EAS (`app.json` → `extra.eas.projectId`), que requiere `eas init` con una cuenta de Expo logueada — no se puede hacer en sesión no interactiva. El código está completo pero no genera token hasta que el usuario haga `eas init` una vez con su cuenta. Android funciona, iOS además necesita cuenta de Apple Developer (no configurado).

## Escaneo de tickets (`ScanReceiptScreen.tsx`)

Flujo: hacer foto o elegir de galería → subir a `receipts` → invocar Edge Function `parse-receipt` → si hay items detectados (o si no hay IA configurada, fila vacía para rellenar a mano) → el usuario edita/confirma → se crean items de despensa (`pantry_items`) y opcionalmente un gasto (`expenses`) con reparto igual entre miembros.

**Punto de entrada**: está en la sección **Gastos** del workspace de grupo (no en Despensa — se movió ahí a petición del usuario en tarea #35, porque conceptualmente "escanear ticket" es parte de añadir un gasto). Además, al crear un gasto manual también se puede adjuntar una foto de ticket suelta (sin pasar por el flujo de análisis IA) solo para que el resto del grupo la vea — esto usa el campo `expenses.receipt_path` directamente, es más simple que el flujo completo de ScanReceiptScreen.

## Componentes clave

- **`BottomSheet.tsx`**: modal animado con spring (`damping: 22, stiffness: 260`), drag-to-dismiss por gesto, fondo con opacity animada. Envuelve el contenido en `KeyboardAvoidingView behavior="padding"` (en AMBAS plataformas — importante: `behavior="height"` en Android rompe el layout cuando el sheet está anclado al fondo con `position:absolute, bottom:0`, porque encoge el contenido hacia abajo en vez de empujarlo hacia arriba sobre el teclado; ya se probó y se corrigió, no volver a poner `height` en Android para este componente).
- **`SegmentedTabs.tsx`**: control segmentado reutilizable con pill deslizante (mide el ancho del contenedor con `onLayout`, anima `translateX` con `withSpring`). Usado en `GroupWorkspaceScreen` y como base del patrón que se replicó en `CustomTabBar`.
- **`CustomTabBar.tsx`**: tab bar inferior con el mismo patrón de pill deslizante que `SegmentedTabs`, todas las tabs muestran icono+label siempre (no solo la activa) para que la transición entre "Grupos" y "Perfil" no dé un salto raro (tarea #34, ya corregida).
- **`SwipeableRow.tsx`**: swipe-to-delete en filas de listas/gastos/despensa.
- **`Input.tsx`**: tiene prop `containerStyle` para poder anular el `width:'100%'` por defecto en layouts de fila (ej. buscador + botón al lado), y prop `passwordToggle` para mostrar/ocultar contraseña con icono de ojo.
- **`Avatar.tsx`**: acepta `url` opcional, si no hay foto muestra iniciales sobre color.

## Convenciones de trabajo con el usuario (leer antes de tocar UI)

- El usuario prueba TODO en un dispositivo Android físico por USB (ADB), no en emulador. Verificar cambios de UI en el dispositivo real cuando sea posible antes de darlos por buenos.
- Prefiere animaciones "normales, modernas y simples, con buen flujo" — nada de movimiento excesivo. Si algo se siente "gomoso" o con demasiado rebote, bajar `damping`.
- No le gustan los colores morado/índigo; la paleta ya está fijada en verde esmeralda, no cambiarla sin que lo pida.
- Cuando algo "se queda feo" o "no termina de convencer" visualmente, es una señal fuerte de rediseñar, no de ignorar.
- Da feedback muy concreto y en español; a veces con errores de dictado por voz — interpretar la intención, no el texto literal.
- Le gusta que se avance con autonomía y no se pare a preguntar cosas menores, pero SÍ usar `AskUserQuestion` para decisiones de diseño con varias opciones válidas (colores, estructura de navegación, etc.).

## Workflow de desarrollo / build

- **JS/TS puro**: hot reload automático vía Metro (`npx expo start --dev-client`), no hace falta rebuild nativo.
- **Nuevo módulo nativo** (ej. añadir un paquete `expo-*` nuevo con código nativo): hace falta `npx expo run:android` (o `run:ios`) completo para regenerar/recompilar el proyecto nativo.
- **APK de release standalone** (sin depender de Metro corriendo): `cd android && ./gradlew assembleRelease` (requiere `JAVA_HOME` apuntando a un JDK — en esta máquina: `C:\Program Files\Android\Android Studio\jbr`). El APK usa por defecto el `debug.keystore` como firma (ver `android/app/build.gradle` → `signingConfigs.release`), válido para instalar/compartir manualmente pero NO para publicar en Google Play (habría que generar un keystore de producción propio primero).
- Salida del APK release: `android/app/build/outputs/apk/release/app-release.apk`.
- ADB: los screenshots que devuelve la herramienta vienen reescalados (~900px de ancho) desde la resolución real del dispositivo (1080px+); hay que multiplicar las coordenadas de tap por ~1.2x para acertar en la posición real. Si Metro se cae o se pierde el `adb reverse tcp:8081 tcp:8081` (típico tras bloquear/desbloquear el móvil), la app muestra pantalla roja "Unable to load script" — solución: reiniciar Metro y repetir `adb reverse`.

## Estado de features / roadmap

Completado: auth, grupos (crear/unirse/roles), listas de la compra (múltiples por grupo), gastos con reparto exacto y simplificación de deudas, saldar deuda manualmente, despensa manual, escaneo de tickets (scaffold funcional, IA desactivada hasta poner `ANTHROPIC_API_KEY`), tareas con rotación round-robin, notificaciones in-app y push (Android), foto de perfil, tema claro/oscuro, pantallas de login/registro pulidas.

Pendiente / visión a futuro (no implementado todavía, pero la base de datos ya lo contempla):
- Predicción de compras ("te puede faltar esto") usando `purchase_cycles` — tabla existe, no hay lógica que la rellene ni la consuma.
- Recetas (`recipes`/`recipe_ingredients`) — esquema existe, sin pantalla dedicada.
- Push notifications en iOS (necesita cuenta Apple Developer) y `eas init` para generar `projectId` de EAS (necesita login interactivo del usuario en su cuenta Expo).
- Parseo real de `rrule` en tareas (hoy es solo texto libre, sin lógica de recurrencia automática).
