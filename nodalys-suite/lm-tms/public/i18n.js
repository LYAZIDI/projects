'use strict';
/* ============================================================
 *  LM-TMS - Internationalisation (français / anglais / espagnol / arabe)
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
    'LM-TMS — Transport': 'LM-TMS — Transport',
    'Gestion du transport': 'Transport management',
    'Connexion à LM-TMS': 'Sign in to LM-TMS',
    'Comptes de la suite LM (validés auprès du LM-WMS).': 'LM Suite accounts (validated against LM-WMS).',
    'Code utilisateur': 'User code', 'Mot de passe': 'Password', 'Se connecter': 'Sign in',
    'quitter': 'sign out',
    'Erreur : {message}': 'Error: {message}',
    'Connexion requise': 'Sign-in required', 'Erreur serveur': 'Server error',
    'Identifiants invalides': 'Invalid credentials',

    /* --- Menu --- */
    'Pilotage': 'Control',
    'Expéditions & suivi': 'Shipments & tracking',
    'Tarification': 'Pricing',
    'Simulateur de coût': 'Cost simulator',
    'Transporteurs & grilles': 'Carriers & rate cards',
    'Facturation': 'Invoicing',
    'Pré-facturation': 'Pre-invoicing',
    'Intégration': 'Integration',
    'Liaison WMS': 'WMS link',
    'Suite LM :': 'LM Suite:',
    'LM-WMS (entrepôt)': 'LM-WMS (warehouse)',

    /* --- Statuts / rôles --- */
    'ENLEVEE': 'PICKED UP', 'EN_TRANSIT': 'IN TRANSIT', 'LIVREE': 'DELIVERED',
    'INCIDENT': 'INCIDENT', 'A_VALIDER': 'TO CONFIRM', 'VALIDEE': 'VALIDATED',
    'LITIGE': 'DISPUTE', 'ACTIF': 'ACTIVE', 'INACTIF': 'INACTIVE',
    'COLIS': 'PARCEL', 'EXPRESS': 'EXPRESS', 'PALETTE': 'PALLET',
    'MEILLEUR PRIX': 'BEST PRICE',
    'OPERATEUR': 'OPERATOR', 'SUPERVISEUR': 'SUPERVISOR', 'ADMIN': 'ADMIN',

    /* --- Libellés communs --- */
    'N°': 'No.', 'Statut': 'Status', 'Date': 'Date', 'Nom': 'Name', 'Code': 'Code',
    'Fermer': 'Close', 'Annuler': 'Cancel', 'Créer': 'Create', 'Modifier': 'Edit',
    'Enregistrer': 'Save', 'Détail': 'Details', 'État': 'State',
    'Transporteur': 'Carrier', 'Service': 'Service',

    /* --- Expéditions --- */
    'Expéditions': 'Shipments',
    'En cours de livraison': 'Out for delivery',
    'Incidents ouverts': 'Open incidents',
    'Coût transport cumulé': 'Total transport cost',
    'Coût moyen / expédition': 'Average cost / shipment',
    'Ponctualité livraisons': 'On-time delivery',
    'Tous statuts': 'All statuses',
    'Tous transporteurs': 'All carriers',
    'Chargement WMS': 'WMS load',
    'Colis': 'Parcels', 'Poids': 'Weight', 'Coût': 'Cost',
    'Départ': 'Departure', 'Prévu le': 'Due', 'Suivi': 'Track',
    'Aucune expédition — elles arrivent du WMS (webhook) ou via Liaison WMS &gt; Importer.':
      'No shipments — they come from the WMS (webhook) or via WMS link &gt; Import.',
    'Chargement WMS {chargement} · commandes {commandes} · {colis} colis · {poids} kg · {cout} € · prévu le {date}':
      'WMS load {chargement} · orders {commandes} · {colis} parcels · {poids} kg · {cout} € · due {date}',
    'Lieu': 'Place', 'Commentaire': 'Comment',
    'Nouvel événement': 'New event',
    'Événement enregistré': 'Event recorded',

    /* --- Simulateur --- */
    'Comparer les transporteurs pour un envoi': 'Compare carriers for a shipment',
    'Poids total (kg)': 'Total weight (kg)',
    'Tous services': 'All services',
    'Comparer': 'Compare',
    'Aucune grille tarifaire ne correspond.': 'No rate card matches.',
    'Délai': 'Lead time', 'Coût estimé': 'Estimated cost',
    'Surcharge carburant incluse.': 'Fuel surcharge included.',

    /* --- Transporteurs & grilles --- */
    'Transporteurs & grilles tarifaires': 'Carriers & rate cards',
    'Synchroniser depuis le WMS': 'Sync from WMS',
    'Nouvelle grille': 'New rate card',
    'Fiches transporteurs (référentiel synchronisé du WMS, enrichi ici)':
      'Carrier records (synced from the WMS, enriched here)',
    'Contact': 'Contact',
    'Aucun transporteur : synchronisez depuis le WMS.': 'No carriers: sync from the WMS.',
    'Grilles tarifaires ({n})': 'Rate cards ({n})',
    'Tranches (jusqu\'à … kg → €)': 'Brackets (up to … kg → €)',
    '€/kg au-delà': '€/kg beyond',
    'Carburant': 'Fuel', 'Suppr.': 'Delete',
    'Aucune grille : créez-en pour activer le calcul de coût.':
      'No rate cards: create one to enable cost calculation.',
    '{total} transporteurs WMS synchronisés ({nouveaux} nouveaux)': '{total} WMS carriers synced ({nouveaux} new)',
    'Fiche {nom}': 'Record {nom}',
    'Délai (jours)': 'Lead time (days)',
    'Téléphone': 'Phone', 'E-mail': 'E-mail', 'Actif': 'Active',
    'Fiche mise à jour': 'Record updated',
    'Modifier la grille': 'Edit rate card',
    'Nouvelle grille tarifaire': 'New rate card',
    'Tranches de poids (jusqu\'à X kg → prix €)': 'Weight brackets (up to X kg → price €)',
    '+ Ajouter une tranche': '+ Add a bracket',
    'Surcharge carburant (%)': 'Fuel surcharge (%)',
    'Créer la grille': 'Create rate card',
    'Grille mise à jour': 'Rate card updated',
    'Grille créée': 'Rate card created',
    'Grille supprimée': 'Rate card deleted',

    /* --- Pré-facturation --- */
    'Pré-facturation transport': 'Transport pre-invoicing',
    'Saisir une facture': 'Enter an invoice',
    'Chaque ligne est contrôlée contre le coût théorique de la grille : au-delà de ±5 % d\'écart, la facture passe automatiquement en litige.':
      'Each line is checked against the theoretical rate-card cost: beyond ±5% variance, the invoice automatically goes to dispute.',
    'N° facture': 'Invoice no.', 'Montant': 'Amount',
    'Écart vs théorique': 'Variance vs theoretical',
    'Aucune facture saisie.': 'No invoices entered.',
    'Facture {numero} — {transporteur}': 'Invoice {numero} — {transporteur}',
    'Expédition': 'Shipment', 'Théorique': 'Theoretical', 'Facturé': 'Invoiced', 'Écart': 'Variance',
    'Valider malgré tout': 'Approve anyway',
    'Passer en litige': 'Move to dispute',
    'Facture validée': 'Invoice approved',
    'Facture passée en litige': 'Invoice moved to dispute',
    'Saisir une facture transporteur': 'Enter a carrier invoice',
    'N° de facture': 'Invoice number',
    'Contrôler et enregistrer': 'Check and save',
    'Aucune expédition non facturée pour ce transporteur.': 'No uninvoiced shipments for this carrier.',
    'Montant facturé': 'Invoiced amount',
    'Facture enregistrée : écart > 5 % détecté, passée en LITIGE':
      'Invoice saved: variance > 5% detected, moved to DISPUTE',
    'Facture contrôlée : conforme, à valider': 'Invoice checked: compliant, ready to approve',

    /* --- Liaison WMS --- */
    'Liaison avec le LM-WMS': 'Link with the LM-WMS',
    'EN LIGNE': 'ONLINE', 'COUPÉE': 'DOWN',
    'Transporteurs synchronisés': 'Carriers synced',
    'Grilles tarifaires locales': 'Local rate cards',
    'Expéditions enregistrées': 'Shipments recorded',
    'Fonctionnement de l\'intégration': 'How the integration works',
    '<b>Temps réel :</b> à chaque départ de chargement, le WMS notifie le TMS (webhook signé par la clé d\'intégration) — l\'expédition apparaît ici avec son coût.':
      '<b>Real time:</b> at each load departure, the WMS notifies the TMS (webhook signed with the integration key) — the shipment appears here with its cost.',
    '<b>Référentiel :</b> la liste des transporteurs vient du WMS ; le TMS l\'enrichit (délais, contacts, grilles) sans jamais la modifier côté WMS.':
      '<b>Master data:</b> the carrier list comes from the WMS; the TMS enriches it (lead times, contacts, rate cards) without ever modifying it on the WMS side.',
    '<b>Rattrapage :</b> si le TMS était éteint, l\'import ci-dessous récupère les chargements expédiés manquants via l\'API du WMS.':
      '<b>Catch-up:</b> if the TMS was down, the import below fetches the missing shipped loads via the WMS API.',
    '<b>Comptes :</b> la connexion est validée auprès du WMS — un seul référentiel d\'utilisateurs pour toute la suite.':
      '<b>Accounts:</b> sign-in is validated against the WMS — a single user repository for the whole suite.',
    'Synchroniser les transporteurs': 'Sync carriers',
    'Importer les chargements manquants': 'Import missing loads',
    '{n} transporteurs synchronisés ({nouveaux} nouveaux)': '{n} carriers synced ({nouveaux} new)',
    '{n} expédition(s) importée(s) du WMS': '{n} shipment(s) imported from the WMS',
    'Rien à rattraper : tout est déjà synchronisé': 'Nothing to catch up: everything is already synced',
  },

  /* ---------------------------------------------------------- */
  es: {
    /* --- Général / connexion --- */
    'LM-TMS — Transport': 'LM-TMS — Transporte',
    'Gestion du transport': 'Gestión del transporte',
    'Connexion à LM-TMS': 'Conexión a LM-TMS',
    'Comptes de la suite LM (validés auprès du LM-WMS).': 'Cuentas de la suite LM (validadas en el LM-WMS).',
    'Code utilisateur': 'Código de usuario', 'Mot de passe': 'Contraseña', 'Se connecter': 'Iniciar sesión',
    'quitter': 'salir',
    'Erreur : {message}': 'Error: {message}',
    'Connexion requise': 'Conexión requerida', 'Erreur serveur': 'Error del servidor',
    'Identifiants invalides': 'Credenciales inválidas',

    /* --- Menu --- */
    'Pilotage': 'Pilotaje',
    'Expéditions & suivi': 'Expediciones y seguimiento',
    'Tarification': 'Tarificación',
    'Simulateur de coût': 'Simulador de costes',
    'Transporteurs & grilles': 'Transportistas y tarifas',
    'Facturation': 'Facturación',
    'Pré-facturation': 'Prefacturación',
    'Intégration': 'Integración',
    'Liaison WMS': 'Enlace WMS',
    'Suite LM :': 'Suite LM:',
    'LM-WMS (entrepôt)': 'LM-WMS (almacén)',

    /* --- Statuts / rôles --- */
    'ENLEVEE': 'RECOGIDA', 'EN_TRANSIT': 'EN TRÁNSITO', 'LIVREE': 'ENTREGADA',
    'INCIDENT': 'INCIDENCIA', 'A_VALIDER': 'POR VALIDAR', 'VALIDEE': 'VALIDADA',
    'LITIGE': 'LITIGIO', 'ACTIF': 'ACTIVO', 'INACTIF': 'INACTIVO',
    'COLIS': 'BULTO', 'EXPRESS': 'EXPRESS', 'PALETTE': 'PALET',
    'MEILLEUR PRIX': 'MEJOR PRECIO',
    'OPERATEUR': 'OPERARIO', 'SUPERVISEUR': 'SUPERVISOR', 'ADMIN': 'ADMIN',

    /* --- Libellés communs --- */
    'N°': 'N.º', 'Statut': 'Estado', 'Date': 'Fecha', 'Nom': 'Nombre', 'Code': 'Código',
    'Fermer': 'Cerrar', 'Annuler': 'Cancelar', 'Créer': 'Crear', 'Modifier': 'Modificar',
    'Enregistrer': 'Guardar', 'Détail': 'Detalle', 'État': 'Estado',
    'Transporteur': 'Transportista', 'Service': 'Servicio',

    /* --- Expéditions --- */
    'Expéditions': 'Expediciones',
    'En cours de livraison': 'En reparto',
    'Incidents ouverts': 'Incidencias abiertas',
    'Coût transport cumulé': 'Coste de transporte acumulado',
    'Coût moyen / expédition': 'Coste medio / expedición',
    'Ponctualité livraisons': 'Puntualidad de entregas',
    'Tous statuts': 'Todos los estados',
    'Tous transporteurs': 'Todos los transportistas',
    'Chargement WMS': 'Carga WMS',
    'Colis': 'Bultos', 'Poids': 'Peso', 'Coût': 'Coste',
    'Départ': 'Salida', 'Prévu le': 'Previsto el', 'Suivi': 'Seguimiento',
    'Aucune expédition — elles arrivent du WMS (webhook) ou via Liaison WMS &gt; Importer.':
      'Sin expediciones — llegan del WMS (webhook) o vía Enlace WMS &gt; Importar.',
    'Chargement WMS {chargement} · commandes {commandes} · {colis} colis · {poids} kg · {cout} € · prévu le {date}':
      'Carga WMS {chargement} · pedidos {commandes} · {colis} bultos · {poids} kg · {cout} € · previsto el {date}',
    'Lieu': 'Lugar', 'Commentaire': 'Comentario',
    'Nouvel événement': 'Nuevo evento',
    'Événement enregistré': 'Evento registrado',

    /* --- Simulateur --- */
    'Comparer les transporteurs pour un envoi': 'Comparar transportistas para un envío',
    'Poids total (kg)': 'Peso total (kg)',
    'Tous services': 'Todos los servicios',
    'Comparer': 'Comparar',
    'Aucune grille tarifaire ne correspond.': 'Ninguna tarifa corresponde.',
    'Délai': 'Plazo', 'Coût estimé': 'Coste estimado',
    'Surcharge carburant incluse.': 'Recargo de combustible incluido.',

    /* --- Transporteurs & grilles --- */
    'Transporteurs & grilles tarifaires': 'Transportistas y tarifas',
    'Synchroniser depuis le WMS': 'Sincronizar desde el WMS',
    'Nouvelle grille': 'Nueva tarifa',
    'Fiches transporteurs (référentiel synchronisé du WMS, enrichi ici)':
      'Fichas de transportistas (referencial sincronizado del WMS, enriquecido aquí)',
    'Contact': 'Contacto',
    'Aucun transporteur : synchronisez depuis le WMS.': 'Sin transportistas: sincronice desde el WMS.',
    'Grilles tarifaires ({n})': 'Tarifas ({n})',
    'Tranches (jusqu\'à … kg → €)': 'Tramos (hasta … kg → €)',
    '€/kg au-delà': '€/kg adicional',
    'Carburant': 'Combustible', 'Suppr.': 'Supr.',
    'Aucune grille : créez-en pour activer le calcul de coût.':
      'Sin tarifas: cree una para activar el cálculo de costes.',
    '{total} transporteurs WMS synchronisés ({nouveaux} nouveaux)': '{total} transportistas WMS sincronizados ({nouveaux} nuevos)',
    'Fiche {nom}': 'Ficha {nom}',
    'Délai (jours)': 'Plazo (días)',
    'Téléphone': 'Teléfono', 'E-mail': 'E-mail', 'Actif': 'Activo',
    'Fiche mise à jour': 'Ficha actualizada',
    'Modifier la grille': 'Modificar la tarifa',
    'Nouvelle grille tarifaire': 'Nueva tarifa',
    'Tranches de poids (jusqu\'à X kg → prix €)': 'Tramos de peso (hasta X kg → precio €)',
    '+ Ajouter une tranche': '+ Añadir un tramo',
    'Surcharge carburant (%)': 'Recargo de combustible (%)',
    'Créer la grille': 'Crear la tarifa',
    'Grille mise à jour': 'Tarifa actualizada',
    'Grille créée': 'Tarifa creada',
    'Grille supprimée': 'Tarifa eliminada',

    /* --- Pré-facturation --- */
    'Pré-facturation transport': 'Prefacturación de transporte',
    'Saisir une facture': 'Introducir una factura',
    'Chaque ligne est contrôlée contre le coût théorique de la grille : au-delà de ±5 % d\'écart, la facture passe automatiquement en litige.':
      'Cada línea se controla contra el coste teórico de la tarifa: más allá de ±5 % de desviación, la factura pasa automáticamente a litigio.',
    'N° facture': 'N.º factura', 'Montant': 'Importe',
    'Écart vs théorique': 'Desviación vs teórico',
    'Aucune facture saisie.': 'Ninguna factura introducida.',
    'Facture {numero} — {transporteur}': 'Factura {numero} — {transporteur}',
    'Expédition': 'Expedición', 'Théorique': 'Teórico', 'Facturé': 'Facturado', 'Écart': 'Desviación',
    'Valider malgré tout': 'Validar de todos modos',
    'Passer en litige': 'Pasar a litigio',
    'Facture validée': 'Factura validada',
    'Facture passée en litige': 'Factura pasada a litigio',
    'Saisir une facture transporteur': 'Introducir una factura de transportista',
    'N° de facture': 'N.º de factura',
    'Contrôler et enregistrer': 'Controlar y guardar',
    'Aucune expédition non facturée pour ce transporteur.': 'Ninguna expedición sin facturar para este transportista.',
    'Montant facturé': 'Importe facturado',
    'Facture enregistrée : écart > 5 % détecté, passée en LITIGE':
      'Factura registrada: desviación > 5 % detectada, pasada a LITIGIO',
    'Facture contrôlée : conforme, à valider': 'Factura controlada: conforme, por validar',

    /* --- Liaison WMS --- */
    'Liaison avec le LM-WMS': 'Enlace con el LM-WMS',
    'EN LIGNE': 'EN LÍNEA', 'COUPÉE': 'CORTADA',
    'Transporteurs synchronisés': 'Transportistas sincronizados',
    'Grilles tarifaires locales': 'Tarifas locales',
    'Expéditions enregistrées': 'Expediciones registradas',
    'Fonctionnement de l\'intégration': 'Funcionamiento de la integración',
    '<b>Temps réel :</b> à chaque départ de chargement, le WMS notifie le TMS (webhook signé par la clé d\'intégration) — l\'expédition apparaît ici avec son coût.':
      '<b>Tiempo real:</b> en cada salida de carga, el WMS notifica al TMS (webhook firmado con la clave de integración) — la expedición aparece aquí con su coste.',
    '<b>Référentiel :</b> la liste des transporteurs vient du WMS ; le TMS l\'enrichit (délais, contacts, grilles) sans jamais la modifier côté WMS.':
      '<b>Referencial:</b> la lista de transportistas viene del WMS; el TMS la enriquece (plazos, contactos, tarifas) sin modificarla nunca en el lado WMS.',
    '<b>Rattrapage :</b> si le TMS était éteint, l\'import ci-dessous récupère les chargements expédiés manquants via l\'API du WMS.':
      '<b>Recuperación:</b> si el TMS estaba apagado, la importación de abajo recupera las cargas expedidas que faltan vía la API del WMS.',
    '<b>Comptes :</b> la connexion est validée auprès du WMS — un seul référentiel d\'utilisateurs pour toute la suite.':
      '<b>Cuentas:</b> la conexión se valida en el WMS — un único referencial de usuarios para toda la suite.',
    'Synchroniser les transporteurs': 'Sincronizar los transportistas',
    'Importer les chargements manquants': 'Importar las cargas que faltan',
    '{n} transporteurs synchronisés ({nouveaux} nouveaux)': '{n} transportistas sincronizados ({nouveaux} nuevos)',
    '{n} expédition(s) importée(s) du WMS': '{n} expedición(es) importada(s) del WMS',
    'Rien à rattraper : tout est déjà synchronisé': 'Nada que recuperar: todo ya está sincronizado',
  },

  /* ---------------------------------------------------------- */
  ar: {
    /* --- Général / connexion --- */
    'LM-TMS — Transport': 'LM-TMS — النقل',
    'Gestion du transport': 'إدارة النقل',
    'Connexion à LM-TMS': 'تسجيل الدخول إلى LM-TMS',
    'Comptes de la suite LM (validés auprès du LM-WMS).': 'حسابات حزمة LM (يتم التحقق منها لدى LM-WMS).',
    'Code utilisateur': 'رمز المستخدم', 'Mot de passe': 'كلمة المرور', 'Se connecter': 'تسجيل الدخول',
    'quitter': 'خروج',
    'Erreur : {message}': 'خطأ: {message}',
    'Connexion requise': 'يلزم تسجيل الدخول', 'Erreur serveur': 'خطأ في الخادم',
    'Identifiants invalides': 'بيانات الدخول غير صحيحة',

    /* --- Menu --- */
    'Pilotage': 'القيادة',
    'Expéditions & suivi': 'الشحنات والتتبع',
    'Tarification': 'التسعير',
    'Simulateur de coût': 'محاكي التكلفة',
    'Transporteurs & grilles': 'الناقلون والتعريفات',
    'Facturation': 'الفوترة',
    'Pré-facturation': 'الفوترة المسبقة',
    'Intégration': 'التكامل',
    'Liaison WMS': 'ربط WMS',
    'Suite LM :': 'حزمة LM:',
    'LM-WMS (entrepôt)': 'LM-WMS (المستودع)',

    /* --- Statuts / rôles --- */
    'ENLEVEE': 'تم الالتقاط', 'EN_TRANSIT': 'قيد النقل', 'LIVREE': 'تم التسليم',
    'INCIDENT': 'حادث', 'A_VALIDER': 'بانتظار التأكيد', 'VALIDEE': 'مصادق عليها',
    'LITIGE': 'نزاع', 'ACTIF': 'نشط', 'INACTIF': 'غير نشط',
    'COLIS': 'طرد', 'EXPRESS': 'إكسبريس', 'PALETTE': 'منصة',
    'MEILLEUR PRIX': 'أفضل سعر',
    'OPERATEUR': 'عامل', 'SUPERVISEUR': 'مشرف', 'ADMIN': 'مدير',

    /* --- Libellés communs --- */
    'N°': 'رقم', 'Statut': 'الحالة', 'Date': 'التاريخ', 'Nom': 'الاسم', 'Code': 'الرمز',
    'Fermer': 'إغلاق', 'Annuler': 'إلغاء', 'Créer': 'إنشاء', 'Modifier': 'تعديل',
    'Enregistrer': 'حفظ', 'Détail': 'تفاصيل', 'État': 'الحالة',
    'Transporteur': 'الناقل', 'Service': 'الخدمة',

    /* --- Expéditions --- */
    'Expéditions': 'الشحنات',
    'En cours de livraison': 'قيد التسليم',
    'Incidents ouverts': 'حوادث مفتوحة',
    'Coût transport cumulé': 'تكلفة النقل الإجمالية',
    'Coût moyen / expédition': 'متوسط التكلفة / شحنة',
    'Ponctualité livraisons': 'دقة مواعيد التسليم',
    'Tous statuts': 'كل الحالات',
    'Tous transporteurs': 'كل الناقلين',
    'Chargement WMS': 'حمولة WMS',
    'Colis': 'الطرود', 'Poids': 'الوزن', 'Coût': 'التكلفة',
    'Départ': 'الانطلاق', 'Prévu le': 'متوقع في', 'Suivi': 'تتبع',
    'Aucune expédition — elles arrivent du WMS (webhook) ou via Liaison WMS &gt; Importer.':
      'لا توجد شحنات — تأتي من WMS (ويبهوك) أو عبر ربط WMS &gt; استيراد.',
    'Chargement WMS {chargement} · commandes {commandes} · {colis} colis · {poids} kg · {cout} € · prévu le {date}':
      'حمولة WMS {chargement} · طلبات {commandes} · {colis} طرود · {poids} كغ · {cout} € · متوقع في {date}',
    'Lieu': 'المكان', 'Commentaire': 'تعليق',
    'Nouvel événement': 'حدث جديد',
    'Événement enregistré': 'تم تسجيل الحدث',

    /* --- Simulateur --- */
    'Comparer les transporteurs pour un envoi': 'قارن الناقلين لإرسالية',
    'Poids total (kg)': 'الوزن الإجمالي (كغ)',
    'Tous services': 'كل الخدمات',
    'Comparer': 'قارن',
    'Aucune grille tarifaire ne correspond.': 'لا توجد تعريفة مطابقة.',
    'Délai': 'المدة', 'Coût estimé': 'التكلفة المقدرة',
    'Surcharge carburant incluse.': 'رسوم الوقود مشمولة.',

    /* --- Transporteurs & grilles --- */
    'Transporteurs & grilles tarifaires': 'الناقلون والتعريفات',
    'Synchroniser depuis le WMS': 'مزامنة من WMS',
    'Nouvelle grille': 'تعريفة جديدة',
    'Fiches transporteurs (référentiel synchronisé du WMS, enrichi ici)':
      'بطاقات الناقلين (مرجع مزامن من WMS، يُثرى هنا)',
    'Contact': 'جهة الاتصال',
    'Aucun transporteur : synchronisez depuis le WMS.': 'لا يوجد ناقلون: زامن من WMS.',
    'Grilles tarifaires ({n})': 'التعريفات ({n})',
    'Tranches (jusqu\'à … kg → €)': 'الشرائح (حتى … كغ → €)',
    '€/kg au-delà': '€/كغ إضافي',
    'Carburant': 'الوقود', 'Suppr.': 'حذف',
    'Aucune grille : créez-en pour activer le calcul de coût.':
      'لا توجد تعريفات: أنشئ واحدة لتفعيل حساب التكلفة.',
    '{total} transporteurs WMS synchronisés ({nouveaux} nouveaux)': 'تمت مزامنة {total} ناقلًا من WMS ({nouveaux} جديد)',
    'Fiche {nom}': 'بطاقة {nom}',
    'Délai (jours)': 'المدة (أيام)',
    'Téléphone': 'الهاتف', 'E-mail': 'البريد الإلكتروني', 'Actif': 'نشط',
    'Fiche mise à jour': 'تم تحديث البطاقة',
    'Modifier la grille': 'تعديل التعريفة',
    'Nouvelle grille tarifaire': 'تعريفة جديدة',
    'Tranches de poids (jusqu\'à X kg → prix €)': 'شرائح الوزن (حتى X كغ → السعر €)',
    '+ Ajouter une tranche': '+ إضافة شريحة',
    'Surcharge carburant (%)': 'رسوم الوقود (%)',
    'Créer la grille': 'إنشاء التعريفة',
    'Grille mise à jour': 'تم تحديث التعريفة',
    'Grille créée': 'تم إنشاء التعريفة',
    'Grille supprimée': 'تم حذف التعريفة',

    /* --- Pré-facturation --- */
    'Pré-facturation transport': 'الفوترة المسبقة للنقل',
    'Saisir une facture': 'إدخال فاتورة',
    'Chaque ligne est contrôlée contre le coût théorique de la grille : au-delà de ±5 % d\'écart, la facture passe automatiquement en litige.':
      'يُراقب كل سطر مقابل التكلفة النظرية للتعريفة: عند تجاوز ±5% من الفرق تنتقل الفاتورة تلقائيًا إلى نزاع.',
    'N° facture': 'رقم الفاتورة', 'Montant': 'المبلغ',
    'Écart vs théorique': 'الفرق عن النظري',
    'Aucune facture saisie.': 'لم تُدخل فواتير.',
    'Facture {numero} — {transporteur}': 'فاتورة {numero} — {transporteur}',
    'Expédition': 'الشحنة', 'Théorique': 'النظري', 'Facturé': 'المفوتر', 'Écart': 'الفرق',
    'Valider malgré tout': 'المصادقة رغم ذلك',
    'Passer en litige': 'تحويل إلى نزاع',
    'Facture validée': 'تمت المصادقة على الفاتورة',
    'Facture passée en litige': 'حُولت الفاتورة إلى نزاع',
    'Saisir une facture transporteur': 'إدخال فاتورة ناقل',
    'N° de facture': 'رقم الفاتورة',
    'Contrôler et enregistrer': 'مراقبة وحفظ',
    'Aucune expédition non facturée pour ce transporteur.': 'لا توجد شحنات غير مفوترة لهذا الناقل.',
    'Montant facturé': 'المبلغ المفوتر',
    'Facture enregistrée : écart > 5 % détecté, passée en LITIGE':
      'سُجلت الفاتورة: اكتُشف فرق يتجاوز 5%، حُولت إلى نزاع',
    'Facture contrôlée : conforme, à valider': 'رُوقبت الفاتورة: مطابقة، بانتظار المصادقة',

    /* --- Liaison WMS --- */
    'Liaison avec le LM-WMS': 'الربط مع LM-WMS',
    'EN LIGNE': 'متصل', 'COUPÉE': 'مقطوع',
    'Transporteurs synchronisés': 'ناقلون مزامنون',
    'Grilles tarifaires locales': 'تعريفات محلية',
    'Expéditions enregistrées': 'شحنات مسجلة',
    'Fonctionnement de l\'intégration': 'طريقة عمل التكامل',
    '<b>Temps réel :</b> à chaque départ de chargement, le WMS notifie le TMS (webhook signé par la clé d\'intégration) — l\'expédition apparaît ici avec son coût.':
      '<b>الوقت الفعلي:</b> عند كل انطلاق حمولة، يخطر WMS نظام TMS (ويبهوك موقع بمفتاح التكامل) — تظهر الشحنة هنا بتكلفتها.',
    '<b>Référentiel :</b> la liste des transporteurs vient du WMS ; le TMS l\'enrichit (délais, contacts, grilles) sans jamais la modifier côté WMS.':
      '<b>البيانات الأساسية:</b> قائمة الناقلين تأتي من WMS؛ يثريها TMS (مدد، جهات اتصال، تعريفات) دون تعديلها في WMS أبدًا.',
    '<b>Rattrapage :</b> si le TMS était éteint, l\'import ci-dessous récupère les chargements expédiés manquants via l\'API du WMS.':
      '<b>الاستدراك:</b> إذا كان TMS متوقفًا، فإن الاستيراد أدناه يجلب الحمولات المشحونة الناقصة عبر واجهة WMS.',
    '<b>Comptes :</b> la connexion est validée auprès du WMS — un seul référentiel d\'utilisateurs pour toute la suite.':
      '<b>الحسابات:</b> يتم التحقق من الدخول لدى WMS — مرجع مستخدمين واحد لكل الحزمة.',
    'Synchroniser les transporteurs': 'مزامنة الناقلين',
    'Importer les chargements manquants': 'استيراد الحمولات الناقصة',
    '{n} transporteurs synchronisés ({nouveaux} nouveaux)': 'تمت مزامنة {n} ناقلًا ({nouveaux} جديد)',
    '{n} expédition(s) importée(s) du WMS': 'استُوردت {n} شحنة من WMS',
    'Rien à rattraper : tout est déjà synchronisé': 'لا شيء للاستدراك: كل شيء مزامن بالفعل',
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
