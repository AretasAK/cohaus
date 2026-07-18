export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  updated: string;
  sections: LegalSection[];
}

const CONTACT_EMAIL = 'aretasak@hotmail.com';

export const privacy: Record<'es' | 'en', LegalDoc> = {
  es: {
    updated: 'Última actualización: julio de 2026',
    sections: [
      {
        heading: '1. Quiénes somos',
        body: `Cohaus es una aplicación para gestionar listas de la compra, gastos compartidos, despensa y tareas del hogar entre las personas de un mismo grupo (piso, pareja, viaje). El responsable del tratamiento de tus datos es el desarrollador de Cohaus, contactable en ${CONTACT_EMAIL}.`,
      },
      {
        heading: '2. Qué datos recogemos',
        body: 'Cuenta: email, nombre visible y foto de perfil. Uso de la app: los grupos a los que perteneces, las listas de la compra, gastos, productos de despensa y tareas que tú o los demás miembros del grupo creáis (estos datos los ven todos los miembros del grupo, no solo tú). Fotos de tickets de compra que decidas escanear. Token de notificaciones push (si las activas). Preferencia de idioma y de tema (claro/oscuro). No recogemos datos de pago ni de localización.',
      },
      {
        heading: '3. Para qué usamos tus datos',
        body: 'Para prestar el servicio: mostrar tus grupos, repartir gastos, sincronizar listas en tiempo real y enviarte notificaciones de actividad. La base legal es la ejecución del contrato (los términos que aceptas al usar la app) y, para las notificaciones push, tu consentimiento explícito al activarlas.',
      },
      {
        heading: '4. Con quién compartimos datos',
        body: 'Usamos Supabase como proveedor de base de datos, autenticación y almacenamiento de archivos (fotos de perfil y de tickets). Si inicias sesión con Google, Google LLC procesa esos datos de autenticación. Si el análisis automático de tickets está activado, la foto se envía a la API de Anthropic (Claude) únicamente para extraer los productos y precios, y no se usa para entrenar sus modelos. Ninguno de estos proveedores usa tus datos con fines publicitarios propios. No vendemos ni cedemos tus datos a terceros con fines comerciales.',
      },
      {
        heading: '5. Cuánto tiempo conservamos tus datos',
        body: 'Mientras tu cuenta esté activa. Si eliminas tu cuenta desde la app, tus datos personales (nombre, email, foto, token de notificaciones) se anonimizan de inmediato y el acceso a la cuenta se inhabilita de forma permanente. Por la naturaleza compartida de los grupos, los gastos, listas o tareas en los que participaste pueden seguir siendo visibles para el resto de miembros del grupo, pero ya sin ningún dato que te identifique (aparecerás como "Usuario eliminado").',
      },
      {
        heading: '6. Tus derechos',
        body: `Puedes acceder, rectificar o solicitar la portabilidad de tus datos, y puedes eliminar tu cuenta en cualquier momento desde Perfil → Eliminar cuenta, dentro de la propia app. También puedes escribirnos a ${CONTACT_EMAIL} para ejercer cualquiera de estos derechos o presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es) si consideras que no hemos atendido tu solicitud correctamente.`,
      },
      {
        heading: '7. Menores de edad',
        body: 'Cohaus no está dirigida a menores de 16 años. Si eres el responsable legal de un menor y crees que nos ha facilitado datos personales, contáctanos para eliminarlos.',
      },
      {
        heading: '8. Cambios en esta política',
        body: 'Podemos actualizar esta política si cambian las funciones de la app o la normativa aplicable. Publicaremos la fecha de la última actualización al principio de este documento.',
      },
    ],
  },
  en: {
    updated: 'Last updated: July 2026',
    sections: [
      {
        heading: '1. Who we are',
        body: `Cohaus is an app for managing shared shopping lists, expenses, pantry and household tasks among the people in a group (flat, couple, trip). The data controller is Cohaus' developer, reachable at ${CONTACT_EMAIL}.`,
      },
      {
        heading: '2. What data we collect',
        body: 'Account: email, display name and profile photo. App usage: the groups you belong to, and the shopping lists, expenses, pantry items and tasks that you or other group members create (this data is visible to every member of the group, not just you). Photos of shopping receipts you choose to scan. Push notification token (if you enable notifications). Language and theme (light/dark) preference. We do not collect payment or location data.',
      },
      {
        heading: '3. What we use your data for',
        body: 'To provide the service: showing your groups, splitting expenses, syncing lists in real time, and sending you activity notifications. The legal basis is performance of the contract (the terms you accept by using the app) and, for push notifications, your explicit consent when you enable them.',
      },
      {
        heading: '4. Who we share data with',
        body: "We use Supabase as our database, authentication and file storage provider (profile and receipt photos). If you sign in with Google, Google LLC processes that authentication data. If automatic receipt analysis is enabled, the photo is sent to Anthropic's Claude API solely to extract products and prices, and is not used to train their models. None of these providers use your data for their own advertising purposes. We do not sell or share your data with third parties for commercial purposes.",
      },
      {
        heading: '5. How long we keep your data',
        body: 'For as long as your account is active. If you delete your account from within the app, your personal data (name, email, photo, notification token) is anonymized immediately and access to the account is permanently disabled. Because groups are shared, expenses, lists or tasks you took part in may remain visible to other group members, but without any data that identifies you (you will appear as "Deleted user").',
      },
      {
        heading: '6. Your rights',
        body: `You can access, correct, or request a copy of your data, and you can delete your account at any time from Profile → Delete account, right inside the app. You can also write to us at ${CONTACT_EMAIL} to exercise any of these rights, or file a complaint with your local data protection authority if you believe we haven't handled your request properly.`,
      },
      {
        heading: '7. Children',
        body: "Cohaus is not directed at children under 16. If you are a parent or guardian and believe a minor has provided us with personal data, please contact us so we can remove it.",
      },
      {
        heading: '8. Changes to this policy',
        body: "We may update this policy as the app's features or applicable law change. We will post the last-updated date at the top of this document.",
      },
    ],
  },
};

