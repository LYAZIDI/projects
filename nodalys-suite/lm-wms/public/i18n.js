'use strict';
/* ============================================================
 *  LM-WMS - Internationalisation (français / anglais / espagnol / arabe)
 *
 *  Principe "gettext" : la clé de traduction EST le texte
 *  français. tr('Tableau de bord') rend la traduction dans la
 *  langue courante, ou le français si elle manque (repli sûr).
 *  Les textes dynamiques utilisent des gabarits :
 *      tr('Vague {numero} créée', { numero: 'V0001' })
 *
 *  La langue est mémorisée dans localStorage ('lm-langue') et
 *  partagée entre l'IHM superviseur et le terminal RF.
 * ============================================================ */

const LANGUES_DISPONIBLES = ['fr', 'en', 'es', 'ar'];
const LANGUES_RTL = ['ar'];   /* langues qui se lisent de droite à gauche */

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

/* Traduit une clé (texte français) + interpole les {parametres} */
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
    'LM-WMS — Superviseur': 'LM-WMS — Supervisor',
    'Pilotage d\'entrepôt': 'Warehouse control',
    'Connexion à LM-WMS': 'Sign in to LM-WMS',
    'Code utilisateur': 'User code',
    'Mot de passe': 'Password',
    'Se connecter': 'Sign in',
    'quitter': 'sign out',
    'Erreur : {message}': 'Error: {message}',
    'Connexion requise': 'Sign-in required',
    'Erreur serveur': 'Server error',
    'Identifiants invalides': 'Invalid credentials',

    /* --- Menu --- */
    'Pilotage': 'Control',
    'Tableau de bord': 'Dashboard',
    'Missions': 'Tasks',
    'Mouvements': 'Movements',
    'Connexion opérateur (RF)': 'Operator sign-in (RF)',
    'Flux entrant': 'Inbound',
    'Attendus / Réceptions': 'ASNs / Receipts',
    'Stock': 'Stock',
    'Supports / Palettes': 'Handling units / Pallets',
    'Inventaires': 'Counts',
    'Flux sortant': 'Outbound',
    'Commandes': 'Orders',
    'Vagues': 'Waves',
    'Colisage / Expéditions': 'Packing / Shipping',
    'Référentiels': 'Master data',
    'Articles': 'Items',
    'Emplacements': 'Locations',
    'Tiers / Transporteurs': 'Partners / Carriers',
    'Intégration': 'Integration',
    'Utilisateurs': 'Users',
    'Terminal opérateur :': 'Operator terminal:',
    'écran RF': 'RF screen',
    'Suite LM :': 'LM Suite:',

    /* --- Statuts (badges) --- */
    'ATTENTE': 'PENDING', 'ALLOUEE': 'ALLOCATED', 'EN_PREPARATION': 'IN PREPARATION',
    'PREPAREE': 'PREPARED', 'EMBALLEE': 'PACKED', 'EXPEDIEE': 'SHIPPED',
    'PREVU': 'EXPECTED', 'EN_COURS': 'IN PROGRESS', 'CLOTURE': 'CLOSED',
    'CREEE': 'CREATED', 'LANCEE': 'RELEASED', 'TERMINEE': 'COMPLETED',
    'EN_ATTENTE': 'PENDING', 'OUVERT': 'OPEN', 'FERME': 'CLOSED', 'EXPEDIE': 'SHIPPED',
    'DISPO': 'AVAILABLE', 'BLOQUE': 'BLOCKED', 'VALIDE': 'VALIDATED',
    'RANGEMENT': 'PUTAWAY', 'PICKING': 'PICKING', 'REAPPRO': 'REPLENISHMENT',
    'RUPTURE': 'SHORTAGE', 'INACTIF': 'INACTIVE', 'ACTIF': 'ACTIVE', 'VIDE': 'EMPTY',
    'ENTRANT': 'INBOUND', 'SORTANT': 'OUTBOUND', 'PARTIEL': 'PARTIAL', 'ERREUR': 'ERROR',
    'CLIENT': 'CUSTOMER', 'FOURNISSEUR': 'SUPPLIER',
    'OPERATEUR': 'OPERATOR', 'SUPERVISEUR': 'SUPERVISOR', 'ADMIN': 'ADMIN',
    'RECEPTION': 'RECEIPT', 'AJUSTEMENT': 'ADJUSTMENT', 'INVENTAIRE': 'COUNT',
    'EXPEDITION': 'SHIPPING', 'BLOCAGE': 'BLOCKING',

    /* --- Libellés communs --- */
    'Type': 'Type', 'Article': 'Item', 'Qté': 'Qty', 'De': 'From', 'Vers': 'To',
    'Référence': 'Reference', 'Statut': 'Status', 'Date': 'Date', 'Lot': 'Batch',
    'DLC': 'Expiry', 'Zone': 'Zone', 'Emplacement': 'Location', 'Opérateur': 'Operator',
    'Réservé': 'Reserved', 'N°': 'No.', 'Client': 'Customer', 'Fournisseur': 'Supplier',
    'Nom': 'Name', 'Ville': 'City', 'Code': 'Code', 'Adresse': 'Address',
    'Prio': 'Prio', 'Livraison': 'Delivery', 'Lignes': 'Lines', 'Détail': 'Details',
    'Fermer': 'Close', 'Annuler': 'Cancel', 'Créer': 'Create', 'Valider': 'Confirm',
    'Modifier': 'Edit', 'Enregistrer': 'Save', 'Ajouter': 'Add', 'Oui': 'Yes',
    'Rafraîchir': 'Refresh',

    /* --- Tableau de bord --- */
    'Détecter les réappros picking': 'Detect picking replenishments',
    'Commandes au portefeuille': 'Orders in portfolio',
    'En attente de vague': 'Awaiting wave',
    'En préparation': 'In preparation',
    'Prêtes à expédier': 'Ready to ship',
    'Expédiées': 'Shipped',
    'Commandes en rupture': 'Orders with shortages',
    'Attendus à réceptionner': 'ASNs to receive',
    'Vagues en cours': 'Waves in progress',
    'Mouvements sur 24 h': 'Movements last 24 h',
    'Références en stock': 'SKUs in stock',
    'Occupation de l\'entrepôt': 'Warehouse occupancy',
    'Alertes': 'Alerts',
    'Aucune alerte.': 'No alerts.',
    'Commande {numero} ({client}) en retard — livraison prévue le {date}':
      'Order {numero} ({client}) is late — delivery due {date}',
    'Rupture de stock sur la commande {numero}': 'Stock shortage on order {numero}',
    'Missions en attente ({n})': 'Pending tasks ({n})',
    'Aucune mission en attente.': 'No pending tasks.',
    '… et {n} autres (voir Missions).': '… and {n} more (see Tasks).',
    '{n} mission(s) de réappro générée(s)': '{n} replenishment task(s) generated',
    'Aucun mini picking en défaut': 'No picking minimum below threshold',

    /* --- Attendus / réceptions --- */
    'Attendus de réception': 'Inbound ASNs',
    'Nouvel attendu': 'New ASN',
    'Date prévue': 'Expected date',
    'Reçu / prévu': 'Received / expected',
    'Aucun attendu.': 'No ASNs.',
    'Réceptionner': 'Receive',
    'Nouvel attendu de réception': 'New inbound ASN',
    '+ Ajouter une ligne': '+ Add a line',
    'Créer l\'attendu': 'Create ASN',
    'Attendu créé': 'ASN created',
    'Qté prévue': 'Expected qty',
    'La réception crée le stock sur le quai et génère automatiquement une mission de rangement avec l\'adressage proposé.':
      'Receiving creates stock on the dock and automatically generates a putaway task with the suggested location.',
    'Prévu': 'Expected', 'Reçu': 'Received', 'Réception': 'Receipt',
    'N° lot': 'Batch no.', 'palette SSCC': 'SSCC pallet',
    'Reçu — mission de rangement vers {dest}': 'Received — putaway task to {dest}',
    '(à adresser)': '(to be assigned)',
    '(support {sscc})': '(handling unit {sscc})',

    /* --- Stock --- */
    'Stock à l\'emplacement': 'Stock by location',
    'Filtrer par article…': 'Filter by item…',
    'Filtrer par emplacement…': 'Filter by location…',
    'Toutes zones': 'All zones',
    'Aucune ligne de stock.': 'No stock lines.',
    'Ajuster': 'Adjust', 'Bloquer': 'Block', 'Débloquer': 'Unblock',
    'Ajustement — {article} sur {emplacement}': 'Adjustment — {article} at {emplacement}',
    'Nouvelle quantité (actuelle : {qte})': 'New quantity (current: {qte})',
    'Motif': 'Reason',
    'Casse, erreur de comptage…': 'Damage, counting error…',
    'Stock ajusté': 'Stock adjusted',
    'Ligne débloquée': 'Line unblocked',
    'Ligne bloquée (qualité)': 'Line blocked (quality)',

    /* --- Commandes --- */
    'Commandes clients': 'Customer orders',
    'Créer une vague avec la sélection': 'Create a wave from selection',
    'Nouvelle commande': 'New order',
    'Aucune commande.': 'No orders.',
    'Vague {numero} créée — lancez-la depuis l\'écran Vagues':
      'Wave {numero} created — release it from the Waves screen',
    'Priorité {p} · livraison {d} · transporteur {t}': 'Priority {p} · delivery {d} · carrier {t}',
    'non planifiée': 'not scheduled',
    'Cdée': 'Ordered', 'Allouée': 'Allocated', 'Préparée': 'Picked', 'Emballée': 'Packed',
    'Nouvelle commande client': 'New customer order',
    'Priorité (1-9)': 'Priority (1-9)',
    'Date de livraison': 'Delivery date',
    'Transporteur': 'Carrier',
    'Quantité': 'Quantity',
    'Créer la commande': 'Create order',
    'Commande créée': 'Order created',

    /* --- Vagues --- */
    'Vagues de préparation': 'Picking waves',
    'Créer une vague depuis l\'écran Commandes': 'Create a wave from the Orders screen',
    'Créée le': 'Created on',
    'Avancement': 'Progress',
    'Aucune vague.': 'No waves.',
    'Lancer': 'Release',
    'Vague lancée avec {n} rupture(s) : ': 'Wave released with {n} shortage(s): ',
    'Vague lancée — missions de picking générées': 'Wave released — picking tasks generated',
    'Ordre': 'Seq.', 'Commande': 'Order',
    'Vague non lancée : missions générées au lancement.': 'Wave not released: tasks are generated at release.',

    /* --- Missions --- */
    'Tous types': 'All types',
    'Tous statuts': 'All statuses',
    'Aucune mission.': 'No tasks.',
    'Valider la mission {id} ({type})': 'Confirm task {id} ({type})',
    '{article} — {qte} u. de {source} vers {dest}': '{article} — {qte} u. from {source} to {dest}',
    'Quantité réelle': 'Actual quantity',
    'Emplacement destination': 'Destination location',
    'Code emplacement': 'Location code',
    'Mission validée': 'Task confirmed',

    /* --- Colisage / expéditions --- */
    'Colisage & expéditions': 'Packing & shipping',
    'Nouveau colis': 'New parcel',
    'Nouveau chargement': 'New load',
    'Colis (SSCC)': 'Parcels (SSCC)',
    'Unités': 'Units',
    'Remplir': 'Fill', 'Étiquette': 'Label',
    'Chargements transporteur': 'Carrier loads',
    'Ajouter colis': 'Add parcel', 'Départ': 'Depart',
    'Aucun colis. Les commandes doivent être PREPAREE.': 'No parcels. Orders must be PREPARED.',
    'Aucun chargement.': 'No loads.',
    'Commande préparée': 'Picked order',
    'Générer le SSCC': 'Generate SSCC',
    'Colis créé — SSCC {sscc}': 'Parcel created — SSCC {sscc}',
    'Remplir le colis {sscc}': 'Fill parcel {sscc}',
    'Tout est déjà emballé pour cette commande.': 'Everything is already packed for this order.',
    'À emballer': 'To pack',
    'Ajouter au colis': 'Add to parcel',
    'Colis mis à jour': 'Parcel updated',
    'Colis fermé': 'Parcel closed',
    'Étiquette {sscc}': 'Label {sscc}',
    'LM-WMS — Étiquette logistique': 'LM-WMS — Logistics label',
    'Destinataire': 'Ship to',
    'Chargement créé': 'Load created',
    'Ajouter un colis au chargement': 'Add a parcel to the load',
    'Aucun colis fermé disponible.': 'No closed parcels available.',
    'Colis chargé': 'Parcel loaded',
    'Chargement parti — commandes expédiées': 'Load departed — orders shipped',

    /* --- Inventaires --- */
    'Nouvel inventaire d\'emplacement': 'New location count',
    'Écarts': 'Discrepancies',
    'Compter / valider': 'Count / confirm',
    'Aucun inventaire.': 'No counts.',
    'Nouvel inventaire': 'New count',
    'Emplacement à compter': 'Location to count',
    'Inventaire créé': 'Count created',
    '{numero} — comptage {emplacement}': '{numero} — counting {emplacement}',
    'Emplacement théoriquement vide : ajoutez ce que vous trouvez.':
      'Location theoretically empty: add whatever you find.',
    'Théorique': 'Expected', 'Compté': 'Counted',
    'Compter et valider les écarts': 'Count and confirm discrepancies',
    'Inventaire validé, stock ajusté': 'Count confirmed, stock adjusted',

    /* --- Mouvements --- */
    'Journal des mouvements': 'Movement log',
    'Aucun mouvement.': 'No movements.',

    /* --- Articles --- */
    'Nouvel article': 'New item',
    'Désignation': 'Description',
    'Rotation': 'Rotation', 'Mini': 'Min',
    'Aucun article.': 'No items.',
    'Emplacement picking dédié': 'Dedicated picking location',
    '— aucun —': '— none —',
    'Mini picking': 'Picking min',
    'Poids unit. (kg)': 'Unit weight (kg)',
    'Géré au lot': 'Batch-managed',
    'Géré en DLC (FEFO)': 'Expiry-managed (FEFO)',
    'Article créé': 'Item created',
    'Modifier {code}': 'Edit {code}',
    'Article modifié': 'Item updated',

    /* --- Emplacements --- */
    'Nouvel emplacement': 'New location',
    'Allée': 'Aisle', 'Occupation': 'Occupancy', 'État': 'State',
    'Aucun emplacement.': 'No locations.',
    'Emplacement débloqué': 'Location unblocked',
    'Emplacement bloqué': 'Location blocked',
    'Code (ex: R1-04-1)': 'Code (e.g. R1-04-1)',
    'Capacité (unités)': 'Capacity (units)',
    'Emplacement créé': 'Location created',

    /* --- Tiers --- */
    'Tiers & transporteurs': 'Partners & carriers',
    'Nouveau transporteur': 'New carrier',
    'Nouveau tiers': 'New partner',
    'Fournisseurs & clients': 'Suppliers & customers',
    'Aucun tiers.': 'No partners.',
    'Transporteurs': 'Carriers',
    'Aucun transporteur.': 'No carriers.',
    'Tiers créé': 'Partner created',
    'Transporteur créé': 'Carrier created',

    /* --- Supports --- */
    'Supports / palettes (SSCC)': 'Handling units / pallets (SSCC)',
    'Filtrer par SSCC…': 'Filter by SSCC…',
    'Contenu': 'Contents', 'vide': 'empty',
    'Aucun support.': 'No handling units.',
    'Déplacer': 'Move',
    'Déplacer le support {sscc}': 'Move handling unit {sscc}',
    'Actuellement sur {emplacement}. Tout le contenu suit le support.':
      'Currently at {emplacement}. All contents move with the unit.',
    'Support déplacé': 'Handling unit moved',

    /* --- EDI --- */
    'Interfaces EDI': 'EDI interfaces',
    'Exporter le stock (INVRPT)': 'Export stock (INVRPT)',
    'Scanner le répertoire entrant': 'Scan inbound folder',
    'Fonctionnement': 'How it works',
    'Déposez des fichiers <b>commandes_*.csv</b> ou <b>attendus_*.csv</b> dans <span class="mono">lm-wms/edi/entrant/</span> (modèles dans <span class="mono">edi/exemples/</span>) : ils sont intégrés automatiquement toutes les 5 secondes puis archivés. Les <b>DESADV</b> (avis d\'expédition) et <b>RECADV</b> (confirmations de réception) sont produits dans <span class="mono">edi/sortant/</span>.':
      'Drop <b>commandes_*.csv</b> or <b>attendus_*.csv</b> files into <span class="mono">lm-wms/edi/entrant/</span> (templates in <span class="mono">edi/exemples/</span>): they are imported automatically every 5 seconds, then archived. <b>DESADV</b> (dispatch advice) and <b>RECADV</b> (receiving advice) files are produced in <span class="mono">edi/sortant/</span>.',
    'Sens': 'Direction', 'Fichier': 'File', 'Message': 'Message',
    'Aucun échange pour le moment.': 'No exchanges yet.',
    'Aucun fichier dans edi/entrant': 'No files in edi/entrant',
    'Stock exporté : edi/sortant/{fichier}': 'Stock exported: edi/sortant/{fichier}',

    /* --- Utilisateurs --- */
    'Utilisateurs & rôles': 'Users & roles',
    'Nouvel utilisateur': 'New user',
    'Rôle': 'Role',
    '(vide = inchangé)': '(blank = unchanged)',
    'Compte actif': 'Active account',
    'Utilisateur créé': 'User created',
    'Utilisateur modifié': 'User updated',

    /* --- Connexion opérateur (RF) --- */
    'Connexion opérateur — terminal RF': 'Operator sign-in — RF terminal',
    'Scannez pour appairer un téléphone': 'Scan to pair a phone',
    'Génération du QR…': 'Generating QR…',
    'Ouvrir le terminal RF': 'Open the RF terminal',
    'Mettre un nouveau terminal en service': 'Set up a new terminal',
    'Sur le téléphone, ouvrez l\'appareil photo et <b>scannez le QR code</b> ci-contre.':
      'On the phone, open the camera and <b>scan the QR code</b> opposite.',
    'Le terminal RF s\'ouvre dans le navigateur.': 'The RF terminal opens in the browser.',
    'Menu du navigateur → <b>« Ajouter à l\'écran d\'accueil »</b> : une icône « LM-WMS RF » est créée, à taper chaque prise de poste (plus besoin de rescanner).':
      'Browser menu → <b>"Add to Home screen"</b>: an "LM-WMS RF" icon is created — tap it at each shift start (no need to rescan).',
    'L\'opérateur se connecte avec <b>son code</b> puis <b>son PIN</b>.':
      'The operator signs in with <b>their code</b> then <b>their PIN</b>.',
    'Le QR pointe vers l\'adresse que vous utilisez en ce moment.':
      'The QR points to the address you are using right now.',
    'Vous êtes sur une adresse <b>locale</b> (localhost) : un téléphone ne pourra pas l\'ouvrir. Affichez cet écran depuis l\'adresse publique de la suite pour un vrai appairage.':
      'You are on a <b>local</b> address (localhost): a phone cannot open it. Display this screen from the suite\'s public address for real pairing.',
    'Cette adresse est accessible depuis l\'extérieur : un téléphone la scannera sans problème.':
      'This address is reachable from outside: a phone will scan it without issue.',
    'Codes opérateurs actifs': 'Active operator codes',
    'Le mot de passe / PIN de chaque opérateur se gère dans l\'écran Utilisateurs.':
      'Each operator\'s password / PIN is managed in the Users screen.',
    'QR indisponible : {message}': 'QR unavailable: {message}',

    /* --- Terminal RF (écran caractère) --- */
    'SESSION EXPIREE - RECONNECTEZ-VOUS': 'SESSION EXPIRED - SIGN IN AGAIN',
    'ERREUR SERVEUR': 'SERVER ERROR',
    'IDENTIFICATION': 'SIGN-IN',
    'CODE OPERATEUR ?': 'OPERATOR CODE?',
    'OPERATEUR : {code}': 'OPERATOR: {code}',
    'CODE PIN ?': 'PIN CODE?',
    '[ENT] VALIDER   [ESC] RETOUR': '[ENT] CONFIRM   [ESC] BACK',
    '1. RANGEMENT': '1. PUTAWAY',
    '2. PICKING (VAGUES)': '2. PICKING (WAVES)',
    '3. REAPPRO PICKING': '3. REPLENISHMENT',
    '4. INVENTAIRE': '4. COUNT',
    '5. CONSULTATION STOCK': '5. STOCK INQUIRY',
    '6. DEPLACEMENT SUPPORT': '6. MOVE HANDLING UNIT',
    '9. FIN DE SESSION': '9. SIGN OUT',
    'CHOIX + [ENT]': 'CHOICE + [ENT]',
    'CHOIX INVALIDE': 'INVALID CHOICE',
    'PICKING - VAGUES': 'PICKING - WAVES',
    'AUCUNE VAGUE A PREPARER': 'NO WAVE TO PICK',
    '(LANCEZ UNE VAGUE DEPUIS LE': '(RELEASE A WAVE FROM THE',
    'POSTE SUPERVISEUR)': 'SUPERVISOR STATION)',
    'VAGUES EN COURS :': 'WAVES IN PROGRESS:',
    'N° + [ENT]': 'NO. + [ENT]',
    '({n} MISSIONS)': '({n} TASKS)',
    '*** VAGUE TERMINEE ***': '*** WAVE COMPLETE ***',
    'MISSION {o}  (RESTE {n})': 'TASK {o}  (LEFT {n})',
    'ALLEZ A : {e}': 'GO TO : {e}',
    'ARTICLE : {a}': 'ITEM    : {a}',
    'LOT     : {l}': 'BATCH   : {l}',
    'QTE     : {q}': 'QTY     : {q}',
    'CDE     : {c}': 'ORDER   : {c}',
    'SCANNEZ L\'EMPLACEMENT': 'SCAN THE LOCATION',
    'QTE PRELEVEE ? [ENT]={q}  [F4] ECART': 'PICKED QTY? [ENT]={q}  [F4] SHORT',
    'MAUVAIS EMPLACEMENT': 'WRONG LOCATION',
    'QTE INVALIDE (MAX {m})': 'INVALID QTY (MAX {m})',
    'ECART DECLARE : -{n}': 'SHORTAGE DECLARED: -{n}',
    'A COMPTER': 'TO COUNT',
    '*** COMPTAGE TERMINE ***': '*** COUNT COMPLETE ***',
    'EMPLACEMENT : {e}': 'LOCATION : {e}',
    'LIGNES      : {n}': 'LINES    : {n}',
    'ECARTS      : {n}': 'DIFFS    : {n}',
    '[ENT] VALIDER  [ESC] ABANDON': '[ENT] CONFIRM  [ESC] ABORT',
    'LIGNE {i}/{n}': 'LINE {i}/{n}',
    'QTE COMPTEE ?': 'COUNTED QTY?',
    '(COMPTAGE EN AVEUGLE :': '(BLIND COUNT:',
    'LE THEORIQUE N\'EST PAS AFFICHE)': 'EXPECTED QTY IS HIDDEN)',
    'EMPLACEMENT VIDE (THEORIQUE)': 'LOCATION EMPTY (EXPECTED)',
    'SAISIE OBLIGATOIRE': 'INPUT REQUIRED',
    'INVENTAIRE VALIDE': 'COUNT CONFIRMED',
    'DEPLACEMENT SUPPORT': 'MOVE HANDLING UNIT',
    'SCANNEZ LE SSCC DU SUPPORT': 'SCAN THE UNIT SSCC',
    'DEPUIS  : {e}': 'FROM    : {e}',
    'SCANNEZ LA DESTINATION': 'SCAN THE DESTINATION',
    'SUPPORT DEPLACE': 'UNIT MOVED',
    'CONSULTATION': 'INQUIRY',
    'SCANNEZ UN EMPLACEMENT': 'SCAN A LOCATION',
    'OU UN CODE ARTICLE': 'OR AN ITEM CODE',
    '... +{n} LIGNES': '... +{n} LINES',
    '[ENT] NOUVELLE RECHERCHE': '[ENT] NEW SEARCH',
    'AUCUN STOCK TROUVE': 'NO STOCK FOUND',
    'AUCUNE MISSION {t}': 'NO {t} TASK',
    '[ENT] ACTUALISER': '[ENT] REFRESH',
    '(PALETTE ENTIERE)': '(FULL PALLET)',
    'PRENDRE : {e}': 'PICK AT : {e}',
    'RANGER  : {e}': 'PUT TO  : {e}',
    '(LIBRE CHOIX)': '(FREE CHOICE)',
    'SCANNEZ DESTINATION [ENT]={d}': 'SCAN DESTINATION [ENT]={d}',
    'QTE DEPOSEE ? [ENT]={q}': 'QTY PLACED? [ENT]={q}',
    'EMPLACEMENT OBLIGATOIRE': 'LOCATION REQUIRED',
    'MISSION {id} VALIDEE': 'TASK {id} CONFIRMED',
    'QTE': 'QTY', 'LOT': 'BATCH',
    'Retour': 'Back', 'Écart': 'Short',
    'LM-WMS — Terminal RF': 'LM-WMS — RF Terminal',
  },

  /* ---------------------------------------------------------- */
  es: {
    /* --- Général / connexion --- */
    'LM-WMS — Superviseur': 'LM-WMS — Supervisor',
    'Pilotage d\'entrepôt': 'Pilotaje de almacén',
    'Connexion à LM-WMS': 'Conexión a LM-WMS',
    'Code utilisateur': 'Código de usuario',
    'Mot de passe': 'Contraseña',
    'Se connecter': 'Iniciar sesión',
    'quitter': 'salir',
    'Erreur : {message}': 'Error: {message}',
    'Connexion requise': 'Conexión requerida',
    'Erreur serveur': 'Error del servidor',
    'Identifiants invalides': 'Credenciales inválidas',

    /* --- Menu --- */
    'Pilotage': 'Pilotaje',
    'Tableau de bord': 'Panel de control',
    'Missions': 'Tareas',
    'Mouvements': 'Movimientos',
    'Connexion opérateur (RF)': 'Conexión operario (RF)',
    'Flux entrant': 'Flujo de entrada',
    'Attendus / Réceptions': 'Avisos / Recepciones',
    'Stock': 'Stock',
    'Supports / Palettes': 'Soportes / Palets',
    'Inventaires': 'Inventarios',
    'Flux sortant': 'Flujo de salida',
    'Commandes': 'Pedidos',
    'Vagues': 'Olas',
    'Colisage / Expéditions': 'Embalaje / Expediciones',
    'Référentiels': 'Datos maestros',
    'Articles': 'Artículos',
    'Emplacements': 'Ubicaciones',
    'Tiers / Transporteurs': 'Terceros / Transportistas',
    'Intégration': 'Integración',
    'Utilisateurs': 'Usuarios',
    'Terminal opérateur :': 'Terminal de operario:',
    'écran RF': 'pantalla RF',
    'Suite LM :': 'Suite LM:',

    /* --- Statuts (badges) --- */
    'ATTENTE': 'EN ESPERA', 'ALLOUEE': 'ASIGNADA', 'EN_PREPARATION': 'EN PREPARACIÓN',
    'PREPAREE': 'PREPARADA', 'EMBALLEE': 'EMBALADA', 'EXPEDIEE': 'EXPEDIDA',
    'PREVU': 'PREVISTO', 'EN_COURS': 'EN CURSO', 'CLOTURE': 'CERRADO',
    'CREEE': 'CREADA', 'LANCEE': 'LANZADA', 'TERMINEE': 'TERMINADA',
    'EN_ATTENTE': 'PENDIENTE', 'OUVERT': 'ABIERTO', 'FERME': 'CERRADO', 'EXPEDIE': 'EXPEDIDO',
    'DISPO': 'DISPONIBLE', 'BLOQUE': 'BLOQUEADO', 'VALIDE': 'VALIDADO',
    'RANGEMENT': 'UBICACIÓN', 'PICKING': 'PICKING', 'REAPPRO': 'REPOSICIÓN',
    'RUPTURE': 'ROTURA', 'INACTIF': 'INACTIVO', 'ACTIF': 'ACTIVO', 'VIDE': 'VACÍO',
    'ENTRANT': 'ENTRANTE', 'SORTANT': 'SALIENTE', 'PARTIEL': 'PARCIAL', 'ERREUR': 'ERROR',
    'CLIENT': 'CLIENTE', 'FOURNISSEUR': 'PROVEEDOR',
    'OPERATEUR': 'OPERARIO', 'SUPERVISEUR': 'SUPERVISOR', 'ADMIN': 'ADMIN',
    'RECEPTION': 'RECEPCIÓN', 'AJUSTEMENT': 'AJUSTE', 'INVENTAIRE': 'INVENTARIO',
    'EXPEDITION': 'EXPEDICIÓN', 'BLOCAGE': 'BLOQUEO',

    /* --- Libellés communs --- */
    'Type': 'Tipo', 'Article': 'Artículo', 'Qté': 'Cant.', 'De': 'De', 'Vers': 'A',
    'Référence': 'Referencia', 'Statut': 'Estado', 'Date': 'Fecha', 'Lot': 'Lote',
    'DLC': 'Caducidad', 'Zone': 'Zona', 'Emplacement': 'Ubicación', 'Opérateur': 'Operario',
    'Réservé': 'Reservado', 'N°': 'N.º', 'Client': 'Cliente', 'Fournisseur': 'Proveedor',
    'Nom': 'Nombre', 'Ville': 'Ciudad', 'Code': 'Código', 'Adresse': 'Dirección',
    'Prio': 'Prio', 'Livraison': 'Entrega', 'Lignes': 'Líneas', 'Détail': 'Detalle',
    'Fermer': 'Cerrar', 'Annuler': 'Cancelar', 'Créer': 'Crear', 'Valider': 'Validar',
    'Modifier': 'Modificar', 'Enregistrer': 'Guardar', 'Ajouter': 'Añadir', 'Oui': 'Sí',
    'Rafraîchir': 'Actualizar',

    /* --- Tableau de bord --- */
    'Détecter les réappros picking': 'Detectar reposiciones de picking',
    'Commandes au portefeuille': 'Pedidos en cartera',
    'En attente de vague': 'En espera de ola',
    'En préparation': 'En preparación',
    'Prêtes à expédier': 'Listos para expedir',
    'Expédiées': 'Expedidos',
    'Commandes en rupture': 'Pedidos con rotura',
    'Attendus à réceptionner': 'Avisos por recibir',
    'Vagues en cours': 'Olas en curso',
    'Mouvements sur 24 h': 'Movimientos en 24 h',
    'Références en stock': 'Referencias en stock',
    'Occupation de l\'entrepôt': 'Ocupación del almacén',
    'Alertes': 'Alertas',
    'Aucune alerte.': 'Sin alertas.',
    'Commande {numero} ({client}) en retard — livraison prévue le {date}':
      'Pedido {numero} ({client}) con retraso — entrega prevista el {date}',
    'Rupture de stock sur la commande {numero}': 'Rotura de stock en el pedido {numero}',
    'Missions en attente ({n})': 'Tareas pendientes ({n})',
    'Aucune mission en attente.': 'Sin tareas pendientes.',
    '… et {n} autres (voir Missions).': '… y {n} más (ver Tareas).',
    '{n} mission(s) de réappro générée(s)': '{n} tarea(s) de reposición generada(s)',
    'Aucun mini picking en défaut': 'Ningún mínimo de picking en falta',

    /* --- Attendus / réceptions --- */
    'Attendus de réception': 'Avisos de recepción',
    'Nouvel attendu': 'Nuevo aviso',
    'Date prévue': 'Fecha prevista',
    'Reçu / prévu': 'Recibido / previsto',
    'Aucun attendu.': 'Sin avisos.',
    'Réceptionner': 'Recepcionar',
    'Nouvel attendu de réception': 'Nuevo aviso de recepción',
    '+ Ajouter une ligne': '+ Añadir una línea',
    'Créer l\'attendu': 'Crear el aviso',
    'Attendu créé': 'Aviso creado',
    'Qté prévue': 'Cant. prevista',
    'La réception crée le stock sur le quai et génère automatiquement une mission de rangement avec l\'adressage proposé.':
      'La recepción crea el stock en el muelle y genera automáticamente una tarea de ubicación con la dirección propuesta.',
    'Prévu': 'Previsto', 'Reçu': 'Recibido', 'Réception': 'Recepción',
    'N° lot': 'N.º lote', 'palette SSCC': 'palet SSCC',
    'Reçu — mission de rangement vers {dest}': 'Recibido — tarea de ubicación hacia {dest}',
    '(à adresser)': '(por asignar)',
    '(support {sscc})': '(soporte {sscc})',

    /* --- Stock --- */
    'Stock à l\'emplacement': 'Stock por ubicación',
    'Filtrer par article…': 'Filtrar por artículo…',
    'Filtrer par emplacement…': 'Filtrar por ubicación…',
    'Toutes zones': 'Todas las zonas',
    'Aucune ligne de stock.': 'Sin líneas de stock.',
    'Ajuster': 'Ajustar', 'Bloquer': 'Bloquear', 'Débloquer': 'Desbloquear',
    'Ajustement — {article} sur {emplacement}': 'Ajuste — {article} en {emplacement}',
    'Nouvelle quantité (actuelle : {qte})': 'Nueva cantidad (actual: {qte})',
    'Motif': 'Motivo',
    'Casse, erreur de comptage…': 'Rotura, error de conteo…',
    'Stock ajusté': 'Stock ajustado',
    'Ligne débloquée': 'Línea desbloqueada',
    'Ligne bloquée (qualité)': 'Línea bloqueada (calidad)',

    /* --- Commandes --- */
    'Commandes clients': 'Pedidos de clientes',
    'Créer une vague avec la sélection': 'Crear una ola con la selección',
    'Nouvelle commande': 'Nuevo pedido',
    'Aucune commande.': 'Sin pedidos.',
    'Vague {numero} créée — lancez-la depuis l\'écran Vagues':
      'Ola {numero} creada — lánzala desde la pantalla Olas',
    'Priorité {p} · livraison {d} · transporteur {t}': 'Prioridad {p} · entrega {d} · transportista {t}',
    'non planifiée': 'no planificada',
    'Cdée': 'Pedida', 'Allouée': 'Asignada', 'Préparée': 'Preparada', 'Emballée': 'Embalada',
    'Nouvelle commande client': 'Nuevo pedido de cliente',
    'Priorité (1-9)': 'Prioridad (1-9)',
    'Date de livraison': 'Fecha de entrega',
    'Transporteur': 'Transportista',
    'Quantité': 'Cantidad',
    'Créer la commande': 'Crear el pedido',
    'Commande créée': 'Pedido creado',

    /* --- Vagues --- */
    'Vagues de préparation': 'Olas de preparación',
    'Créer une vague depuis l\'écran Commandes': 'Crear una ola desde la pantalla Pedidos',
    'Créée le': 'Creada el',
    'Avancement': 'Avance',
    'Aucune vague.': 'Sin olas.',
    'Lancer': 'Lanzar',
    'Vague lancée avec {n} rupture(s) : ': 'Ola lanzada con {n} rotura(s): ',
    'Vague lancée — missions de picking générées': 'Ola lanzada — tareas de picking generadas',
    'Ordre': 'Orden', 'Commande': 'Pedido',
    'Vague non lancée : missions générées au lancement.': 'Ola no lanzada: las tareas se generan al lanzarla.',

    /* --- Missions --- */
    'Tous types': 'Todos los tipos',
    'Tous statuts': 'Todos los estados',
    'Aucune mission.': 'Sin tareas.',
    'Valider la mission {id} ({type})': 'Validar la tarea {id} ({type})',
    '{article} — {qte} u. de {source} vers {dest}': '{article} — {qte} u. de {source} a {dest}',
    'Quantité réelle': 'Cantidad real',
    'Emplacement destination': 'Ubicación de destino',
    'Code emplacement': 'Código de ubicación',
    'Mission validée': 'Tarea validada',

    /* --- Colisage / expéditions --- */
    'Colisage & expéditions': 'Embalaje y expediciones',
    'Nouveau colis': 'Nuevo bulto',
    'Nouveau chargement': 'Nueva carga',
    'Colis (SSCC)': 'Bultos (SSCC)',
    'Unités': 'Unidades',
    'Remplir': 'Llenar', 'Étiquette': 'Etiqueta',
    'Chargements transporteur': 'Cargas de transportista',
    'Ajouter colis': 'Añadir bulto', 'Départ': 'Salida',
    'Aucun colis. Les commandes doivent être PREPAREE.': 'Sin bultos. Los pedidos deben estar PREPARADOS.',
    'Aucun chargement.': 'Sin cargas.',
    'Commande préparée': 'Pedido preparado',
    'Générer le SSCC': 'Generar el SSCC',
    'Colis créé — SSCC {sscc}': 'Bulto creado — SSCC {sscc}',
    'Remplir le colis {sscc}': 'Llenar el bulto {sscc}',
    'Tout est déjà emballé pour cette commande.': 'Todo está ya embalado para este pedido.',
    'À emballer': 'Por embalar',
    'Ajouter au colis': 'Añadir al bulto',
    'Colis mis à jour': 'Bulto actualizado',
    'Colis fermé': 'Bulto cerrado',
    'Étiquette {sscc}': 'Etiqueta {sscc}',
    'LM-WMS — Étiquette logistique': 'LM-WMS — Etiqueta logística',
    'Destinataire': 'Destinatario',
    'Chargement créé': 'Carga creada',
    'Ajouter un colis au chargement': 'Añadir un bulto a la carga',
    'Aucun colis fermé disponible.': 'No hay bultos cerrados disponibles.',
    'Colis chargé': 'Bulto cargado',
    'Chargement parti — commandes expédiées': 'Carga salida — pedidos expedidos',

    /* --- Inventaires --- */
    'Nouvel inventaire d\'emplacement': 'Nuevo inventario de ubicación',
    'Écarts': 'Diferencias',
    'Compter / valider': 'Contar / validar',
    'Aucun inventaire.': 'Sin inventarios.',
    'Nouvel inventaire': 'Nuevo inventario',
    'Emplacement à compter': 'Ubicación a contar',
    'Inventaire créé': 'Inventario creado',
    '{numero} — comptage {emplacement}': '{numero} — conteo {emplacement}',
    'Emplacement théoriquement vide : ajoutez ce que vous trouvez.':
      'Ubicación teóricamente vacía: añada lo que encuentre.',
    'Théorique': 'Teórico', 'Compté': 'Contado',
    'Compter et valider les écarts': 'Contar y validar las diferencias',
    'Inventaire validé, stock ajusté': 'Inventario validado, stock ajustado',

    /* --- Mouvements --- */
    'Journal des mouvements': 'Diario de movimientos',
    'Aucun mouvement.': 'Sin movimientos.',

    /* --- Articles --- */
    'Nouvel article': 'Nuevo artículo',
    'Désignation': 'Descripción',
    'Rotation': 'Rotación', 'Mini': 'Mín.',
    'Aucun article.': 'Sin artículos.',
    'Emplacement picking dédié': 'Ubicación de picking dedicada',
    '— aucun —': '— ninguna —',
    'Mini picking': 'Mínimo picking',
    'Poids unit. (kg)': 'Peso unit. (kg)',
    'Géré au lot': 'Gestionado por lote',
    'Géré en DLC (FEFO)': 'Gestionado por caducidad (FEFO)',
    'Article créé': 'Artículo creado',
    'Modifier {code}': 'Modificar {code}',
    'Article modifié': 'Artículo modificado',

    /* --- Emplacements --- */
    'Nouvel emplacement': 'Nueva ubicación',
    'Allée': 'Pasillo', 'Occupation': 'Ocupación', 'État': 'Estado',
    'Aucun emplacement.': 'Sin ubicaciones.',
    'Emplacement débloqué': 'Ubicación desbloqueada',
    'Emplacement bloqué': 'Ubicación bloqueada',
    'Code (ex: R1-04-1)': 'Código (ej.: R1-04-1)',
    'Capacité (unités)': 'Capacidad (unidades)',
    'Emplacement créé': 'Ubicación creada',

    /* --- Tiers --- */
    'Tiers & transporteurs': 'Terceros y transportistas',
    'Nouveau transporteur': 'Nuevo transportista',
    'Nouveau tiers': 'Nuevo tercero',
    'Fournisseurs & clients': 'Proveedores y clientes',
    'Aucun tiers.': 'Sin terceros.',
    'Transporteurs': 'Transportistas',
    'Aucun transporteur.': 'Sin transportistas.',
    'Tiers créé': 'Tercero creado',
    'Transporteur créé': 'Transportista creado',

    /* --- Supports --- */
    'Supports / palettes (SSCC)': 'Soportes / palets (SSCC)',
    'Filtrer par SSCC…': 'Filtrar por SSCC…',
    'Contenu': 'Contenido', 'vide': 'vacío',
    'Aucun support.': 'Sin soportes.',
    'Déplacer': 'Mover',
    'Déplacer le support {sscc}': 'Mover el soporte {sscc}',
    'Actuellement sur {emplacement}. Tout le contenu suit le support.':
      'Actualmente en {emplacement}. Todo el contenido sigue al soporte.',
    'Support déplacé': 'Soporte movido',

    /* --- EDI --- */
    'Interfaces EDI': 'Interfaces EDI',
    'Exporter le stock (INVRPT)': 'Exportar el stock (INVRPT)',
    'Scanner le répertoire entrant': 'Escanear la carpeta de entrada',
    'Fonctionnement': 'Funcionamiento',
    'Déposez des fichiers <b>commandes_*.csv</b> ou <b>attendus_*.csv</b> dans <span class="mono">lm-wms/edi/entrant/</span> (modèles dans <span class="mono">edi/exemples/</span>) : ils sont intégrés automatiquement toutes les 5 secondes puis archivés. Les <b>DESADV</b> (avis d\'expédition) et <b>RECADV</b> (confirmations de réception) sont produits dans <span class="mono">edi/sortant/</span>.':
      'Deposite archivos <b>commandes_*.csv</b> o <b>attendus_*.csv</b> en <span class="mono">lm-wms/edi/entrant/</span> (modelos en <span class="mono">edi/exemples/</span>): se integran automáticamente cada 5 segundos y luego se archivan. Los <b>DESADV</b> (aviso de expedición) y <b>RECADV</b> (confirmaciones de recepción) se generan en <span class="mono">edi/sortant/</span>.',
    'Sens': 'Sentido', 'Fichier': 'Archivo', 'Message': 'Mensaje',
    'Aucun échange pour le moment.': 'Sin intercambios por el momento.',
    'Aucun fichier dans edi/entrant': 'Ningún archivo en edi/entrant',
    'Stock exporté : edi/sortant/{fichier}': 'Stock exportado: edi/sortant/{fichier}',

    /* --- Utilisateurs --- */
    'Utilisateurs & rôles': 'Usuarios y roles',
    'Nouvel utilisateur': 'Nuevo usuario',
    'Rôle': 'Rol',
    '(vide = inchangé)': '(vacío = sin cambios)',
    'Compte actif': 'Cuenta activa',
    'Utilisateur créé': 'Usuario creado',
    'Utilisateur modifié': 'Usuario modificado',

    /* --- Connexion opérateur (RF) --- */
    'Connexion opérateur — terminal RF': 'Conexión de operario — terminal RF',
    'Scannez pour appairer un téléphone': 'Escanee para emparejar un teléfono',
    'Génération du QR…': 'Generando el QR…',
    'Ouvrir le terminal RF': 'Abrir el terminal RF',
    'Mettre un nouveau terminal en service': 'Poner en servicio un nuevo terminal',
    'Sur le téléphone, ouvrez l\'appareil photo et <b>scannez le QR code</b> ci-contre.':
      'En el teléfono, abra la cámara y <b>escanee el código QR</b> de al lado.',
    'Le terminal RF s\'ouvre dans le navigateur.': 'El terminal RF se abre en el navegador.',
    'Menu du navigateur → <b>« Ajouter à l\'écran d\'accueil »</b> : une icône « LM-WMS RF » est créée, à taper chaque prise de poste (plus besoin de rescanner).':
      'Menú del navegador → <b>«Añadir a pantalla de inicio»</b>: se crea un icono «LM-WMS RF», que se toca en cada inicio de turno (sin volver a escanear).',
    'L\'opérateur se connecte avec <b>son code</b> puis <b>son PIN</b>.':
      'El operario se conecta con <b>su código</b> y luego <b>su PIN</b>.',
    'Le QR pointe vers l\'adresse que vous utilisez en ce moment.':
      'El QR apunta a la dirección que está usando ahora mismo.',
    'Vous êtes sur une adresse <b>locale</b> (localhost) : un téléphone ne pourra pas l\'ouvrir. Affichez cet écran depuis l\'adresse publique de la suite pour un vrai appairage.':
      'Está en una dirección <b>local</b> (localhost): un teléfono no podrá abrirla. Muestre esta pantalla desde la dirección pública de la suite para un emparejamiento real.',
    'Cette adresse est accessible depuis l\'extérieur : un téléphone la scannera sans problème.':
      'Esta dirección es accesible desde el exterior: un teléfono la escaneará sin problema.',
    'Codes opérateurs actifs': 'Códigos de operario activos',
    'Le mot de passe / PIN de chaque opérateur se gère dans l\'écran Utilisateurs.':
      'La contraseña / PIN de cada operario se gestiona en la pantalla Usuarios.',
    'QR indisponible : {message}': 'QR no disponible: {message}',

    /* --- Terminal RF (écran caractère) --- */
    'SESSION EXPIREE - RECONNECTEZ-VOUS': 'SESIÓN EXPIRADA - RECONÉCTESE',
    'ERREUR SERVEUR': 'ERROR DEL SERVIDOR',
    'IDENTIFICATION': 'IDENTIFICACIÓN',
    'CODE OPERATEUR ?': '¿CÓDIGO DE OPERARIO?',
    'OPERATEUR : {code}': 'OPERARIO: {code}',
    'CODE PIN ?': '¿CÓDIGO PIN?',
    '[ENT] VALIDER   [ESC] RETOUR': '[ENT] VALIDAR   [ESC] VOLVER',
    '1. RANGEMENT': '1. UBICACIÓN',
    '2. PICKING (VAGUES)': '2. PICKING (OLAS)',
    '3. REAPPRO PICKING': '3. REPOSICIÓN PICKING',
    '4. INVENTAIRE': '4. INVENTARIO',
    '5. CONSULTATION STOCK': '5. CONSULTA DE STOCK',
    '6. DEPLACEMENT SUPPORT': '6. MOVER SOPORTE',
    '9. FIN DE SESSION': '9. FIN DE SESIÓN',
    'CHOIX + [ENT]': 'OPCIÓN + [ENT]',
    'CHOIX INVALIDE': 'OPCIÓN INVÁLIDA',
    'PICKING - VAGUES': 'PICKING - OLAS',
    'AUCUNE VAGUE A PREPARER': 'NINGUNA OLA POR PREPARAR',
    '(LANCEZ UNE VAGUE DEPUIS LE': '(LANCE UNA OLA DESDE EL',
    'POSTE SUPERVISEUR)': 'PUESTO SUPERVISOR)',
    'VAGUES EN COURS :': 'OLAS EN CURSO:',
    'N° + [ENT]': 'N.º + [ENT]',
    '({n} MISSIONS)': '({n} TAREAS)',
    '*** VAGUE TERMINEE ***': '*** OLA TERMINADA ***',
    'MISSION {o}  (RESTE {n})': 'TAREA {o}  (QUEDAN {n})',
    'ALLEZ A : {e}': 'VAYA A : {e}',
    'ARTICLE : {a}': 'ARTICULO: {a}',
    'LOT     : {l}': 'LOTE    : {l}',
    'QTE     : {q}': 'CANT    : {q}',
    'CDE     : {c}': 'PEDIDO  : {c}',
    'SCANNEZ L\'EMPLACEMENT': 'ESCANEE LA UBICACIÓN',
    'QTE PRELEVEE ? [ENT]={q}  [F4] ECART': '¿CANT RECOGIDA? [ENT]={q}  [F4] DIF',
    'MAUVAIS EMPLACEMENT': 'UBICACIÓN INCORRECTA',
    'QTE INVALIDE (MAX {m})': 'CANT INVÁLIDA (MÁX {m})',
    'ECART DECLARE : -{n}': 'DIFERENCIA DECLARADA: -{n}',
    'A COMPTER': 'A CONTAR',
    '*** COMPTAGE TERMINE ***': '*** CONTEO TERMINADO ***',
    'EMPLACEMENT : {e}': 'UBICACIÓN : {e}',
    'LIGNES      : {n}': 'LÍNEAS    : {n}',
    'ECARTS      : {n}': 'DIFERENC. : {n}',
    '[ENT] VALIDER  [ESC] ABANDON': '[ENT] VALIDAR  [ESC] ABANDONAR',
    'LIGNE {i}/{n}': 'LÍNEA {i}/{n}',
    'QTE COMPTEE ?': '¿CANT CONTADA?',
    '(COMPTAGE EN AVEUGLE :': '(CONTEO A CIEGAS:',
    'LE THEORIQUE N\'EST PAS AFFICHE)': 'EL TEÓRICO NO SE MUESTRA)',
    'EMPLACEMENT VIDE (THEORIQUE)': 'UBICACIÓN VACÍA (TEÓRICO)',
    'SAISIE OBLIGATOIRE': 'ENTRADA OBLIGATORIA',
    'INVENTAIRE VALIDE': 'INVENTARIO VALIDADO',
    'DEPLACEMENT SUPPORT': 'MOVER SOPORTE',
    'SCANNEZ LE SSCC DU SUPPORT': 'ESCANEE EL SSCC DEL SOPORTE',
    'DEPUIS  : {e}': 'DESDE   : {e}',
    'SCANNEZ LA DESTINATION': 'ESCANEE EL DESTINO',
    'SUPPORT DEPLACE': 'SOPORTE MOVIDO',
    'CONSULTATION': 'CONSULTA',
    'SCANNEZ UN EMPLACEMENT': 'ESCANEE UNA UBICACIÓN',
    'OU UN CODE ARTICLE': 'O UN CÓDIGO DE ARTÍCULO',
    '... +{n} LIGNES': '... +{n} LÍNEAS',
    '[ENT] NOUVELLE RECHERCHE': '[ENT] NUEVA BÚSQUEDA',
    'AUCUN STOCK TROUVE': 'NO SE ENCONTRÓ STOCK',
    'AUCUNE MISSION {t}': 'SIN TAREAS DE {t}',
    '[ENT] ACTUALISER': '[ENT] ACTUALIZAR',
    '(PALETTE ENTIERE)': '(PALET COMPLETO)',
    'PRENDRE : {e}': 'TOMAR EN: {e}',
    'RANGER  : {e}': 'UBICAR  : {e}',
    '(LIBRE CHOIX)': '(LIBRE ELECCIÓN)',
    'SCANNEZ DESTINATION [ENT]={d}': 'ESCANEE DESTINO [ENT]={d}',
    'QTE DEPOSEE ? [ENT]={q}': '¿CANT DEPOSITADA? [ENT]={q}',
    'EMPLACEMENT OBLIGATOIRE': 'UBICACIÓN OBLIGATORIA',
    'MISSION {id} VALIDEE': 'TAREA {id} VALIDADA',
    'QTE': 'CANT', 'LOT': 'LOTE',
    'Retour': 'Volver', 'Écart': 'Dif.',
    'LM-WMS — Terminal RF': 'LM-WMS — Terminal RF',
  },

  /* ---------------------------------------------------------- */
  ar: {
    /* --- Général / connexion --- */
    'LM-WMS — Superviseur': 'LM-WMS — المشرف',
    'Pilotage d\'entrepôt': 'إدارة المستودع',
    'Connexion à LM-WMS': 'تسجيل الدخول إلى LM-WMS',
    'Code utilisateur': 'رمز المستخدم',
    'Mot de passe': 'كلمة المرور',
    'Se connecter': 'تسجيل الدخول',
    'quitter': 'خروج',
    'Erreur : {message}': 'خطأ: {message}',
    'Connexion requise': 'يلزم تسجيل الدخول',
    'Erreur serveur': 'خطأ في الخادم',
    'Identifiants invalides': 'بيانات الدخول غير صحيحة',

    /* --- Menu --- */
    'Pilotage': 'القيادة',
    'Tableau de bord': 'لوحة القيادة',
    'Missions': 'المهام',
    'Mouvements': 'الحركات',
    'Connexion opérateur (RF)': 'دخول العامل (RF)',
    'Flux entrant': 'التدفق الوارد',
    'Attendus / Réceptions': 'الإشعارات / الاستلامات',
    'Stock': 'المخزون',
    'Supports / Palettes': 'الحوامل / المنصات',
    'Inventaires': 'الجرد',
    'Flux sortant': 'التدفق الصادر',
    'Commandes': 'الطلبات',
    'Vagues': 'الموجات',
    'Colisage / Expéditions': 'التعبئة / الشحنات',
    'Référentiels': 'البيانات الأساسية',
    'Articles': 'الأصناف',
    'Emplacements': 'المواقع',
    'Tiers / Transporteurs': 'الأطراف / الناقلون',
    'Intégration': 'التكامل',
    'Utilisateurs': 'المستخدمون',
    'Terminal opérateur :': 'جهاز العامل:',
    'écran RF': 'شاشة RF',
    'Suite LM :': 'حزمة LM:',

    /* --- Statuts (badges) --- */
    'ATTENTE': 'قيد الانتظار', 'ALLOUEE': 'مخصص', 'EN_PREPARATION': 'قيد التحضير',
    'PREPAREE': 'محضر', 'EMBALLEE': 'معبأ', 'EXPEDIEE': 'مشحون',
    'PREVU': 'متوقع', 'EN_COURS': 'جارٍ', 'CLOTURE': 'مغلق',
    'CREEE': 'منشأة', 'LANCEE': 'مطلقة', 'TERMINEE': 'منتهية',
    'EN_ATTENTE': 'معلق', 'OUVERT': 'مفتوح', 'FERME': 'مغلق', 'EXPEDIE': 'مشحون',
    'DISPO': 'متاح', 'BLOQUE': 'محظور', 'VALIDE': 'مصادق',
    'RANGEMENT': 'تخزين', 'PICKING': 'تحضير', 'REAPPRO': 'تعبئة',
    'RUPTURE': 'نفاد', 'INACTIF': 'غير نشط', 'ACTIF': 'نشط', 'VIDE': 'فارغ',
    'ENTRANT': 'وارد', 'SORTANT': 'صادر', 'PARTIEL': 'جزئي', 'ERREUR': 'خطأ',
    'CLIENT': 'عميل', 'FOURNISSEUR': 'مورد',
    'OPERATEUR': 'عامل', 'SUPERVISEUR': 'مشرف', 'ADMIN': 'مدير',
    'RECEPTION': 'استلام', 'AJUSTEMENT': 'تسوية', 'INVENTAIRE': 'جرد',
    'EXPEDITION': 'شحن', 'BLOCAGE': 'حظر',

    /* --- Libellés communs --- */
    'Type': 'النوع', 'Article': 'الصنف', 'Qté': 'الكمية', 'De': 'من', 'Vers': 'إلى',
    'Référence': 'المرجع', 'Statut': 'الحالة', 'Date': 'التاريخ', 'Lot': 'الدفعة',
    'DLC': 'الصلاحية', 'Zone': 'المنطقة', 'Emplacement': 'الموقع', 'Opérateur': 'العامل',
    'Réservé': 'محجوز', 'N°': 'رقم', 'Client': 'العميل', 'Fournisseur': 'المورد',
    'Nom': 'الاسم', 'Ville': 'المدينة', 'Code': 'الرمز', 'Adresse': 'العنوان',
    'Prio': 'الأولوية', 'Livraison': 'التسليم', 'Lignes': 'الأسطر', 'Détail': 'تفاصيل',
    'Fermer': 'إغلاق', 'Annuler': 'إلغاء', 'Créer': 'إنشاء', 'Valider': 'تأكيد',
    'Modifier': 'تعديل', 'Enregistrer': 'حفظ', 'Ajouter': 'إضافة', 'Oui': 'نعم',
    'Rafraîchir': 'تحديث',

    /* --- Tableau de bord --- */
    'Détecter les réappros picking': 'كشف تعبئة مواقع التحضير',
    'Commandes au portefeuille': 'الطلبات في المحفظة',
    'En attente de vague': 'في انتظار موجة',
    'En préparation': 'قيد التحضير',
    'Prêtes à expédier': 'جاهزة للشحن',
    'Expédiées': 'مشحونة',
    'Commandes en rupture': 'طلبات بها نفاد',
    'Attendus à réceptionner': 'إشعارات بانتظار الاستلام',
    'Vagues en cours': 'موجات جارية',
    'Mouvements sur 24 h': 'حركات آخر 24 ساعة',
    'Références en stock': 'أصناف في المخزون',
    'Occupation de l\'entrepôt': 'إشغال المستودع',
    'Alertes': 'التنبيهات',
    'Aucune alerte.': 'لا توجد تنبيهات.',
    'Commande {numero} ({client}) en retard — livraison prévue le {date}':
      'الطلب {numero} ({client}) متأخر — التسليم المتوقع في {date}',
    'Rupture de stock sur la commande {numero}': 'نفاد مخزون في الطلب {numero}',
    'Missions en attente ({n})': 'مهام معلقة ({n})',
    'Aucune mission en attente.': 'لا توجد مهام معلقة.',
    '… et {n} autres (voir Missions).': '… و{n} أخرى (انظر المهام).',
    '{n} mission(s) de réappro générée(s)': 'تم إنشاء {n} مهمة تعبئة',
    'Aucun mini picking en défaut': 'لا يوجد حد أدنى ناقص في مواقع التحضير',

    /* --- Attendus / réceptions --- */
    'Attendus de réception': 'إشعارات الاستلام',
    'Nouvel attendu': 'إشعار جديد',
    'Date prévue': 'التاريخ المتوقع',
    'Reçu / prévu': 'المستلم / المتوقع',
    'Aucun attendu.': 'لا توجد إشعارات.',
    'Réceptionner': 'استلام',
    'Nouvel attendu de réception': 'إشعار استلام جديد',
    '+ Ajouter une ligne': '+ إضافة سطر',
    'Créer l\'attendu': 'إنشاء الإشعار',
    'Attendu créé': 'تم إنشاء الإشعار',
    'Qté prévue': 'الكمية المتوقعة',
    'La réception crée le stock sur le quai et génère automatiquement une mission de rangement avec l\'adressage proposé.':
      'الاستلام ينشئ المخزون على الرصيف ويولّد تلقائيًا مهمة تخزين مع الموقع المقترح.',
    'Prévu': 'متوقع', 'Reçu': 'مستلم', 'Réception': 'الاستلام',
    'N° lot': 'رقم الدفعة', 'palette SSCC': 'منصة SSCC',
    'Reçu — mission de rangement vers {dest}': 'تم الاستلام — مهمة تخزين نحو {dest}',
    '(à adresser)': '(بانتظار التوجيه)',
    '(support {sscc})': '(حامل {sscc})',

    /* --- Stock --- */
    'Stock à l\'emplacement': 'المخزون حسب الموقع',
    'Filtrer par article…': 'تصفية حسب الصنف…',
    'Filtrer par emplacement…': 'تصفية حسب الموقع…',
    'Toutes zones': 'كل المناطق',
    'Aucune ligne de stock.': 'لا توجد أسطر مخزون.',
    'Ajuster': 'تسوية', 'Bloquer': 'حظر', 'Débloquer': 'رفع الحظر',
    'Ajustement — {article} sur {emplacement}': 'تسوية — {article} في {emplacement}',
    'Nouvelle quantité (actuelle : {qte})': 'الكمية الجديدة (الحالية: {qte})',
    'Motif': 'السبب',
    'Casse, erreur de comptage…': 'تلف، خطأ في العد…',
    'Stock ajusté': 'تمت تسوية المخزون',
    'Ligne débloquée': 'تم رفع الحظر عن السطر',
    'Ligne bloquée (qualité)': 'تم حظر السطر (جودة)',

    /* --- Commandes --- */
    'Commandes clients': 'طلبات العملاء',
    'Créer une vague avec la sélection': 'إنشاء موجة من المحدد',
    'Nouvelle commande': 'طلب جديد',
    'Aucune commande.': 'لا توجد طلبات.',
    'Vague {numero} créée — lancez-la depuis l\'écran Vagues':
      'تم إنشاء الموجة {numero} — أطلقها من شاشة الموجات',
    'Priorité {p} · livraison {d} · transporteur {t}': 'الأولوية {p} · التسليم {d} · الناقل {t}',
    'non planifiée': 'غير مجدول',
    'Cdée': 'مطلوبة', 'Allouée': 'مخصصة', 'Préparée': 'محضرة', 'Emballée': 'معبأة',
    'Nouvelle commande client': 'طلب عميل جديد',
    'Priorité (1-9)': 'الأولوية (1-9)',
    'Date de livraison': 'تاريخ التسليم',
    'Transporteur': 'الناقل',
    'Quantité': 'الكمية',
    'Créer la commande': 'إنشاء الطلب',
    'Commande créée': 'تم إنشاء الطلب',

    /* --- Vagues --- */
    'Vagues de préparation': 'موجات التحضير',
    'Créer une vague depuis l\'écran Commandes': 'إنشاء موجة من شاشة الطلبات',
    'Créée le': 'أنشئت في',
    'Avancement': 'التقدم',
    'Aucune vague.': 'لا توجد موجات.',
    'Lancer': 'إطلاق',
    'Vague lancée avec {n} rupture(s) : ': 'أطلقت الموجة مع {n} نفاد: ',
    'Vague lancée — missions de picking générées': 'أطلقت الموجة — تم إنشاء مهام التحضير',
    'Ordre': 'الترتيب', 'Commande': 'الطلب',
    'Vague non lancée : missions générées au lancement.': 'الموجة لم تُطلق: تُنشأ المهام عند الإطلاق.',

    /* --- Missions --- */
    'Tous types': 'كل الأنواع',
    'Tous statuts': 'كل الحالات',
    'Aucune mission.': 'لا توجد مهام.',
    'Valider la mission {id} ({type})': 'تأكيد المهمة {id} ({type})',
    '{article} — {qte} u. de {source} vers {dest}': '{article} — {qte} وحدة من {source} إلى {dest}',
    'Quantité réelle': 'الكمية الفعلية',
    'Emplacement destination': 'موقع الوجهة',
    'Code emplacement': 'رمز الموقع',
    'Mission validée': 'تم تأكيد المهمة',

    /* --- Colisage / expéditions --- */
    'Colisage & expéditions': 'التعبئة والشحنات',
    'Nouveau colis': 'طرد جديد',
    'Nouveau chargement': 'حمولة جديدة',
    'Colis (SSCC)': 'الطرود (SSCC)',
    'Unités': 'الوحدات',
    'Remplir': 'ملء', 'Étiquette': 'ملصق',
    'Chargements transporteur': 'حمولات الناقل',
    'Ajouter colis': 'إضافة طرد', 'Départ': 'انطلاق',
    'Aucun colis. Les commandes doivent être PREPAREE.': 'لا توجد طرود. يجب أن تكون الطلبات محضرة.',
    'Aucun chargement.': 'لا توجد حمولات.',
    'Commande préparée': 'طلب محضر',
    'Générer le SSCC': 'توليد SSCC',
    'Colis créé — SSCC {sscc}': 'تم إنشاء الطرد — SSCC {sscc}',
    'Remplir le colis {sscc}': 'ملء الطرد {sscc}',
    'Tout est déjà emballé pour cette commande.': 'كل شيء معبأ بالفعل لهذا الطلب.',
    'À emballer': 'للتعبئة',
    'Ajouter au colis': 'إضافة إلى الطرد',
    'Colis mis à jour': 'تم تحديث الطرد',
    'Colis fermé': 'تم إغلاق الطرد',
    'Étiquette {sscc}': 'ملصق {sscc}',
    'LM-WMS — Étiquette logistique': 'LM-WMS — ملصق لوجستي',
    'Destinataire': 'المرسل إليه',
    'Chargement créé': 'تم إنشاء الحمولة',
    'Ajouter un colis au chargement': 'إضافة طرد إلى الحمولة',
    'Aucun colis fermé disponible.': 'لا توجد طرود مغلقة متاحة.',
    'Colis chargé': 'تم تحميل الطرد',
    'Chargement parti — commandes expédiées': 'انطلقت الحمولة — شُحنت الطلبات',

    /* --- Inventaires --- */
    'Nouvel inventaire d\'emplacement': 'جرد موقع جديد',
    'Écarts': 'الفروقات',
    'Compter / valider': 'عد / تأكيد',
    'Aucun inventaire.': 'لا يوجد جرد.',
    'Nouvel inventaire': 'جرد جديد',
    'Emplacement à compter': 'الموقع المراد عده',
    'Inventaire créé': 'تم إنشاء الجرد',
    '{numero} — comptage {emplacement}': '{numero} — عد {emplacement}',
    'Emplacement théoriquement vide : ajoutez ce que vous trouvez.':
      'الموقع فارغ نظريًا: أضف ما تجده.',
    'Théorique': 'النظري', 'Compté': 'المعدود',
    'Compter et valider les écarts': 'عد وتأكيد الفروقات',
    'Inventaire validé, stock ajusté': 'تم تأكيد الجرد وتسوية المخزون',

    /* --- Mouvements --- */
    'Journal des mouvements': 'سجل الحركات',
    'Aucun mouvement.': 'لا توجد حركات.',

    /* --- Articles --- */
    'Nouvel article': 'صنف جديد',
    'Désignation': 'الوصف',
    'Rotation': 'الدوران', 'Mini': 'الحد الأدنى',
    'Aucun article.': 'لا توجد أصناف.',
    'Emplacement picking dédié': 'موقع تحضير مخصص',
    '— aucun —': '— لا شيء —',
    'Mini picking': 'حد أدنى للتحضير',
    'Poids unit. (kg)': 'الوزن للوحدة (كغ)',
    'Géré au lot': 'مُدار بالدفعة',
    'Géré en DLC (FEFO)': 'مُدار بالصلاحية (FEFO)',
    'Article créé': 'تم إنشاء الصنف',
    'Modifier {code}': 'تعديل {code}',
    'Article modifié': 'تم تعديل الصنف',

    /* --- Emplacements --- */
    'Nouvel emplacement': 'موقع جديد',
    'Allée': 'الممر', 'Occupation': 'الإشغال', 'État': 'الحالة',
    'Aucun emplacement.': 'لا توجد مواقع.',
    'Emplacement débloqué': 'تم رفع الحظر عن الموقع',
    'Emplacement bloqué': 'تم حظر الموقع',
    'Code (ex: R1-04-1)': 'الرمز (مثال: R1-04-1)',
    'Capacité (unités)': 'السعة (وحدات)',
    'Emplacement créé': 'تم إنشاء الموقع',

    /* --- Tiers --- */
    'Tiers & transporteurs': 'الأطراف والناقلون',
    'Nouveau transporteur': 'ناقل جديد',
    'Nouveau tiers': 'طرف جديد',
    'Fournisseurs & clients': 'الموردون والعملاء',
    'Aucun tiers.': 'لا توجد أطراف.',
    'Transporteurs': 'الناقلون',
    'Aucun transporteur.': 'لا يوجد ناقلون.',
    'Tiers créé': 'تم إنشاء الطرف',
    'Transporteur créé': 'تم إنشاء الناقل',

    /* --- Supports --- */
    'Supports / palettes (SSCC)': 'الحوامل / المنصات (SSCC)',
    'Filtrer par SSCC…': 'تصفية حسب SSCC…',
    'Contenu': 'المحتوى', 'vide': 'فارغ',
    'Aucun support.': 'لا توجد حوامل.',
    'Déplacer': 'نقل',
    'Déplacer le support {sscc}': 'نقل الحامل {sscc}',
    'Actuellement sur {emplacement}. Tout le contenu suit le support.':
      'حاليًا في {emplacement}. كل المحتوى يتبع الحامل.',
    'Support déplacé': 'تم نقل الحامل',

    /* --- EDI --- */
    'Interfaces EDI': 'واجهات EDI',
    'Exporter le stock (INVRPT)': 'تصدير المخزون (INVRPT)',
    'Scanner le répertoire entrant': 'فحص مجلد الوارد',
    'Fonctionnement': 'طريقة العمل',
    'Déposez des fichiers <b>commandes_*.csv</b> ou <b>attendus_*.csv</b> dans <span class="mono">lm-wms/edi/entrant/</span> (modèles dans <span class="mono">edi/exemples/</span>) : ils sont intégrés automatiquement toutes les 5 secondes puis archivés. Les <b>DESADV</b> (avis d\'expédition) et <b>RECADV</b> (confirmations de réception) sont produits dans <span class="mono">edi/sortant/</span>.':
      'ضع ملفات <b>commandes_*.csv</b> أو <b>attendus_*.csv</b> في <span class="mono">lm-wms/edi/entrant/</span> (نماذج في <span class="mono">edi/exemples/</span>): تُدمج تلقائيًا كل 5 ثوانٍ ثم تُؤرشف. ملفات <b>DESADV</b> (إشعار الشحن) و<b>RECADV</b> (تأكيدات الاستلام) تُنتج في <span class="mono">edi/sortant/</span>.',
    'Sens': 'الاتجاه', 'Fichier': 'الملف', 'Message': 'الرسالة',
    'Aucun échange pour le moment.': 'لا توجد تبادلات حتى الآن.',
    'Aucun fichier dans edi/entrant': 'لا توجد ملفات في edi/entrant',
    'Stock exporté : edi/sortant/{fichier}': 'تم تصدير المخزون: edi/sortant/{fichier}',

    /* --- Utilisateurs --- */
    'Utilisateurs & rôles': 'المستخدمون والأدوار',
    'Nouvel utilisateur': 'مستخدم جديد',
    'Rôle': 'الدور',
    '(vide = inchangé)': '(فارغ = بدون تغيير)',
    'Compte actif': 'حساب نشط',
    'Utilisateur créé': 'تم إنشاء المستخدم',
    'Utilisateur modifié': 'تم تعديل المستخدم',

    /* --- Connexion opérateur (RF) --- */
    'Connexion opérateur — terminal RF': 'دخول العامل — جهاز RF',
    'Scannez pour appairer un téléphone': 'امسح لإقران هاتف',
    'Génération du QR…': 'جارٍ توليد رمز QR…',
    'Ouvrir le terminal RF': 'فتح جهاز RF',
    'Mettre un nouveau terminal en service': 'تشغيل جهاز جديد',
    'Sur le téléphone, ouvrez l\'appareil photo et <b>scannez le QR code</b> ci-contre.':
      'على الهاتف، افتح الكاميرا و<b>امسح رمز QR</b> المقابل.',
    'Le terminal RF s\'ouvre dans le navigateur.': 'يفتح جهاز RF في المتصفح.',
    'Menu du navigateur → <b>« Ajouter à l\'écran d\'accueil »</b> : une icône « LM-WMS RF » est créée, à taper chaque prise de poste (plus besoin de rescanner).':
      'قائمة المتصفح ← <b>«إضافة إلى الشاشة الرئيسية»</b>: تُنشأ أيقونة «LM-WMS RF» تُفتح في بداية كل وردية (دون مسح جديد).',
    'L\'opérateur se connecte avec <b>son code</b> puis <b>son PIN</b>.':
      'يسجل العامل دخوله بـ<b>رمزه</b> ثم <b>رمز PIN</b> الخاص به.',
    'Le QR pointe vers l\'adresse que vous utilisez en ce moment.':
      'رمز QR يشير إلى العنوان الذي تستخدمه الآن.',
    'Vous êtes sur une adresse <b>locale</b> (localhost) : un téléphone ne pourra pas l\'ouvrir. Affichez cet écran depuis l\'adresse publique de la suite pour un vrai appairage.':
      'أنت على عنوان <b>محلي</b> (localhost): لن يستطيع الهاتف فتحه. اعرض هذه الشاشة من العنوان العام للحزمة لإقران حقيقي.',
    'Cette adresse est accessible depuis l\'extérieur : un téléphone la scannera sans problème.':
      'هذا العنوان متاح من الخارج: سيمسحه الهاتف دون مشكلة.',
    'Codes opérateurs actifs': 'رموز العمال النشطين',
    'Le mot de passe / PIN de chaque opérateur se gère dans l\'écran Utilisateurs.':
      'كلمة مرور / PIN كل عامل تُدار في شاشة المستخدمين.',
    'QR indisponible : {message}': 'رمز QR غير متاح: {message}',

    /* --- Terminal RF (écran caractère) --- */
    'SESSION EXPIREE - RECONNECTEZ-VOUS': 'انتهت الجلسة - أعد الدخول',
    'ERREUR SERVEUR': 'خطأ في الخادم',
    'IDENTIFICATION': 'تسجيل الدخول',
    'CODE OPERATEUR ?': 'رمز العامل؟',
    'OPERATEUR : {code}': 'العامل: {code}',
    'CODE PIN ?': 'رمز PIN؟',
    '[ENT] VALIDER   [ESC] RETOUR': '[ENT] تأكيد   [ESC] رجوع',
    '1. RANGEMENT': '1. تخزين',
    '2. PICKING (VAGUES)': '2. تحضير (موجات)',
    '3. REAPPRO PICKING': '3. تعبئة التحضير',
    '4. INVENTAIRE': '4. جرد',
    '5. CONSULTATION STOCK': '5. استعلام المخزون',
    '6. DEPLACEMENT SUPPORT': '6. نقل حامل',
    '9. FIN DE SESSION': '9. إنهاء الجلسة',
    'CHOIX + [ENT]': 'الاختيار + [ENT]',
    'CHOIX INVALIDE': 'اختيار غير صالح',
    'PICKING - VAGUES': 'تحضير - موجات',
    'AUCUNE VAGUE A PREPARER': 'لا توجد موجة للتحضير',
    '(LANCEZ UNE VAGUE DEPUIS LE': '(أطلق موجة من',
    'POSTE SUPERVISEUR)': 'محطة المشرف)',
    'VAGUES EN COURS :': 'موجات جارية:',
    'N° + [ENT]': 'رقم + [ENT]',
    '({n} MISSIONS)': '({n} مهام)',
    '*** VAGUE TERMINEE ***': '*** انتهت الموجة ***',
    'MISSION {o}  (RESTE {n})': 'مهمة {o}  (متبقٍ {n})',
    'ALLEZ A : {e}': 'اذهب إلى: {e}',
    'ARTICLE : {a}': 'الصنف: {a}',
    'LOT     : {l}': 'الدفعة: {l}',
    'QTE     : {q}': 'الكمية: {q}',
    'CDE     : {c}': 'الطلب: {c}',
    'SCANNEZ L\'EMPLACEMENT': 'امسح الموقع',
    'QTE PRELEVEE ? [ENT]={q}  [F4] ECART': 'الكمية المأخوذة؟ [ENT]={q}  [F4] فرق',
    'MAUVAIS EMPLACEMENT': 'موقع خاطئ',
    'QTE INVALIDE (MAX {m})': 'كمية غير صالحة (الأقصى {m})',
    'ECART DECLARE : -{n}': 'فرق معلن: -{n}',
    'A COMPTER': 'المراد عده',
    '*** COMPTAGE TERMINE ***': '*** انتهى العد ***',
    'EMPLACEMENT : {e}': 'الموقع: {e}',
    'LIGNES      : {n}': 'الأسطر: {n}',
    'ECARTS      : {n}': 'الفروقات: {n}',
    '[ENT] VALIDER  [ESC] ABANDON': '[ENT] تأكيد  [ESC] إلغاء',
    'LIGNE {i}/{n}': 'سطر {i}/{n}',
    'QTE COMPTEE ?': 'الكمية المعدودة؟',
    '(COMPTAGE EN AVEUGLE :': '(عد أعمى:',
    'LE THEORIQUE N\'EST PAS AFFICHE)': 'الكمية النظرية غير معروضة)',
    'EMPLACEMENT VIDE (THEORIQUE)': 'الموقع فارغ (نظريًا)',
    'SAISIE OBLIGATOIRE': 'الإدخال إلزامي',
    'INVENTAIRE VALIDE': 'تم تأكيد الجرد',
    'DEPLACEMENT SUPPORT': 'نقل حامل',
    'SCANNEZ LE SSCC DU SUPPORT': 'امسح SSCC الحامل',
    'DEPUIS  : {e}': 'من: {e}',
    'SCANNEZ LA DESTINATION': 'امسح الوجهة',
    'SUPPORT DEPLACE': 'تم نقل الحامل',
    'CONSULTATION': 'استعلام',
    'SCANNEZ UN EMPLACEMENT': 'امسح موقعًا',
    'OU UN CODE ARTICLE': 'أو رمز صنف',
    '... +{n} LIGNES': '... +{n} أسطر',
    '[ENT] NOUVELLE RECHERCHE': '[ENT] بحث جديد',
    'AUCUN STOCK TROUVE': 'لم يُعثر على مخزون',
    'AUCUNE MISSION {t}': 'لا توجد مهمة {t}',
    '[ENT] ACTUALISER': '[ENT] تحديث',
    '(PALETTE ENTIERE)': '(منصة كاملة)',
    'PRENDRE : {e}': 'خذ من: {e}',
    'RANGER  : {e}': 'ضع في: {e}',
    '(LIBRE CHOIX)': '(اختيار حر)',
    'SCANNEZ DESTINATION [ENT]={d}': 'امسح الوجهة [ENT]={d}',
    'QTE DEPOSEE ? [ENT]={q}': 'الكمية الموضوعة؟ [ENT]={q}',
    'EMPLACEMENT OBLIGATOIRE': 'الموقع إلزامي',
    'MISSION {id} VALIDEE': 'تم تأكيد المهمة {id}',
    'QTE': 'كمية', 'LOT': 'دفعة',
    'Retour': 'رجوع', 'Écart': 'فرق',
    'LM-WMS — Terminal RF': 'LM-WMS — جهاز RF',
  },
};

/* ============================================================
 *  Traduction des éléments statiques + sélecteur de langue
 * ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = LANGUE;
  /* Sens de lecture : l'IHM passe en miroir pour les langues RTL (arabe).
   * Le terminal RF (écran caractère à colonnes fixes, repéré par .ecran)
   * garde sa disposition gauche→droite. */
  if (LANGUES_RTL.includes(LANGUE) && !document.querySelector('.ecran')) {
    document.documentElement.dir = 'rtl';
  }
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
