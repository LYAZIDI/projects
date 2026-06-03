import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Accueil.module.css'

type Mode = 'image' | 'texte'

export default function Accueil() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('image')
  const [dragging, setDragging] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [prix, setPrix] = useState('')
  const [categorie, setCategorie] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImage(file)
  }, [handleImage])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()

    if (mode === 'image' && imageFile) {
      formData.append('image', imageFile)
    } else {
      if (!nom.trim()) return
      formData.append('nom', nom)
      formData.append('description', description)
      if (url) formData.append('url', url)
      if (prix) formData.append('prix', prix)
      if (categorie) formData.append('categorie', categorie)
    }

    // Stocker formData dans sessionStorage (via base64 si image)
    if (mode === 'image' && imageFile) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        sessionStorage.setItem('paf_mode', 'image')
        sessionStorage.setItem('paf_image_b64', ev.target?.result as string)
        sessionStorage.setItem('paf_image_type', imageFile.type)
        sessionStorage.setItem('paf_image_name', imageFile.name)
        navigate('/analyse')
      }
      reader.readAsDataURL(imageFile)
    } else {
      sessionStorage.setItem('paf_mode', 'texte')
      sessionStorage.setItem('paf_nom', nom)
      sessionStorage.setItem('paf_description', description)
      sessionStorage.setItem('paf_url', url)
      sessionStorage.setItem('paf_prix', prix)
      sessionStorage.setItem('paf_categorie', categorie)
      navigate('/analyse')
    }
  }

  const pret = mode === 'image' ? !!imageFile : !!nom.trim()

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span>Product Agent <span className={styles.logoFr}>FR</span></span>
        </div>
        <div className={styles.badge}>9 Agents IA · Marché Français</div>
      </header>

      {/* Hero */}
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.heroTag}>Analyse IA pour le dropshipping français</div>
          <h1 className={styles.heroTitle}>
            Trouvez votre prochain<br />
            <span className={styles.heroAccent}>produit gagnant</span>
          </h1>
          <p className={styles.heroSub}>
            Uploadez une image ou entrez l'URL de n'importe quel produit.<br />
            9 agents IA analysent son potentiel sur le marché français en 60 secondes.
          </p>
        </div>

        {/* Mode Switch */}
        <div className={styles.modeSwitch}>
          <button
            className={`${styles.modeBtn} ${mode === 'image' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('image')}
            type="button"
          >
            📸 Image produit
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'texte' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('texte')}
            type="button"
          >
            ✏️ Décrire le produit
          </button>
        </div>

        {/* Form Card */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit}>
            {mode === 'image' ? (
              <div>
                <div
                  className={`${styles.dropzone} ${dragging ? styles.dropzoneDragging : ''} ${imagePreview ? styles.dropzoneHasImage : ''}`}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className={styles.imagePreviewWrapper}>
                      <img src={imagePreview} alt="Aperçu produit" className={styles.imagePreview} />
                      <div className={styles.imageOverlay}>
                        <span>Cliquer pour changer</span>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.dropContent}>
                      <div className={styles.dropIcon}>🖼️</div>
                      <div className={styles.dropText}>
                        <strong>Glissez une image ici</strong>
                        <span>ou cliquez pour choisir</span>
                      </div>
                      <div className={styles.dropHint}>PNG, JPG, WEBP · Max 10 Mo</div>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
                  />
                </div>
                {imageFile && (
                  <div className={styles.imageName}>
                    ✓ {imageFile.name}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label className={styles.label}>Nom du produit *</label>
                  <input
                    className={styles.input}
                    placeholder="ex: Ceinture chauffante lombaire"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Décrivez le produit, ses fonctionnalités, ses bénéfices..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>URL produit (optionnel)</label>
                    <input
                      className={styles.input}
                      placeholder="https://aliexpress.com/..."
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Prix fournisseur (€)</label>
                    <input
                      className={styles.input}
                      type="number"
                      placeholder="8.50"
                      value={prix}
                      onChange={e => setPrix(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Catégorie (optionnel)</label>
                  <select
                    className={styles.select}
                    value={categorie}
                    onChange={e => setCategorie(e.target.value)}
                  >
                    <option value="">Choisir une catégorie...</option>
                    <option value="Santé & Bien-être">Santé & Bien-être</option>
                    <option value="Beauté & Soins">Beauté & Soins</option>
                    <option value="Maison & Décoration">Maison & Décoration</option>
                    <option value="Sport & Fitness">Sport & Fitness</option>
                    <option value="Tech & Gadgets">Tech & Gadgets</option>
                    <option value="Mode & Accessoires">Mode & Accessoires</option>
                    <option value="Bébé & Enfants">Bébé & Enfants</option>
                    <option value="Animaux">Animaux</option>
                    <option value="Cuisine & Alimentation">Cuisine & Alimentation</option>
                    <option value="Voyage & Outdoor">Voyage & Outdoor</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!pret}
            >
              <span>⚡</span>
              Lancer l'analyse IA
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statNum}>9</div>
            <div className={styles.statLabel}>Agents IA spécialisés</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>60s</div>
            <div className={styles.statLabel}>Analyse complète</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>100%</div>
            <div className={styles.statLabel}>Adapté marché FR</div>
          </div>
        </div>
      </main>
    </div>
  )
}
