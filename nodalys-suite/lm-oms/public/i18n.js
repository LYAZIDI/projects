'use strict';
/* ============================================================
 *  LM-OMS - Internationalisation (français / anglais / espagnol / arabe)
 *  Même moteur que le LM-WMS : la clé de traduction EST le texte
 *  français ; repli français si la traduction manque.
 *  Langue partagée avec toute la suite via localStorage 'lm-langue'.
 * ============================================================ */

const LANGUES_DISPONIBLES = ['fr', 'en', 'es', 'ar'];
const LANGUES_RTL = ['ar'];

const LANGUE = (() => {
  let memorisee = null;
  try { memorisee = localStorage.getItem('lm-langue'); } catch { /* stockage indisponible */ }
  if (LANGUES_DISPONIBLES.includes(memorisee)) return memorisee;
  const navigateur = (navigator.language || 'fr').slice(0, 2).toLowerCase();
  return LANGUES_DISPONIBLES.includes(navigateur) ? navigateur : 'fr';
})();

function changerLangue(langue) {
  if (!LANGUES_DISPONIBLES.includes(langue)) return;
  try { localStorage.setItem('lm-langue', langue); } catch { /* tant pis */ }
  location.reload();
}

function tr(cle, params) {
  const dico = TRADUCTIONS[LANGUE];
  let texte = (dico && Object.prototype.hasOwnProperty.call(dico, cle)) ? dico[cle] : cle;
  if (params) {
    for (const [nom, valeur] of Object.entries(params)) {
      texte = texte.split('{' + nom + '}').join(valeur);
    }
  }
  return texte;
}

/* ============================================================
 *  Dictionnaires (clé = texte français exact)
 * ============================================================ */
