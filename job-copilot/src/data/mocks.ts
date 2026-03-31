export interface Job {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  salary: string
  type: string
  matchScore: number
  tags: string[]
  description: string
  logo: string
  source: string
  postedAt: string
  questions: string[]
}

export interface Application {
  id: string
  job: Job
  status: 'to_apply' | 'applied' | 'interview' | 'offer' | 'rejected'
  appliedAt?: string
  nextAction?: string
  coverLetter?: string
}

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Développeur React Senior',
    company: 'Qonto',
    location: 'Paris, France',
    remote: true,
    salary: '65 000 – 80 000 €',
    type: 'CDI',
    matchScore: 94,
    tags: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    logo: 'Q',
    source: 'France Travail',
    postedAt: 'Il y a 2 jours',
    description: 'Nous recherchons un développeur React senior pour rejoindre notre équipe produit. Vous travaillerez sur une application financière utilisée par 500 000+ entreprises européennes.',
    questions: ['Pourquoi souhaitez-vous rejoindre Qonto ?', 'Quelle est votre disponibilité ?', 'Avez-vous une expérience en fintech ?'],
  },
  {
    id: '2',
    title: 'Frontend Engineer',
    company: 'Doctolib',
    location: 'Paris / Remote',
    remote: true,
    salary: '55 000 – 70 000 €',
    type: 'CDI',
    matchScore: 87,
    tags: ['React', 'TypeScript', 'Jest', 'Cypress'],
    logo: 'D',
    source: 'Adzuna',
    postedAt: 'Il y a 1 jour',
    description: 'Rejoignez Doctolib pour améliorer l\'accès à la santé grâce à la technologie. Vous contribuerez à des interfaces utilisées par des millions de patients.',
    questions: ['Décrivez un projet front-end dont vous êtes fier.', 'Comment gérez-vous la performance web ?'],
  },
  {
    id: '3',
    title: 'Ingénieur Full Stack JavaScript',
    company: 'Contentsquare',
    location: 'Paris, France',
    remote: false,
    salary: '60 000 – 75 000 €',
    type: 'CDI',
    matchScore: 81,
    tags: ['Node.js', 'React', 'MongoDB', 'AWS'],
    logo: 'C',
    source: 'Indeed',
    postedAt: 'Il y a 3 jours',
    description: 'Contentsquare cherche un ingénieur full-stack pour développer des fonctionnalités d\'analytics avancées.',
    questions: ['Expérience avec les bases NoSQL ?', 'Disponibilité pour des déplacements ponctuels ?'],
  },
  {
    id: '4',
    title: 'Tech Lead Frontend',
    company: 'BlaBlaCar',
    location: 'Paris, France',
    remote: true,
    salary: '75 000 – 95 000 €',
    type: 'CDI',
    matchScore: 76,
    tags: ['React', 'Vue.js', 'Architecture', 'Mentoring'],
    logo: 'B',
    source: 'LinkedIn',
    postedAt: 'Il y a 5 jours',
    description: 'En tant que Tech Lead, vous guiderez une équipe de 6 développeurs et définirez les standards techniques frontend.',
    questions: ['Avez-vous déjà géré une équipe technique ?', 'Comment définissez-vous les bonnes pratiques ?'],
  },
  {
    id: '5',
    title: 'Développeur React Native',
    company: 'Alan',
    location: 'Paris / Full Remote',
    remote: true,
    salary: '58 000 – 72 000 €',
    type: 'CDI',
    matchScore: 69,
    tags: ['React Native', 'TypeScript', 'iOS', 'Android'],
    logo: 'A',
    source: 'France Travail',
    postedAt: 'Il y a 1 semaine',
    description: 'Alan révolutionne l\'assurance santé. Nous cherchons un dev React Native pour notre app mobile.',
    questions: ['Avez-vous publié des apps sur les stores ?', 'Expérience avec les animations React Native ?'],
  },
]

export const MOCK_APPLICATIONS: Application[] = [
  { id: 'a1', job: MOCK_JOBS[1], status: 'interview', appliedAt: '2026-03-20', nextAction: 'Entretien technique le 30 mars', coverLetter: 'Madame, Monsieur...' },
  { id: 'a2', job: MOCK_JOBS[0], status: 'applied', appliedAt: '2026-03-22', nextAction: 'Relancer le 29 mars' },
  { id: 'a3', job: MOCK_JOBS[2], status: 'applied', appliedAt: '2026-03-23' },
  { id: 'a4', job: MOCK_JOBS[3], status: 'to_apply' },
  { id: 'a5', job: MOCK_JOBS[4], status: 'rejected', appliedAt: '2026-03-15' },
]

export const MOCK_COVER_LETTER = `Madame, Monsieur,

Développeur React senior avec 5 ans d'expérience, je suis particulièrement enthousiaste à l'idée de rejoindre votre équipe. Mon expertise en TypeScript et architecture front-end me permettrait d'apporter une contribution immédiate à vos projets.

Chez mon employeur actuel, j'ai réduit le temps de chargement de 40% en optimisant le bundle et en implémentant le lazy loading, impactant directement l'expérience de 200 000 utilisateurs actifs.

Votre approche centrée sur la qualité produit et l'impact utilisateur correspond exactement à mes valeurs professionnelles. Je serais ravi d'échanger lors d'un entretien.

Cordialement,
Thomas Martin`

export const MOCK_FORM_ANSWERS: Record<string, string> = {
  "Pourquoi souhaitez-vous rejoindre Qonto ?": "Qonto représente l'alliance parfaite entre ambition technologique et impact business concret. Votre approche produit et votre culture de l'excellence correspondent à ma vision du développement logiciel.",
  "Quelle est votre disponibilité ?": "Je suis disponible à partir du 15 avril, avec un préavis d'un mois.",
  "Avez-vous une expérience en fintech ?": "Oui, j'ai 2 ans d'expérience dans le secteur fintech, notamment sur des interfaces de gestion de compte et de paiement.",
}