export const terms: Record<'es' | 'en', LegalDoc> = {
  es: {
    updated: 'Última actualización: julio de 2026',
    sections: [
      {
        heading: '1. Aceptación de los términos',
        body: 'Al crear una cuenta y usar Cohaus aceptas estos términos. Si no estás de acuerdo, no uses la aplicación.',
      },
      {
        heading: '2. Qué es Cohaus',
        body: 'Cohaus es una herramienta para organizar la vida doméstica compartida: listas de la compra colaborativas, reparto de gastos, despensa y tareas del hogar rotativas entre los miembros de un grupo.',
      },
      {
        heading: '3. Tu cuenta',
        body: 'Eres responsable de mantener la confidencialidad de tu contraseña y de toda la actividad que ocurra en tu cuenta. Debes darnos información veraz al registrarte.',
      },
      {
        heading: '4. Naturaleza colaborativa de los grupos',
        body: 'Todo lo que añadas a un grupo (gastos, productos, tareas, listas) es visible para el resto de miembros de ese grupo. No compartas en un grupo información que no quieras que vean los demás miembros. Al salir de un grupo, tu historial de gastos y tareas dentro de ese grupo puede seguir siendo visible para los demás miembros.',
      },
      {
        heading: '5. Uso aceptable',
        body: 'No debes usar Cohaus para fines ilegales, para acosar a otros miembros, ni para introducir contenido difamatorio, fraudulento o que infrinja derechos de terceros. Nos reservamos el derecho de suspender cuentas que incumplan esto.',
      },
      {
        heading: '6. Propiedad intelectual',
        body: 'El nombre, logo y diseño de Cohaus son propiedad del desarrollador. Tú conservas los derechos sobre el contenido que introduces (nombres de productos, descripciones de gastos, etc.).',
      },
      {
        heading: '7. El servicio "tal cual"',
        body: 'Cohaus se ofrece "tal cual", sin garantías de disponibilidad ininterrumpida ni de ausencia de errores. Funciones como el análisis automático de tickets dependen de servicios de terceros y pueden no estar siempre disponibles.',
      },
      {
        heading: '8. Limitación de responsabilidad',
        body: 'En la medida permitida por la ley, no seremos responsables de pérdidas indirectas derivadas del uso de la app, incluyendo errores en el reparto de gastos introducidos manualmente por los usuarios — revisa siempre los importes antes de confirmarlos.',
      },
      {
        heading: '9. Eliminar tu cuenta',
        body: 'Puedes eliminar tu cuenta en cualquier momento desde Perfil → Eliminar cuenta. Esto anonimiza tus datos personales e inhabilita el acceso a la cuenta de forma permanente e irreversible, tal como se describe en la Política de Privacidad.',
      },
      {
        heading: '10. Cambios en estos términos',
        body: 'Podemos actualizar estos términos si cambian las funciones de la app. Te avisaremos dentro de la aplicación si el cambio es significativo.',
      },
      {
        heading: '11. Ley aplicable y contacto',
        body: `Estos términos se rigen por la ley española. Para cualquier duda, escríbenos a ${CONTACT_EMAIL}.`,
      },
    ],
  },
  en: {
    updated: 'Last updated: July 2026',
    sections: [
      {
        heading: '1. Accepting these terms',
        body: 'By creating an account and using Cohaus you accept these terms. If you disagree, please do not use the app.',
      },
      {
        heading: '2. What Cohaus is',
        body: 'Cohaus is a tool for organizing shared household life: collaborative shopping lists, expense splitting, pantry tracking, and rotating household tasks among the members of a group.',
      },
      {
        heading: '3. Your account',
        body: 'You are responsible for keeping your password confidential and for all activity that happens under your account. You must give us accurate information when signing up.',
      },
      {
        heading: '4. The collaborative nature of groups',
        body: "Anything you add to a group (expenses, products, tasks, lists) is visible to every other member of that group. Don't share anything in a group you wouldn't want other members to see. After leaving a group, your expense and task history within that group may remain visible to the other members.",
      },
      {
        heading: '5. Acceptable use',
        body: "You must not use Cohaus for illegal purposes, to harass other members, or to post defamatory, fraudulent content, or content that infringes on others' rights. We reserve the right to suspend accounts that violate this.",
      },
      {
        heading: '6. Intellectual property',
        body: "Cohaus' name, logo and design belong to the developer. You keep the rights to the content you enter (product names, expense descriptions, etc.).",
      },
      {
        heading: '7. The service "as is"',
        body: 'Cohaus is provided "as is", without guarantees of uninterrupted availability or error-free operation. Features like automatic receipt analysis rely on third-party services and may not always be available.',
      },
      {
        heading: '8. Limitation of liability',
        body: 'To the extent permitted by law, we are not liable for indirect losses arising from use of the app, including errors in expense splits entered manually by users — always double-check amounts before confirming them.',
      },
      {
        heading: '9. Deleting your account',
        body: 'You can delete your account at any time from Profile → Delete account. This anonymizes your personal data and permanently and irreversibly disables access to the account, as described in the Privacy Policy.',
      },
      {
        heading: '10. Changes to these terms',
        body: "We may update these terms as the app's features change. We'll notify you inside the app if the change is significant.",
      },
      {
        heading: '11. Governing law and contact',
        body: `These terms are governed by Spanish law. For any questions, write to us at ${CONTACT_EMAIL}.`,
      },
    ],
  },
};