const TRADUCTIONS = {

  /* ---------------------------------------------------------- */
  en: {
    /* --- Général / connexion --- */
    'LM-OMS — Commandes': 'LM-OMS — Orders',
    'Tour de contrôle des commandes': 'Order control tower',
    'Connexion à LM-OMS': 'Sign in to LM-OMS',
    'Comptes de la suite LM (validés auprès du WMS).': 'LM Suite accounts (validated against the WMS).',
    'Code utilisateur': 'User code', 'Mot de passe': 'Password', 'Se connecter': 'Sign in',
    'quitter': 'sign out',
    'Erreur : {message}': 'Error: {message}',
    'Connexion requise': 'Sign-in required', 'Erreur serveur': 'Server error',
    'Identifiants invalides': 'Invalid credentials',

    /* --- Menu --- */
    'Pilotage': 'Control',
    'Tour de contrôle': 'Control tower',
    'Commandes': 'Orders',
    'Toutes les commandes': 'All orders',
    'Paramétrage': 'Settings',
    'Canaux de vente': 'Sales channels',
    'Liaisons WMS / TMS': 'WMS / TMS links',
    'Suite LM :': 'LM Suite:',

    /* --- Statuts / rôles --- */
    'RECUE': 'RECEIVED', 'VALIDEE': 'VALIDATED', 'EN_RUPTURE': 'SHORTAGE', 'TRANSMISE': 'SENT',
    'EN_PREPARATION': 'IN PREPARATION', 'PREPAREE': 'PREPARED', 'EXPEDIEE': 'SHIPPED',
    'LIVREE': 'DELIVERED', 'ANNULEE': 'CANCELLED',
    'ENLEVEE': 'PICKED UP', 'EN_TRANSIT': 'IN TRANSIT', 'INCIDENT': 'INCIDENT',
    'ATTENTE': 'PENDING', 'ALLOUEE': 'ALLOCATED', 'EMBALLEE': 'PACKED',
    'ACTIF': 'ACTIVE', 'INACTIF': 'INACTIVE',
    'MOINS_CHER': 'CHEAPEST', 'PLUS_RAPIDE': 'FASTEST', 'IMPOSE': 'FIXED',
    'OPERATEUR': 'OPERATOR', 'SUPERVISEUR': 'SUPERVISOR', 'ADMIN': 'ADMIN',

    /* --- Libellés communs --- */
    'N°': 'No.', 'Statut': 'Status', 'Client': 'Customer', 'Canal': 'Channel',
    'Article': 'Item', 'Qté': 'Qty', 'Nom': 'Name', 'Code': 'Code', 'Lieu': 'Place',
    'Poids': 'Weight', 'Transporteur': 'Carrier', 'Coût': 'Cost', 'Priorité': 'Priority',
    'État': 'State', 'Fermer': 'Close', 'Annuler': 'Cancel', 'Créer': 'Create',
    'Modifier': 'Edit', 'Enregistrer': 'Save', 'Valider': 'Confirm',

    /* --- Tour de contrôle --- */
    'Rafraîchir le suivi WMS/TMS': 'Refresh WMS/TMS tracking',
    'Commandes reçues': 'Orders received',
    'À valider': 'To validate',
    'En rupture': 'In shortage',
    'À transmettre au WMS': 'To send to WMS',
    'En traitement entrepôt': 'In warehouse processing',
    'En livraison': 'In delivery',
    'Livrées': 'Delivered',
    'En retard': 'Late',
    'Transport estimé cumulé': 'Estimated transport (total)',
    'Taux de livraison par canal': 'Delivery rate by channel',
    '{livrees} livrées / {total}': '{livrees} delivered / {total}',
    'Aucune commande.': 'No orders.',
    'À traiter en priorité': 'Priority to handle',
    'Rien en attente : tout est parti.': 'Nothing pending: everything is out.',
    '{n} commande(s) mise(s) à jour': '{n} order(s) updated',
    'Suivi à jour, rien de nouveau': 'Tracking up to date, nothing new',
    'Rien de nouveau': 'Nothing new',

    /* --- Commandes --- */
    'Commandes omnicanales': 'Omnichannel orders',
    "Coller une commande (email, message…)": "Paste an order (email, message…)",
    "Pré-remplir avec l'IA": "Pre-fill with AI",
    "à vérifier": "check",
    "Analyse en cours…": "Analysing…",
    "ligne(s) proposée(s)": "line(s) suggested",
    "client à vérifier": "check the customer",
    "relisez avant de créer": "review before creating",
    'Nouvelle commande': 'New order',
    'Tous statuts': 'All statuses',
    'Tous canaux': 'All channels',
    'Souhaité le': 'Requested for',
    '→ WMS': '→ WMS',
    '{numero} en rupture : {articles}': '{numero} in shortage: {articles}',
    '{numero} validée — {transporteur} ({motif})': '{numero} validated — {transporteur} ({motif})',
    '{numero} transmise au WMS ({wms})': '{numero} sent to WMS ({wms})',
    'Livraison souhaitée': 'Requested delivery',
    'Lignes (code article + quantité)': 'Lines (item code + quantity)',
    '+ Ajouter une ligne': '+ Add a line',
    'Créer la commande': 'Create order',
    'Commande reçue — pensez à la valider': 'Order received — remember to validate it',

    /* --- Détail 360° --- */
    '{numero} — vue 360°': '{numero} — 360° view',
    'Canal {canal} · client {client} · reçue le {date}': 'Channel {canal} · customer {client} · received on {date}',
    ' · souhaitée le {date}': ' · requested for {date}',
    'Ruptures :': 'Shortages:',
    'Transporteur :': 'Carrier:',
    'non affecté': 'not assigned',
    'Parcours dans la suite': 'Journey through the suite',
    '{numero} — préparation': '{numero} — preparation',
    '(pas encore transmis)': '(not yet sent)',
    '{numero} — livraison': '{numero} — delivery',
    '(pas encore expédié)': '(not yet shipped)',
    'Suivi transporteur': 'Carrier tracking',
    'Annuler la commande': 'Cancel the order',
    'Commande annulée': 'Order cancelled',

    /* --- Canaux de vente --- */
    'Nouveau canal': 'New channel',
    'La règle du canal décide du transporteur à la validation : moins cher, plus rapide, ou un transporteur imposé (code TRP-…).':
      'The channel rule decides the carrier at validation: cheapest, fastest, or a fixed carrier (code TRP-…).',
    'Règle transporteur': 'Carrier rule',
    'Priorité': 'Priority',
    'Aucun canal.': 'No channels.',
    'Le transporteur le moins cher (simulation TMS)': 'The cheapest carrier (TMS simulation)',
    'Le plus rapide (délai le plus court)': 'The fastest (shortest lead time)',
    'Transporteur imposé (saisir le code ci-dessous)': 'Fixed carrier (enter the code below)',
    'Code imposé (optionnel)': 'Fixed code (optional)',
    'Canal actif': 'Active channel',
    'Canal créé': 'Channel created',
    'Modifier {code}': 'Edit {code}',
    'Canal modifié': 'Channel updated',

    /* --- Liaisons --- */
    'Liaisons avec la suite': 'Links with the suite',
    'EN LIGNE': 'ONLINE', 'COUPÉE': 'DOWN',
    'Clients synchronisés': 'Customers synced',
    'Commandes OMS': 'OMS orders',
    'Rôle de l\'OMS dans la suite': 'The OMS role in the suite',
    '<b>Validation :</b> le stock disponible est contrôlé en direct dans le WMS avant d\'accepter la commande — plus de promesses invendables.':
      '<b>Validation:</b> available stock is checked live in the WMS before accepting the order — no more unfulfillable promises.',
    '<b>Choix transporteur :</b> à la validation, l\'OMS interroge le simulateur du TMS et applique la règle du canal (moins cher / plus rapide / imposé).':
      '<b>Carrier choice:</b> at validation, the OMS queries the TMS simulator and applies the channel rule (cheapest / fastest / fixed).',
    '<b>Transmission :</b> la commande part au WMS avec la référence OMS — la traçabilité est conservée de bout en bout.':
      '<b>Transmission:</b> the order goes to the WMS with the OMS reference — traceability is preserved end to end.',
    '<b>Suivi :</b> toutes les 60 s, l\'OMS projette les statuts WMS (préparation) et TMS (livraison) sur ses commandes, jusqu\'au statut LIVREE.':
      '<b>Tracking:</b> every 60 s, the OMS projects WMS (preparation) and TMS (delivery) statuses onto its orders, up to DELIVERED.',
    'Synchroniser les clients': 'Sync customers',
    'Rafraîchir le suivi maintenant': 'Refresh tracking now',
    '{n} clients WMS synchronisés ({nouveaux} nouveaux)': '{n} WMS customers synced ({nouveaux} new)',
  },

  /* ---------------------------------------------------------- */
  es: {
    /* --- Général / connexion --- */
    'LM-OMS — Commandes': 'LM-OMS — Pedidos',
    'Tour de contrôle des commandes': 'Torre de control de pedidos',
    'Connexion à LM-OMS': 'Conexión a LM-OMS',
    'Comptes de la suite LM (validés auprès du WMS).': 'Cuentas de la suite LM (validadas en el WMS).',
    'Code utilisateur': 'Código de usuario', 'Mot de passe': 'Contraseña', 'Se connecter': 'Iniciar sesión',
    'quitter': 'salir',
    'Erreur : {message}': 'Error: {message}',
    'Connexion requise': 'Conexión requerida', 'Erreur serveur': 'Error del servidor',
    'Identifiants invalides': 'Credenciales inválidas',

    /* --- Menu --- */
    'Pilotage': 'Pilotaje',
    'Tour de contrôle': 'Torre de control',
    'Commandes': 'Pedidos',
    'Toutes les commandes': 'Todos los pedidos',
    'Paramétrage': 'Configuración',
    'Canaux de vente': 'Canales de venta',
    'Liaisons WMS / TMS': 'Enlaces WMS / TMS',
    'Suite LM :': 'Suite LM:',

    /* --- Statuts / rôles --- */
    'RECUE': 'RECIBIDO', 'VALIDEE': 'VALIDADO', 'EN_RUPTURE': 'ROTURA', 'TRANSMISE': 'TRANSMITIDO',
    'EN_PREPARATION': 'EN PREPARACIÓN', 'PREPAREE': 'PREPARADO', 'EXPEDIEE': 'EXPEDIDO',
    'LIVREE': 'ENTREGADO', 'ANNULEE': 'CANCELADO',
    'ENLEVEE': 'RECOGIDO', 'EN_TRANSIT': 'EN TRÁNSITO', 'INCIDENT': 'INCIDENCIA',
    'ATTENTE': 'EN ESPERA', 'ALLOUEE': 'ASIGNADO', 'EMBALLEE': 'EMBALADO',
    'ACTIF': 'ACTIVO', 'INACTIF': 'INACTIVO',
    'MOINS_CHER': 'MÁS BARATO', 'PLUS_RAPIDE': 'MÁS RÁPIDO', 'IMPOSE': 'IMPUESTO',
    'OPERATEUR': 'OPERARIO', 'SUPERVISEUR': 'SUPERVISOR', 'ADMIN': 'ADMIN',

    /* --- Libellés communs --- */
    'N°': 'N.º', 'Statut': 'Estado', 'Client': 'Cliente', 'Canal': 'Canal',
    'Article': 'Artículo', 'Qté': 'Cant.', 'Nom': 'Nombre', 'Code': 'Código', 'Lieu': 'Lugar',
    'Poids': 'Peso', 'Transporteur': 'Transportista', 'Coût': 'Coste', 'Priorité': 'Prioridad',
    'État': 'Estado', 'Fermer': 'Cerrar', 'Annuler': 'Cancelar', 'Créer': 'Crear',
    'Modifier': 'Modificar', 'Enregistrer': 'Guardar', 'Valider': 'Validar',

    /* --- Tour de contrôle --- */
    'Rafraîchir le suivi WMS/TMS': 'Actualizar seguimiento WMS/TMS',
    'Commandes reçues': 'Pedidos recibidos',
    'À valider': 'Por validar',
    'En rupture': 'En rotura',
    'À transmettre au WMS': 'Por transmitir al WMS',
    'En traitement entrepôt': 'En proceso en almacén',
    'En livraison': 'En reparto',
    'Livrées': 'Entregados',
    'En retard': 'Con retraso',
    'Transport estimé cumulé': 'Transporte estimado acumulado',
    'Taux de livraison par canal': 'Tasa de entrega por canal',
    '{livrees} livrées / {total}': '{livrees} entregados / {total}',
    'Aucune commande.': 'Sin pedidos.',
    'À traiter en priorité': 'A tratar con prioridad',
    'Rien en attente : tout est parti.': 'Nada pendiente: todo ha salido.',
    '{n} commande(s) mise(s) à jour': '{n} pedido(s) actualizado(s)',
    'Suivi à jour, rien de nouveau': 'Seguimiento al día, nada nuevo',
    'Rien de nouveau': 'Nada nuevo',

    /* --- Commandes --- */
    'Commandes omnicanales': 'Pedidos omnicanales',
    "Coller une commande (email, message…)": "Pegar un pedido (email, mensaje…)",
    "Pré-remplir avec l'IA": "Rellenar con IA",
    "à vérifier": "a verificar",
    "Analyse en cours…": "Analizando…",
    "ligne(s) proposée(s)": "línea(s) propuesta(s)",
    "client à vérifier": "verifique el cliente",
    "relisez avant de créer": "revise antes de crear",
    'Nouvelle commande': 'Nuevo pedido',
    'Tous statuts': 'Todos los estados',
    'Tous canaux': 'Todos los canales',
    'Souhaité le': 'Deseado el',
    '→ WMS': '→ WMS',
    '{numero} en rupture : {articles}': '{numero} en rotura: {articles}',
    '{numero} validée — {transporteur} ({motif})': '{numero} validado — {transporteur} ({motif})',
    '{numero} transmise au WMS ({wms})': '{numero} transmitido al WMS ({wms})',
    'Livraison souhaitée': 'Entrega deseada',
    'Lignes (code article + quantité)': 'Líneas (código de artículo + cantidad)',
    '+ Ajouter une ligne': '+ Añadir una línea',
    'Créer la commande': 'Crear el pedido',
    'Commande reçue — pensez à la valider': 'Pedido recibido — recuerde validarlo',

    /* --- Détail 360° --- */
    '{numero} — vue 360°': '{numero} — vista 360°',
    'Canal {canal} · client {client} · reçue le {date}': 'Canal {canal} · cliente {client} · recibido el {date}',
    ' · souhaitée le {date}': ' · deseado el {date}',
    'Ruptures :': 'Roturas:',
    'Transporteur :': 'Transportista:',
    'non affecté': 'no asignado',
    'Parcours dans la suite': 'Recorrido por la suite',
    '{numero} — préparation': '{numero} — preparación',
    '(pas encore transmis)': '(aún no transmitido)',
    '{numero} — livraison': '{numero} — entrega',
    '(pas encore expédié)': '(aún no expedido)',
    'Suivi transporteur': 'Seguimiento del transportista',
    'Annuler la commande': 'Cancelar el pedido',
    'Commande annulée': 'Pedido cancelado',

    /* --- Canaux de vente --- */
    'Nouveau canal': 'Nuevo canal',
    'La règle du canal décide du transporteur à la validation : moins cher, plus rapide, ou un transporteur imposé (code TRP-…).':
      'La regla del canal decide el transportista en la validación: más barato, más rápido, o un transportista impuesto (código TRP-…).',
    'Règle transporteur': 'Regla de transportista',
    'Priorité': 'Prioridad',
    'Aucun canal.': 'Sin canales.',
    'Le transporteur le moins cher (simulation TMS)': 'El transportista más barato (simulación TMS)',
    'Le plus rapide (délai le plus court)': 'El más rápido (plazo más corto)',
    'Transporteur imposé (saisir le code ci-dessous)': 'Transportista impuesto (introduzca el código abajo)',
    'Code imposé (optionnel)': 'Código impuesto (opcional)',
    'Canal actif': 'Canal activo',
    'Canal créé': 'Canal creado',
    'Modifier {code}': 'Modificar {code}',
    'Canal modifié': 'Canal modificado',

    /* --- Liaisons --- */
    'Liaisons avec la suite': 'Enlaces con la suite',
    'EN LIGNE': 'EN LÍNEA', 'COUPÉE': 'CORTADA',
    'Clients synchronisés': 'Clientes sincronizados',
    'Commandes OMS': 'Pedidos OMS',
    'Rôle de l\'OMS dans la suite': 'El papel del OMS en la suite',
    '<b>Validation :</b> le stock disponible est contrôlé en direct dans le WMS avant d\'accepter la commande — plus de promesses invendables.':
      '<b>Validación:</b> el stock disponible se controla en directo en el WMS antes de aceptar el pedido — sin promesas incumplibles.',
    '<b>Choix transporteur :</b> à la validation, l\'OMS interroge le simulateur du TMS et applique la règle du canal (moins cher / plus rapide / imposé).':
      '<b>Elección de transportista:</b> en la validación, el OMS consulta el simulador del TMS y aplica la regla del canal (más barato / más rápido / impuesto).',
    '<b>Transmission :</b> la commande part au WMS avec la référence OMS — la traçabilité est conservée de bout en bout.':
      '<b>Transmisión:</b> el pedido va al WMS con la referencia OMS — la trazabilidad se conserva de extremo a extremo.',
    '<b>Suivi :</b> toutes les 60 s, l\'OMS projette les statuts WMS (préparation) et TMS (livraison) sur ses commandes, jusqu\'au statut LIVREE.':
      '<b>Seguimiento:</b> cada 60 s, el OMS proyecta los estados WMS (preparación) y TMS (entrega) sobre sus pedidos, hasta el estado ENTREGADO.',
    'Synchroniser les clients': 'Sincronizar los clientes',
    'Rafraîchir le suivi maintenant': 'Actualizar el seguimiento ahora',
    '{n} clients WMS synchronisés ({nouveaux} nouveaux)': '{n} clientes WMS sincronizados ({nouveaux} nuevos)',
  },

  /* ---------------------------------------------------------- */
  ar: {
    /* --- Général / connexion --- */
    'LM-OMS — Commandes': 'LM-OMS — الطلبات',
    'Tour de contrôle des commandes': 'برج التحكم في الطلبات',
    'Connexion à LM-OMS': 'تسجيل الدخول إلى LM-OMS',
    'Comptes de la suite LM (validés auprès du WMS).': 'حسابات حزمة LM (يتم التحقق منها لدى WMS).',
    'Code utilisateur': 'رمز المستخدم', 'Mot de passe': 'كلمة المرور', 'Se connecter': 'تسجيل الدخول',
    'quitter': 'خروج',
    'Erreur : {message}': 'خطأ: {message}',
    'Connexion requise': 'يلزم تسجيل الدخول', 'Erreur serveur': 'خطأ في الخادم',
    'Identifiants invalides': 'بيانات الدخول غير صحيحة',

    /* --- Menu --- */
    'Pilotage': 'القيادة',
    'Tour de contrôle': 'برج التحكم',
    'Commandes': 'الطلبات',
    'Toutes les commandes': 'كل الطلبات',
    'Paramétrage': 'الإعدادات',
    'Canaux de vente': 'قنوات البيع',
    'Liaisons WMS / TMS': 'روابط WMS / TMS',
    'Suite LM :': 'حزمة LM:',

    /* --- Statuts / rôles --- */
    'RECUE': 'مستلم', 'VALIDEE': 'مصادق عليه', 'EN_RUPTURE': 'نفاد', 'TRANSMISE': 'مُرسل',
    'EN_PREPARATION': 'قيد التحضير', 'PREPAREE': 'محضّر', 'EXPEDIEE': 'مشحون',
    'LIVREE': 'تم التسليم', 'ANNULEE': 'ملغى',
    'ENLEVEE': 'تم الالتقاط', 'EN_TRANSIT': 'قيد النقل', 'INCIDENT': 'حادث',
    'ATTENTE': 'قيد الانتظار', 'ALLOUEE': 'مخصص', 'EMBALLEE': 'معبأ',
    'ACTIF': 'نشط', 'INACTIF': 'غير نشط',
    'MOINS_CHER': 'الأرخص', 'PLUS_RAPIDE': 'الأسرع', 'IMPOSE': 'مفروض',
    'OPERATEUR': 'عامل', 'SUPERVISEUR': 'مشرف', 'ADMIN': 'مدير',

    /* --- Libellés communs --- */
    'N°': 'رقم', 'Statut': 'الحالة', 'Client': 'العميل', 'Canal': 'القناة',
    'Article': 'الصنف', 'Qté': 'الكمية', 'Nom': 'الاسم', 'Code': 'الرمز', 'Lieu': 'المكان',
    'Poids': 'الوزن', 'Transporteur': 'الناقل', 'Coût': 'التكلفة', 'Priorité': 'الأولوية',
    'État': 'الحالة', 'Fermer': 'إغلاق', 'Annuler': 'إلغاء', 'Créer': 'إنشاء',
    'Modifier': 'تعديل', 'Enregistrer': 'حفظ', 'Valider': 'تأكيد',

    /* --- Tour de contrôle --- */
    'Rafraîchir le suivi WMS/TMS': 'تحديث التتبع WMS/TMS',
    'Commandes reçues': 'الطلبات المستلمة',
    'À valider': 'بانتظار التأكيد',
    'En rupture': 'نفاد المخزون',
    'À transmettre au WMS': 'للإرسال إلى WMS',
    'En traitement entrepôt': 'قيد المعالجة في المستودع',
    'En livraison': 'قيد التسليم',
    'Livrées': 'مُسلَّمة',
    'En retard': 'متأخرة',
    'Transport estimé cumulé': 'النقل المقدر الإجمالي',
    'Taux de livraison par canal': 'معدل التسليم حسب القناة',
    '{livrees} livrées / {total}': '{livrees} مُسلَّمة / {total}',
    'Aucune commande.': 'لا توجد طلبات.',
    'À traiter en priorité': 'للمعالجة بأولوية',
    'Rien en attente : tout est parti.': 'لا شيء معلق: كل شيء انطلق.',
    '{n} commande(s) mise(s) à jour': 'تم تحديث {n} طلب',
    'Suivi à jour, rien de nouveau': 'التتبع محدّث، لا جديد',
    'Rien de nouveau': 'لا جديد',

    /* --- Commandes --- */
    'Commandes omnicanales': 'طلبات متعددة القنوات',
    "Coller une commande (email, message…)": "ألصق طلبًا (بريد، رسالة…)",
    "Pré-remplir avec l'IA": "التعبئة بالذكاء الاصطناعي",
    "à vérifier": "للتحقق",
    "Analyse en cours…": "جارٍ التحليل…",
    "ligne(s) proposée(s)": "سطر مقترح",
    "client à vérifier": "تحقق من العميل",
    "relisez avant de créer": "راجع قبل الإنشاء",
    'Nouvelle commande': 'طلب جديد',
    'Tous statuts': 'كل الحالات',
    'Tous canaux': 'كل القنوات',
    'Souhaité le': 'مطلوب في',
    '→ WMS': '← WMS',
    '{numero} en rupture : {articles}': '{numero} في نفاد: {articles}',
    '{numero} validée — {transporteur} ({motif})': 'صودق على {numero} — {transporteur} ({motif})',
    '{numero} transmise au WMS ({wms})': 'أُرسل {numero} إلى WMS ({wms})',
    'Livraison souhaitée': 'التسليم المطلوب',
    'Lignes (code article + quantité)': 'الأسطر (رمز الصنف + الكمية)',
    '+ Ajouter une ligne': '+ إضافة سطر',
    'Créer la commande': 'إنشاء الطلب',
    'Commande reçue — pensez à la valider': 'تم استلام الطلب — تذكّر المصادقة عليه',

    /* --- Détail 360° --- */
    '{numero} — vue 360°': '{numero} — عرض 360°',
    'Canal {canal} · client {client} · reçue le {date}': 'القناة {canal} · العميل {client} · استُلم في {date}',
    ' · souhaitée le {date}': ' · مطلوب في {date}',
    'Ruptures :': 'حالات النفاد:',
    'Transporteur :': 'الناقل:',
    'non affecté': 'غير مخصص',
    'Parcours dans la suite': 'المسار في الحزمة',
    '{numero} — préparation': '{numero} — تحضير',
    '(pas encore transmis)': '(لم يُرسل بعد)',
    '{numero} — livraison': '{numero} — تسليم',
    '(pas encore expédié)': '(لم يُشحن بعد)',
    'Suivi transporteur': 'تتبع الناقل',
    'Annuler la commande': 'إلغاء الطلب',
    'Commande annulée': 'تم إلغاء الطلب',

    /* --- Canaux de vente --- */
    'Nouveau canal': 'قناة جديدة',
    'La règle du canal décide du transporteur à la validation : moins cher, plus rapide, ou un transporteur imposé (code TRP-…).':
      'قاعدة القناة تحدد الناقل عند المصادقة: الأرخص، الأسرع، أو ناقل مفروض (الرمز TRP-…).',
    'Règle transporteur': 'قاعدة الناقل',
    'Priorité': 'الأولوية',
    'Aucun canal.': 'لا توجد قنوات.',
    'Le transporteur le moins cher (simulation TMS)': 'الناقل الأرخص (محاكاة TMS)',
    'Le plus rapide (délai le plus court)': 'الأسرع (أقصر مدة)',
    'Transporteur imposé (saisir le code ci-dessous)': 'ناقل مفروض (أدخل الرمز أدناه)',
    'Code imposé (optionnel)': 'الرمز المفروض (اختياري)',
    'Canal actif': 'قناة نشطة',
    'Canal créé': 'تم إنشاء القناة',
    'Modifier {code}': 'تعديل {code}',
    'Canal modifié': 'تم تعديل القناة',

    /* --- Liaisons --- */
    'Liaisons avec la suite': 'الروابط مع الحزمة',
    'EN LIGNE': 'متصل', 'COUPÉE': 'مقطوع',
    'Clients synchronisés': 'عملاء مزامنون',
    'Commandes OMS': 'طلبات OMS',
    'Rôle de l\'OMS dans la suite': 'دور OMS في الحزمة',
    '<b>Validation :</b> le stock disponible est contrôlé en direct dans le WMS avant d\'accepter la commande — plus de promesses invendables.':
      '<b>المصادقة:</b> يُراقب المخزون المتاح مباشرة في WMS قبل قبول الطلب — لا مزيد من الوعود غير القابلة للتنفيذ.',
    '<b>Choix transporteur :</b> à la validation, l\'OMS interroge le simulateur du TMS et applique la règle du canal (moins cher / plus rapide / imposé).':
      '<b>اختيار الناقل:</b> عند المصادقة، يستعلم OMS من محاكي TMS ويطبق قاعدة القناة (الأرخص / الأسرع / المفروض).',
    '<b>Transmission :</b> la commande part au WMS avec la référence OMS — la traçabilité est conservée de bout en bout.':
      '<b>الإرسال:</b> ينتقل الطلب إلى WMS مع مرجع OMS — تُحفظ إمكانية التتبع من البداية إلى النهاية.',
    '<b>Suivi :</b> toutes les 60 s, l\'OMS projette les statuts WMS (préparation) et TMS (livraison) sur ses commandes, jusqu\'au statut LIVREE.':
      '<b>التتبع:</b> كل 60 ثانية، يعكس OMS حالات WMS (التحضير) وTMS (التسليم) على طلباته، حتى حالة «تم التسليم».',
    'Synchroniser les clients': 'مزامنة العملاء',
    'Rafraîchir le suivi maintenant': 'تحديث التتبع الآن',
    '{n} clients WMS synchronisés ({nouveaux} nouveaux)': 'تمت مزامنة {n} عميلًا من WMS ({nouveaux} جديد)',
  },
};

/* ============================================================
 *  Traduction des éléments statiques + sélecteur de langue
 * ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = LANGUE;
  if (LANGUES_RTL.includes(LANGUE)) document.documentElement.dir = 'rtl';
  document.title = tr(document.title);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = tr(el.textContent.trim());
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = tr(el.placeholder);
  });
  document.querySelectorAll('[data-langue]').forEach(bouton => {
    bouton.classList.toggle('actif', bouton.dataset.langue === LANGUE);
    bouton.addEventListener('click', () => changerLangue(bouton.dataset.langue));
  });
});
